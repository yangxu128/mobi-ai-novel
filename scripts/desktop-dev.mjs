/**
 * 桌面版开发环境一键启动：
 *   本地 PostgreSQL（embedded-postgres，.desktop-dev/pgdata，54329）
 *   → prisma db push → next dev（DESKTOP_MODE=1）→ Electron 窗口（dev 直连模式）
 *
 * 用法：npm run desktop:dev
 * 前置：cd desktop && npm install（首次）
 */

import { spawn, fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESKTOP_DIR = path.join(ROOT, "desktop");
const PG_DATA_DIR = path.join(ROOT, ".desktop-dev", "pgdata");
const PG_PORT = 54329;
const NEXT_PORT = 3000;
const DB_NAME = "mobi";
const DB_URL = `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/${DB_NAME}`;

let pg = null;
let nextProc = null;
let electronProc = null;
let shuttingDown = false;

async function waitFor(url, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return;
    } catch {}
    process.stdout.write(`等待${label}就绪...\n`);
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`${label} 启动超时`);
}

async function main() {
  // 1. embedded-postgres（desktop/node_modules，ESM-only → dynamic import）
  const pgModulePath = path.join(DESKTOP_DIR, "node_modules", "embedded-postgres");
  if (!fs.existsSync(pgModulePath)) {
    console.error("缺少 desktop 依赖：请先执行  cd desktop && npm install");
    process.exit(1);
  }
  const { default: EmbeddedPostgres } = await import(
    pathToFileURL(path.join(pgModulePath, "dist", "index.js")).href
  );

  // 2. PG 启动（首次 initdb）
  fs.mkdirSync(path.dirname(PG_DATA_DIR), { recursive: true });
  pg = new EmbeddedPostgres({
    databaseDir: PG_DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PG_PORT,
    persistent: true,
  });
  const firstRun = !fs.existsSync(path.join(PG_DATA_DIR, "PG_VERSION"));
  if (firstRun) {
    console.log("[dev] 首次初始化 PostgreSQL...");
    await pg.initialise();
  }
  await pg.start();
  console.log(`[dev] PostgreSQL 已启动（127.0.0.1:${PG_PORT}）`);
  try {
    await pg.createDatabase(DB_NAME);
  } catch {
    // 已存在
  }

  // 3. schema 同步（主项目 prisma CLI）
  //    Prisma 5.22 db push 不支持 --env-file，且 CLI 自动加载的项目根 .env（Supabase）
  //    会覆盖注入的 DATABASE_URL。方案：生成临时 schema 副本、url 写死本地 PG，
  //    schema 内无 env() 引用即可完全绕过 .env 加载。
  console.log("[dev] prisma db push ...");
  const devDir = path.join(ROOT, ".desktop-dev");
  // 清理旧 --env-file 方案遗留的 .env，避免与项目根 .env 冲突
  const legacyEnv = path.join(devDir, ".env");
  if (fs.existsSync(legacyEnv)) fs.rmSync(legacyEnv);
  const devSchema = path.join(devDir, "schema.prisma");
  const schemaContent = fs.readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8");
  fs.mkdirSync(devDir, { recursive: true });
  fs.writeFileSync(
    devSchema,
    schemaContent
      .replace(/env\("DATABASE_URL"\)/g, `"${DB_URL}"`)
      .replace(/env\("DIRECT_URL"\)/g, `"${DB_URL}"`)
  );
  await new Promise((resolve, reject) => {
    const child = fork(path.join(ROOT, "node_modules", "prisma", "build", "index.js"), [
      "db",
      "push",
      "--skip-generate",
      "--accept-data-loss",
      `--schema=${devSchema}`,
    ], { env: { ...process.env, DATABASE_URL: DB_URL, DIRECT_URL: DB_URL }, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("db push 失败"))));
  });

  // 4. next dev（桌面模式 env）
  console.log(`[dev] 启动 next dev（:${NEXT_PORT}，DESKTOP_MODE=1）...`);
  nextProc = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(NEXT_PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      DESKTOP_MODE: "1",
      NEXT_PUBLIC_DESKTOP_MODE: "1",
      DATABASE_URL: DB_URL,
      DIRECT_URL: DB_URL,
      NEXT_PUBLIC_PLATFORM_URL: process.env.NEXT_PUBLIC_PLATFORM_URL || `http://localhost:${NEXT_PORT}`,
    },
    stdio: "inherit",
    shell: false,
  });
  nextProc.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`[dev] next dev 异常退出（code=${code}），结束开发环境`);
      shutdown(code ?? 1);
    }
  });
  await waitFor(`http://localhost:${NEXT_PORT}`, 120_000, "next dev");

  // 5. Electron（dev 直连，跳过主进程的 PG/server 逻辑）
  console.log("[dev] 启动 Electron ...");
  const electronBin = path.join(DESKTOP_DIR, "node_modules", ".bin", "electron.cmd");
  if (!fs.existsSync(electronBin)) {
    console.error("缺少 electron：请先执行  cd desktop && npm install");
    process.exit(1);
  }
  electronProc = spawn(electronBin, ["."], {
    cwd: DESKTOP_DIR,
    env: {
      ...process.env,
      ELECTRON_START_URL: `http://localhost:${NEXT_PORT}`,
    },
    stdio: "inherit",
    shell: true,
  });
  electronProc.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`[dev] Electron 退出（${code}），结束开发环境`);
      shutdown(code ?? 0);
    }
  });
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    electronProc?.kill();
  } catch {}
  try {
    nextProc?.kill();
  } catch {}
  try {
    await pg?.stop();
  } catch {}
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch((err) => {
  console.error("[dev] 启动失败:", err);
  shutdown(1);
});
