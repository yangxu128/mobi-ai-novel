/**
 * 桌面版打包：next standalone 构建 → 组装 desktop/app → electron-builder --win
 *
 * 用法：npm run desktop:build
 * 可选：NEXT_PUBLIC_PLATFORM_URL=https://your-site.pages.dev npm run desktop:build
 *   （默认 http://localhost:3000，用于本地联调；正式包务必传入线上平台地址）
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESKTOP_DIR = path.join(ROOT, "desktop");
const STANDALONE_DIR = path.join(ROOT, ".next", "standalone");
// 注意：目录名不能用 app——electron-builder 检测到 app/package.json 会将其
// 误判为 two-package.json 结构的应用目录（入口找 app/index.js 而非 main.cjs）
const APP_DIR = path.join(DESKTOP_DIR, "webapp");
const PLATFORM_URL = (process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3000").replace(/\/+$/, "");

function fail(msg) {
  console.error(`[build] 失败: ${msg}`);
  process.exit(1);
}

function copyDir(src, dest, { merge = false } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!merge && fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
}

async function main() {
  console.log(`[build] 平台地址: ${PLATFORM_URL}`);

  // 1. Next standalone 构建（桌面模式）
  console.log("[build] next build（standalone + DESKTOP_MODE）...");
  // shell: true：新版 Node 禁止无 shell 直接执行 .cmd/.bat（CVE-2024-27180）
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const r = spawnSync(
    npxCmd,
    ["next", "build"],
    {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        NEXT_OUTPUT: "standalone",
        NEXT_PUBLIC_DESKTOP_MODE: "1",
        NEXT_PUBLIC_PLATFORM_URL: PLATFORM_URL,
        // 打包不需要真实 DATABASE_URL（build 期无 DB 访问的页面），
        // 但 prisma client 生成已由 postinstall 完成
      },
    }
  );
  if (r.status !== 0) fail("next build 失败");
  if (!fs.existsSync(STANDALONE_DIR)) fail("未找到 .next/standalone（检查 NEXT_OUTPUT 是否生效）");

  // 2. 组装 desktop/app
  console.log("[build] 组装 desktop/app ...");
  fs.rmSync(APP_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_DIR, { recursive: true });

  // standalone 本体（server.js + node_modules + .next 服务端产物）
  copyDir(STANDALONE_DIR, APP_DIR, { merge: true });
  // 静态资源（standalone 不含 .next/static 与 public，需手动合并）
  copyDir(path.join(ROOT, ".next", "static"), path.join(APP_DIR, ".next", "static"), { merge: true });
  if (fs.existsSync(path.join(ROOT, "public"))) {
    copyDir(path.join(ROOT, "public"), path.join(APP_DIR, "public"), { merge: true });
  }
  // prisma schema（主进程每次启动 db push 用）
  fs.mkdirSync(path.join(APP_DIR, "prisma"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "prisma", "schema.prisma"), path.join(APP_DIR, "prisma", "schema.prisma"));

  // 3. Prisma 运行时显式兜底（serverExternalPackages 不会进 standalone tracing）
  console.log("[build] 复制 prisma/pg 运行时 ...");
  const appNodeModules = path.join(APP_DIR, "node_modules");
  for (const pkg of [
    [".prisma", ".prisma"],
    ["@prisma", "@prisma/client"],
    ["@prisma", "@prisma/adapter-pg"],
    ["@prisma", "@prisma/engines"],
    ["pg", "pg"],
    ["bcryptjs", "bcryptjs"],
  ]) {
    const src = path.join(ROOT, "node_modules", ...pkg);
    if (!fs.existsSync(src)) {
      console.warn(`[build] 警告: 主项目缺少 ${pkg.join("/")}`);
      continue;
    }
    const dest = path.join(appNodeModules, ...pkg);
    if (fs.existsSync(dest)) continue; // tracing 已含则跳过
    copyDir(src, dest, { merge: true });
  }

  // 4. 图标
  fs.mkdirSync(path.join(DESKTOP_DIR, "build"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "src", "app", "icon.png"), path.join(DESKTOP_DIR, "build", "icon.png"));

  // 5. desktop 依赖检查
  if (!fs.existsSync(path.join(DESKTOP_DIR, "node_modules", "embedded-postgres"))) {
    fail("缺少 desktop 依赖：请先执行  cd desktop && npm install");
  }

  // 6. electron-builder（files 只含 main/preload，自动追加 production deps；app/ 走 extraResources）
  console.log("[build] electron-builder --win ...");
  const eb = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["electron-builder", "--win"],
    { cwd: DESKTOP_DIR, stdio: "inherit", shell: true }
  );
  if (eb.status !== 0) fail("electron-builder 失败");

  console.log(`[build] 完成：${path.join(DESKTOP_DIR, "dist")}`);
}

main().catch(fail);
