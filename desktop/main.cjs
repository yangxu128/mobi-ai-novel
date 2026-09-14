/**
 * 墨笔桌面版 Electron 主进程。
 *
 * 职责：
 * - 单实例锁
 * - 数据目录（%APPDATA%/mobi-desktop）：config.json / pgdata/ / logs/
 * - embedded-postgres 生命周期：首次 initdb → start（动态端口，持久化）
 * - 每次启动 prisma db push（幂等同步 schema）
 * - fork Next standalone server（ELECTRON_RUN_AS_NODE=1，注入 env）
 * - 健康轮询通过后开窗；server 崩溃自动重启（上限 3 次）
 * - 外链 shell.openExternal；退出时停 PG + 杀 server
 * - dev 模式（ELECTRON_START_URL）：跳过 PG/server，直连 dev URL
 */

const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const crypto = require("crypto");
const { fork } = require("child_process");

const IS_DEV = !!process.env.ELECTRON_START_URL;
const APP_DATA_DIR = path.join(app.getPath("appData"), "mobi-desktop");
const PG_DATA_DIR = path.join(APP_DATA_DIR, "pgdata");
const LOGS_DIR = path.join(APP_DATA_DIR, "logs");
const CONFIG_PATH = path.join(APP_DATA_DIR, "config.json");
const DB_NAME = "mobi";
const PG_DEFAULT_PORT = 54329;

/** 运行时资源根：dev = desktop/ 本目录；打包后 = resources/ */
const RES_ROOT = IS_DEV ? __dirname : process.resourcesPath;
const NEXT_APP_DIR = path.join(RES_ROOT, "app");
const PRISMA_CLI = path.join(RES_ROOT, "node_modules", "prisma", "build", "index.js");
const SCHEMA_PATH = path.join(NEXT_APP_DIR, "prisma", "schema.prisma");

let nextServer = null;
let pg = null;
let mainWindow = null;
let quitting = false;
let serverRestartCount = 0;
let lastServerRestartAt = 0;
let nextPort = 0;
let startPath = "/";

/* ------------------------------ 基础工具 ------------------------------ */

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOGS_DIR, "main.log"), line);
  } catch {
    // 日志失败不阻断
  }
  if (IS_DEV) console.log(msg);
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/** 探测 127.0.0.1 空闲端口（从 start 开始递增尝试） */
function probePort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.once("error", () => {
        if (port - start > 200) return reject(new Error("无可用端口"));
        tryPort(port + 1);
      });
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(start);
  });
}

/* ------------------------------ PostgreSQL ------------------------------ */

async function startPostgres(config) {
  // embedded-postgres 是 ESM-only 包，CJS 需 dynamic import（Electron 28+ 支持）
  const mod = await import(
    require("node:url").pathToFileURL(
      path.join(RES_ROOT, "node_modules", "embedded-postgres", "dist", "index.js")
    ).href
  );
  const EmbeddedPostgres = mod.default;

  pg = new EmbeddedPostgres({
    databaseDir: PG_DATA_DIR,
    user: "postgres",
    password: config.pgPassword,
    port: config.pgPort,
    persistent: true,
  });

  const firstRun = !fs.existsSync(path.join(PG_DATA_DIR, "PG_VERSION"));
  if (firstRun) {
    log(`首次初始化 PostgreSQL（${PG_DATA_DIR}）`);
    await pg.initialise();
  }
  await pg.start();
  log(`PostgreSQL 已启动，端口 ${config.pgPort}`);

  try {
    await pg.createDatabase(DB_NAME);
  } catch {
    // 数据库已存在
  }
}

/** prisma db push：fork prisma CLI，幂等同步 schema。
 *  Prisma 5.22 db push 不支持 --env-file，且 CLI 自动加载的 .env（如项目根的
 *  Supabase 连接串）会覆盖注入的 env。方案：生成临时 schema 副本、url 写死本地
 *  PG，schema 内无 env() 引用即可完全绕过 .env 加载。 */
function dbPush(config) {
  return new Promise((resolve, reject) => {
    const url = `postgresql://postgres:${config.pgPassword}@127.0.0.1:${config.pgPort}/${DB_NAME}`;
    const tmpSchema = path.join(APP_DATA_DIR, "schema.prisma");
    let schemaContent;
    try {
      schemaContent = fs.readFileSync(SCHEMA_PATH, "utf8");
    } catch (err) {
      return reject(err);
    }
    try {
      fs.mkdirSync(APP_DATA_DIR, { recursive: true });
      fs.writeFileSync(
        tmpSchema,
        schemaContent
          .replace(/env\("DATABASE_URL"\)/g, `"${url}"`)
          .replace(/env\("DIRECT_URL"\)/g, `"${url}"`)
      );
    } catch (err) {
      return reject(err);
    }
    log("prisma db push 同步 schema...");
    const child = fork(
      PRISMA_CLI,
      [
        "db",
        "push",
        "--skip-generate",
        "--accept-data-loss",
        `--schema=${tmpSchema}`,
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: url,
          DIRECT_URL: url,
          ELECTRON_RUN_AS_NODE: "1",
        },
        stdio: "pipe",
      }
    );
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    child.on("exit", (code) => {
      if (code === 0) {
        log("schema 同步完成");
        resolve();
      } else {
        log("db push 失败: " + out.slice(-500));
        reject(new Error("数据库初始化失败"));
      }
    });
    child.on("error", reject);
  });
}

/* ------------------------------ Next server ------------------------------ */

function startNextServer(config) {
  const url = `postgresql://postgres:${config.pgPassword}@127.0.0.1:${config.pgPort}/${DB_NAME}`;
  const env = {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: url,
    AUTH_SECRET: config.authSecret,
    AUTH_TRUST_HOST: "true",
    HOSTNAME: "127.0.0.1",
    PORT: String(config.nextPort),
    DESKTOP_MODE: "1",
    // 抑制 Next 遥测
    NEXT_TELEMETRY_DISABLED: "1",
  };
  delete env.ELECTRON_START_URL;

  nextServer = fork(path.join(NEXT_APP_DIR, "server.js"), [], {
    env,
    cwd: NEXT_APP_DIR,
    stdio: "pipe",
  });

  nextServer.stdout.on("data", (d) => log("[next] " + d.toString().trim()));
  nextServer.stderr.on("data", (d) => log("[next:err] " + d.toString().trim()));

  nextServer.on("exit", (code) => {
    log(`Next server 退出（code=${code}）`);
    if (quitting) return;
    // 崩溃自动重启：60s 内最多 3 次
    const now = Date.now();
    if (now - lastServerRestartAt > 60_000) serverRestartCount = 0;
    lastServerRestartAt = now;
    serverRestartCount++;
    if (serverRestartCount > 3) {
      dialog.showErrorBox(
        "服务启动失败",
        "应用服务多次异常退出，请重新启动应用；若持续失败请查看日志目录中的 main.log"
      );
      app.quit();
      return;
    }
    log(`重启 Next server（第 ${serverRestartCount} 次）...`);
    setTimeout(() => {
      startNextServer(config);
      waitForHealth(`http://127.0.0.1:${config.nextPort}`, 60_000)
        .then(() => mainWindow?.webContents.reload())
        .catch(() => {});
    }, 1500);
  });
}

/** 轮询健康检查（Next /api/health 无需登录） */
async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (resp.ok) return;
    } catch {
      // 未就绪，继续轮询
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("健康检查超时");
}

/* ------------------------------ 窗口 ------------------------------ */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#FAFAF8",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // 外链一律走系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const target = IS_DEV
    ? process.env.ELECTRON_START_URL
    : `http://127.0.0.1:${nextPort}${startPath}`;
  log(`加载窗口: ${target}`);
  mainWindow.loadURL(target);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/* ------------------------------ 启动流程 ------------------------------ */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      if (IS_DEV) {
        // dev 模式：next dev 由外部脚本启动，这里只开窗
        createWindow();
        return;
      }

      // 数据目录 + 配置（密码/密钥首启生成，持久化）
      fs.mkdirSync(APP_DATA_DIR, { recursive: true });
      const config = readConfig();
      let configDirty = false;
      if (!config.pgPassword) {
        config.pgPassword = crypto.randomBytes(16).toString("hex");
        configDirty = true;
      }
      if (!config.authSecret) {
        config.authSecret = crypto.randomBytes(32).toString("hex");
        configDirty = true;
      }
      // 端口：优先沿用持久化端口，被占用则重新探测
      if (!config.pgPort) {
        config.pgPort = await probePort(PG_DEFAULT_PORT);
        configDirty = true;
      } else {
        try {
          const probed = await probePort(config.pgPort);
          if (probed !== config.pgPort) {
            config.pgPort = probed;
            configDirty = true;
          }
        } catch {
          config.pgPort = await probePort(PG_DEFAULT_PORT + 100);
          configDirty = true;
        }
      }
      if (!config.nextPort) {
        config.nextPort = await probePort(3100);
        configDirty = true;
      }
      if (configDirty) writeConfig(config);

      // 首启引导：未初始化过 → 登录后直达 AI 设置页
      const firstRun = !config.initialized;
      startPath = firstRun ? "/login?callbackUrl=/settings" : "/";

      await startPostgres(config);
      await dbPush(config);
      startNextServer(config);
      await waitForHealth(`http://127.0.0.1:${config.nextPort}`, 120_000);
      nextPort = config.nextPort;

      if (firstRun) {
        config.initialized = true;
        writeConfig(config);
      }

      createWindow();
    } catch (err) {
      log("启动失败: " + (err?.stack || err?.message || err));
      dialog.showErrorBox(
        "启动失败",
        `应用初始化失败：${err?.message || err}\n\n请重新启动；若持续失败，可删除 ${APP_DATA_DIR} 后重试（会清空本地数据）`
      );
      app.quit();
    }
  });

  app.on("window-all-closed", () => {
    // Windows：关窗即退出
    app.quit();
  });

  app.on("before-quit", () => {
    quitting = true;
  });

  app.on("will-quit", async (event) => {
    if (quitting) {
      event.preventDefault();
      quitting = false;
      try {
        if (nextServer && !nextServer.killed) {
          nextServer.kill();
        }
      } catch {}
      try {
        if (pg) await pg.stop();
      } catch {}
      app.exit(0);
    }
  });

  process.on("uncaughtException", (err) => {
    log("uncaughtException: " + (err?.stack || err?.message));
  });
}
