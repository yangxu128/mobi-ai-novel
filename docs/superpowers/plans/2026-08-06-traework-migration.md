# TraeWork 设计规范迁移 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `dl_builtin_trae_work` 设计系统的 token 和 `.ds-*` 组件类集成到墨笔 AI 写作平台，全站替换 shadcn 样式层为 TraeWork 规范；保留 Radix UI 状态机和 lucide-react 图标；彻底移除 dark mode；主品牌色覆盖为深灰 `#171717`。

**Architecture:** 引入 `src/styles/tokens.css`（TraeWork 完整 token + brand 覆盖）和 `src/styles/components.css`（`.ds-*` 组件类）；重写 `src/app/globals.css` 引入二者并删除 dark mode；用 wrapper 模式重写 22 个 shadcn 组件保留 API 签名；分 8 阶段推进，每阶段独立可验证。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 3, shadcn/ui (Radix UI + cva), lucide-react, Prisma, TraeWork (CSS variables + `.ds-*` classes)

**Spec:** [docs/superpowers/specs/2026-08-06-traework-migration-design.md](file:///d:/mycode/AIxiaoshuo/docs/superpowers/specs/2026-08-06-traework-migration-design.md)

---

## 文件结构总览

### 新建文件
| 路径 | 职责 |
|------|------|
| `src/styles/tokens.css` | TraeWork 完整 CSS 变量 + brand 覆盖为深灰 |
| `src/styles/components.css` | TraeWork `.ds-*` 组件类（从 dl_builtin_trae_work/components.css 复制） |
| `src/styles/scaffold.css` | reset、typography utilities（从 dl_builtin_trae_work/scaffold.css 选择性复制） |

### 全局修改
| 路径 | 职责 |
|------|------|
| `src/app/globals.css` | 引入 3 个新 stylesheet；删除 `.dark{}` 块、`dark:` 引用、`prefers-color-scheme: dark`；保留 page 动画、scrollbar、TipTap prose |
| `tailwind.config.ts` | 删除 `darkMode: "class"`；扩展 colors/borderRadius/spacing 别名映射 TraeWork token |
| `package.json` | 无需新增依赖；保留 @radix-ui/*、lucide-react、cva、tailwindcss |

### 组件重写（22 个 shadcn）
按顺序：`button` → `card` → `input` → `textarea` → `label` → `badge` → `avatar` → `separator` → `skeleton` → `toast` → `tooltip` → `alert-dialog` → `dialog` → `popover` → `dropdown-menu` → `scroll-area` → `tabs` → `accordion` → `select` → `switch` → `progress`

### 业务组件
`app-header`、`project-mode-switcher`、`project-workspace`、`projects-client`、`workbench-client`、`pipeline-flow`、`pipeline/step1-6`、`chat/chat-cocreate-client`、`editor/tiptap-editor`、`style/style-picker`、`model/model-picker`、`admin/admin-users-client`

### 页面
`/`、`/login`、`/register`、`/pricing`、`/projects`、`/project/[id]`、`/admin`、`/admin/users`、`/admin/projects`、`/admin/logs`

---

## 实施阶段

每个任务都包含：文件路径、代码片段、命令、commit 步骤。任务间频繁 commit。

---

### Task 1: 引入 TraeWork token stylesheet

**Files:**
- Create: `src/styles/tokens.css`
- Reference: `dl_builtin_trae_work/colors_and_type.css`

- [ ] **Step 1: 创建 `src/styles/` 目录**

```bash
mkdir -p src/styles
```

- [ ] **Step 2: 复制 TraeWork 完整 token 到 `src/styles/tokens.css`**

```bash
cp dl_builtin_trae_work/colors_and_type.css src/styles/tokens.css
```

- [ ] **Step 3: 在 `src/styles/tokens.css` 末尾追加 brand 覆盖**

在 `src/styles/tokens.css` 文件末尾追加（**保留**原 `:root` 中所有 token，仅覆盖 brand 相关）：

```css
/* ============================================================
 * 用户偏好覆盖：brand 色改为深灰
 * 原因：TraeWork 默认 --bg-brand: #4B3FE3（紫色），
 *       与"深灰主按钮"的设计偏好冲突。覆盖为中性深色。
 * ============================================================ */
:root {
  --bg-brand: #171717;
  --bg-brand-hover: #404040;
  --bg-brand-active: #0A0A0A;
  --bg-brand-disabled: rgba(23, 23, 23, 0.20);
  --bg-brand-popup: rgba(115, 115, 115, 0.20);

  /* brand 系列：text、icon、border 也用深灰 */
  --text-brand: #171717;
  --text-brand-hover: #404040;
  --icon-brand: #171717;
  --icon-brand-hover: #404040;
  --border-brand: #171717;

  /* --bg-invert 系列原本就是深灰，保留原值 */
}
```

- [ ] **Step 4: 验证 token 加载**

```bash
# 简单检查文件大小
wc -l src/styles/tokens.css
# 期望：≥ 400 行（TraeWork 原文件约 432 行 + 追加约 25 行）
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(style): 引入 TraeWork 设计 token，覆盖 brand 为深灰"
```

---

### Task 2: 引入 TraeWork 组件类 stylesheet

**Files:**
- Create: `src/styles/components.css`
- Reference: `dl_builtin_trae_work/components.css`

- [ ] **Step 1: 复制 components.css**

```bash
cp dl_builtin_trae_work/components.css src/styles/components.css
```

- [ ] **Step 2: 修复 icon 资源相对路径**

`components.css` 中通过 `var(--icon-url)` 引用 `assets/icons/*.svg`。当 `components.css` 在 `src/styles/` 目录被加载时，相对路径要指向项目根。批量修改：

```bash
# 在 PowerShell 中使用 encoding utf8
$file = "src/styles/components.css"
(Get-Content $file -Encoding UTF8) `
  -replace 'assets/icons/', '/assets/icons/' `
  | Set-Content $file -Encoding UTF8
```

**说明**：`assets/icons/` 在项目根（`public/assets/icons/` 或复制到 `public/`）需要 Next.js 静态资源服务。

- [ ] **Step 3: 复制 TraeWork icon 到 Next.js public 目录**

```bash
# 复制 icon 资源到 Next.js 静态资源目录
mkdir -p public/assets/icons
cp dl_builtin_trae_work/assets/icons/*.svg public/assets/icons/
```

- [ ] **Step 4: 验证 components.css 加载**

```bash
wc -l src/styles/components.css
# 期望：约 1100 行（TraeWork 原文件）
ls public/assets/icons/ | wc -l
# 期望：≥ 400 个 SVG
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/components.css public/assets/icons/
git commit -m "feat(style): 引入 TraeWork .ds-* 组件类与 icon 资源"
```

---

### Task 3: 引入 TraeWork scaffold（reset + typography utilities）

**Files:**
- Create: `src/styles/scaffold.css`
- Reference: `dl_builtin_trae_work/scaffold.css`

- [ ] **Step 1: 选择性复制 scaffold.css**

```bash
# scaffold.css 包含 reset、typography、layout helpers、preview chrome
# 我们只需要 reset + typography utilities，preview chrome 不需要
cp dl_builtin_trae_work/scaffold.css src/styles/scaffold.css
```

- [ ] **Step 2: 移除 preview 专用样式（可选）**

如果 `scaffold.css` 包含 `.preview-`、`[data-preview]`、`.chrome-` 等仅 preview 使用的类，可以删除（不会影响项目功能）。本任务不强制。

- [ ] **Step 3: 验证**

```bash
wc -l src/styles/scaffold.css
# 期望：约 200-500 行
```

- [ ] **Step 4: Commit**

```bash
git add src/styles/scaffold.css
git commit -m "feat(style): 引入 TraeWork scaffold (reset + typography)"
```

---

### Task 4: 重写 globals.css 引入新 token，移除 dark mode

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 备份当前 globals.css**

```bash
cp src/app/globals.css src/app/globals.css.bak
```

- [ ] **Step 2: 完全重写 globals.css**

将 `src/app/globals.css` 内容替换为：

```css
/* TraeWork 设计系统入口 */
/* 顺序很重要：tokens → scaffold → components */
@import "../styles/tokens.css";
@import "../styles/scaffold.css";
@import "../styles/components.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============ 保留的页面级样式 ============ */

/* 页面切换内容淡入动画（避免合成层掉帧） */
@keyframes page-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.page-content {
  animation: page-fade-in 0.12s ease-out;
  scrollbar-gutter: stable;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border-neutral-l2);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--border-neutral-l3);
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* TipTap prose 覆盖（保留原样式，仅去除 dark 变体） */
.prose-editor {
  font-family: var(--font-family-default);
  font-size: var(--body-base-font-size);
  line-height: var(--body-base-line-height);
  color: var(--text-default);
}
.prose-editor h1 {
  font-size: var(--heading-xl-font-size);
  font-weight: var(--heading-xl-font-weight);
  line-height: var(--heading-xl-line-height);
  margin: 1.5em 0 0.5em;
}
.prose-editor h2 {
  font-size: var(--heading-lg-font-size);
  font-weight: var(--heading-lg-font-weight);
  line-height: var(--heading-lg-line-height);
  margin: 1.25em 0 0.5em;
}
.prose-editor h3 {
  font-size: var(--heading-md-font-size);
  font-weight: var(--heading-md-font-weight);
  line-height: var(--heading-md-line-height);
  margin: 1em 0 0.5em;
}
.prose-editor p {
  margin: 0.75em 0;
}
.prose-editor blockquote {
  border-left: 3px solid var(--border-neutral-l2);
  padding-left: var(--spacer-16);
  color: var(--text-secondary);
  font-style: italic;
}
.prose-editor code {
  font-family: var(--code-editor-font-family);
  font-size: var(--code-editor-font-size);
  background: var(--bg-overlay-l1);
  padding: 2px 6px;
  border-radius: var(--radius-4);
}
.prose-editor pre {
  font-family: var(--code-editor-font-family);
  background: var(--bg-overlay-l1);
  padding: var(--spacer-12) var(--spacer-16);
  border-radius: var(--radius-8);
  overflow-x: auto;
}
.prose-editor ul,
.prose-editor ol {
  padding-left: var(--spacer-24);
  margin: 0.75em 0;
}
.prose-editor li {
  margin: 0.25em 0;
}
.prose-editor a {
  color: var(--text-brand);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* stream cursor 动画（保留） */
.stream-cursor::after {
  content: "▊";
  animation: cursor-blink 1s steps(2) infinite;
  color: var(--text-tertiary);
}
@keyframes cursor-blink {
  50% { opacity: 0; }
}
```

- [ ] **Step 3: 验证 build**

```bash
& "D:\mycode\nodejs\npx.cmd" next build 2>&1 | Select-String -Pattern "error|warn" | Select-Object -First 20
# 期望：无 token 解析错误；可能有若干 image 404（components.css 中 icon 路径相关，先忽略）
```

- [ ] **Step 4: 启动 dev 模式验证**

```bash
& "D:\mycode\nodejs\npx.cmd" next dev
```

打开 `http://localhost:3000`，按 F12 检查：所有 CSS 变量已解析为有效值（如 `--bg-base-secondary: #F5F5F5`），页面没有明显错乱（如果 shadcn 组件尚未改造，可能样式混乱，这是预期的，下一阶段解决）。

- [ ] **Step 5: 删除备份**

```bash
rm src/app/globals.css.bak
```

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(style): 重写 globals.css 引入 TraeWork token，移除 dark mode"
```

---

### Task 5: 更新 tailwind.config.ts 移除 dark mode，扩展 token 别名

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: 读取当前配置**

```bash
cat tailwind.config.ts
```

- [ ] **Step 2: 重写 tailwind.config.ts**

完整替换为：

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  // 彻底移除 dark mode（TraeWork 规范要求 light-only）
  darkMode: undefined,
  content: [
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      // ===== 颜色：TraeWork token 别名 =====
      // 主样式仍用 .ds-* 类；此处仅为 Tailwind 工具类便利
      colors: {
        // 语义别名（直接对应 CSS 变量）
        "text-default": "var(--text-default)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-disabled": "var(--text-disabled)",
        "text-onbrand": "var(--text-onbrand)",
        "text-brand": "var(--text-brand)",

        "icon-default": "var(--icon-default)",
        "icon-secondary": "var(--icon-secondary)",
        "icon-tertiary": "var(--icon-tertiary)",
        "icon-onbrand": "var(--icon-onbrand)",
        "icon-brand": "var(--icon-brand)",

        "border-neutral-l1": "var(--border-neutral-l1)",
        "border-neutral-l2": "var(--border-neutral-l2)",
        "border-neutral-l3": "var(--border-neutral-l3)",
        "border-contrast": "var(--border-contrast)",
        "border-brand": "var(--border-brand)",

        "bg-base-default": "var(--bg-base-default)",
        "bg-base-secondary": "var(--bg-base-secondary)",
        "bg-base-tertiary": "var(--bg-base-tertiary)",
        "bg-overlay-l1": "var(--bg-overlay-l1)",
        "bg-overlay-l2": "var(--bg-overlay-l2)",
        "bg-overlay-l3": "var(--bg-overlay-l3)",
        "bg-overlay-l4": "var(--bg-overlay-l4)",
        "bg-brand": "var(--bg-brand)",
        "bg-brand-hover": "var(--bg-brand-hover)",
        "bg-brand-active": "var(--bg-brand-active)",
        "bg-invert": "var(--bg-invert)",
        "bg-invert-hover": "var(--bg-invert-hover)",

        "status-success": "var(--status-success-default)",
        "status-warning": "var(--status-warning-default)",
        "status-error": "var(--status-error-default)",
        "status-info": "var(--status-primary-default)",
      },

      // ===== 圆角：TraeWork 语义别名 =====
      borderRadius: {
        "ds-xs": "var(--radius-2)",
        "ds-sm": "var(--radius-4)",
        "ds-md": "var(--radius-6)",
        "ds-lg": "var(--radius-8)",
        "ds-xl": "var(--radius-10)",
        "ds-2xl": "var(--radius-12)",
        "ds-3xl": "var(--radius-16)",
        "ds-4xl": "var(--radius-20)",
        "ds-5xl": "var(--radius-24)",
        "ds-full": "var(--radius-full)",
      },

      // ===== 间距：TraeWork spacer 别名 =====
      spacing: {
        "ds-2": "var(--spacer-2)",
        "ds-4": "var(--spacer-4)",
        "ds-6": "var(--spacer-6)",
        "ds-8": "var(--spacer-8)",
        "ds-10": "var(--spacer-10)",
        "ds-12": "var(--spacer-12)",
        "ds-16": "var(--spacer-16)",
        "ds-20": "var(--spacer-20)",
        "ds-24": "var(--spacer-24)",
        "ds-32": "var(--spacer-32)",
        "ds-40": "var(--spacer-40)",
        "ds-48": "var(--spacer-48)",
        "ds-64": "var(--spacer-64)",
      },

      // ===== 字体：TraeWork 字体族 =====
      fontFamily: {
        "ds-default": "var(--font-family-default)",
        "ds-heading": "var(--font-family-heading)",
        "ds-metric": "var(--font-family-metric)",
        "ds-mono": "var(--font-family-mono)",
      },

      // ===== 字号：TraeWork 完整 type scale =====
      fontSize: {
        "ds-xs": ["var(--body-xs-font-size)", { lineHeight: "var(--body-xs-line-height)" }],
        "ds-sm": ["var(--body-sm-font-size)", { lineHeight: "var(--body-sm-line-height)" }],
        "ds-md": ["var(--body-md-font-size)", { lineHeight: "var(--body-md-line-height)" }],
        "ds-base": ["var(--body-base-font-size)", { lineHeight: "var(--body-base-line-height)" }],
        "ds-lg": ["var(--body-lg-font-size)", { lineHeight: "var(--body-lg-line-height)" }],
        "ds-heading-3xs": ["var(--heading-3xs-font-size)", { lineHeight: "var(--heading-3xs-line-height)", fontWeight: "var(--heading-3xs-font-weight)" }],
        "ds-heading-2xs": ["var(--heading-2xs-font-size)", { lineHeight: "var(--heading-2xs-line-height)", fontWeight: "var(--heading-2xs-font-weight)" }],
        "ds-heading-xs": ["var(--heading-xs-font-size)", { lineHeight: "var(--heading-xs-line-height)", fontWeight: "var(--heading-xs-font-weight)" }],
        "ds-heading-sm": ["var(--heading-sm-font-size)", { lineHeight: "var(--heading-sm-line-height)", fontWeight: "var(--heading-sm-font-weight)" }],
        "ds-heading-md": ["var(--heading-md-font-size)", { lineHeight: "var(--heading-md-line-height)", fontWeight: "var(--heading-md-font-weight)" }],
        "ds-heading-lg": ["var(--heading-lg-font-size)", { lineHeight: "var(--heading-lg-line-height)", fontWeight: "var(--heading-lg-font-weight)" }],
        "ds-heading-xl": ["var(--heading-xl-font-size)", { lineHeight: "var(--heading-xl-line-height)", fontWeight: "var(--heading-xl-font-weight)" }],
        "ds-heading-2xl": ["var(--heading-2xl-font-size)", { lineHeight: "var(--heading-2xl-line-height)", fontWeight: "var(--heading-2xl-font-weight)" }],
        "ds-heading-3xl": ["var(--heading-3xl-font-size)", { lineHeight: "var(--heading-3xl-line-height)", fontWeight: "var(--heading-3xl-font-weight)" }],
        "ds-heading-display": ["var(--heading-display-font-size)", { lineHeight: "var(--heading-display-line-height)", fontWeight: "var(--heading-display-font-weight)" }],
      },

      // ===== 过渡：TraeWork motion 规范 =====
      transitionDuration: {
        "ds-hover": "120ms",
        "ds-state": "200ms",
        "ds-layout": "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: 验证类型**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 20
# 期望：0 错误
```

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(style): tailwind 移除 dark mode，扩展 TraeWork token 别名"
```

---

### Task 6: 重写 button.tsx 为 TraeWork `.ds-btn`

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: 读取当前实现**

```bash
cat src/components/ui/button.tsx
```

- [ ] **Step 2: 完整替换 button.tsx**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * TraeWork 按钮组件。
 *
 * 内部使用 `.ds-btn` + `.ds-btn--*` 变体类，cva 仅做 API 透传。
 * 保留 shadcn API（variant/size/asChild）以便业务代码 0 修改。
 *
 * 颜色说明：--bg-brand 已在 tokens.css 中覆盖为深灰 #171717，
 * 故 primary 按钮实际显示为黑底白字。
 */
const buttonVariants = cva(
  // 基础类：所有按钮共享
  "ds-btn",
  {
    variants: {
      variant: {
        default: "ds-btn--primary",
        primary: "ds-btn--primary",
        secondary: "ds-btn--secondary",
        outline: "ds-btn--secondary",
        ghost: "ds-btn--tertiary",
        tertiary: "ds-btn--tertiary",
        destructive: "ds-btn--danger",
        danger: "ds-btn--danger",
        "danger-strong": "ds-btn--danger-strong",
        "danger-subtle": "ds-btn--danger-subtle",
        link: "ds-btn--link",
        brand: "ds-btn--brand",
      },
      size: {
        sm: "ds-btn--sm",
        md: "ds-btn--md",
        lg: "ds-btn--lg",
        default: "ds-btn--md",
        icon: "ds-btn--icon",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 3: 验证类型**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
# 期望：0 错误
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(ui): 重写 button 为 TraeWork .ds-btn--*"
```

---

### Task 7: 重写 card.tsx 为 TraeWork `.ds-card`

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: 完整替换 card.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TraeWork 卡片组件。
 * 使用 .ds-card / .ds-card__title / .ds-card__desc 类。
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("ds-card", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("ds-card__head", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("ds-card__title", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("ds-card__desc", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("ds-card__body", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("ds-card__foot", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

- [ ] **Step 2: 验证类型**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
# 期望：0 错误
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat(ui): 重写 card 为 TraeWork .ds-card"
```

---

### Task 8: 重写 input.tsx 为 TraeWork `.ds-input`

**Files:**
- Modify: `src/components/ui/input.tsx`

- [ ] **Step 1: 读取当前实现**

```bash
cat src/components/ui/input.tsx
```

- [ ] **Step 2: 完整替换 input.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TraeWork 输入框组件。
 * 使用 .ds-input 类。
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn("ds-input", className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 3: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 5
# 期望：0 错误
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat(ui): 重写 input 为 TraeWork .ds-input"
```

---

### Task 9: 重写 textarea、label、badge、avatar、separator、skeleton

**Files:**
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/label.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/avatar.tsx`
- Modify: `src/components/ui/separator.tsx`
- Modify: `src/components/ui/skeleton.tsx`

- [ ] **Step 1: 重写 textarea.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn("ds-textarea", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
```

- [ ] **Step 2: 重写 label.tsx**

```tsx
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("ds-label", className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

- [ ] **Step 3: 重写 badge.tsx**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("ds-tag", {
  variants: {
    variant: {
      default: "ds-tag--neutral",
      secondary: "ds-tag--neutral",
      outline: "ds-tag--outline",
      success: "ds-tag--success",
      warning: "ds-tag--warning",
      error: "ds-tag--error",
      brand: "ds-tag--brand",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 4: 重写 avatar.tsx**

```tsx
"use client";
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("ds-avatar", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("ds-avatar__img", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("ds-avatar__fallback", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
```

- [ ] **Step 5: 重写 separator.tsx**

```tsx
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "ds-divider",
        orientation === "horizontal" ? "ds-divider--h" : "ds-divider--v",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
```

- [ ] **Step 6: 重写 skeleton.tsx**

```tsx
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ds-skeleton", className)}
      {...props}
    />
  );
}

export { Skeleton };
```

- [ ] **Step 7: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 20
# 期望：0 错误
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/textarea.tsx src/components/ui/label.tsx src/components/ui/badge.tsx src/components/ui/avatar.tsx src/components/ui/separator.tsx src/components/ui/skeleton.tsx
git commit -m "feat(ui): 重写 textarea/label/badge/avatar/separator/skeleton 为 TraeWork 类"
```

---

### Task 10: 重写 toast.tsx 使用 TraeWork 通知类

**Files:**
- Modify: `src/components/ui/toast.tsx`

- [ ] **Step 1: 读取当前实现**

```bash
cat src/components/ui/toast.tsx
```

- [ ] **Step 2: 重写 toast.tsx**

完整替换为：

```tsx
"use client";

// 简易 toast 实现
// 样式遵循 TraeWork 规范：使用 .ds-notif / .ds-notif--* 类
import { create } from "zustand";
import { X } from "lucide-react";

type ToastType = "default" | "success" | "error" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (t: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(opts: { title: string; description?: string; type?: ToastType }) {
  useToastStore.getState().add({
    title: opts.title,
    description: opts.description,
    type: opts.type || "default",
  });
}

const variantClassMap: Record<ToastType, string> = {
  default: "ds-notif--default",
  success: "ds-notif--success",
  error: "ds-notif--error",
  warning: "ds-notif--warning",
};

export function Toaster() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col ds-gap-2 w-[360px] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`ds-notif pointer-events-auto ${variantClassMap[t.type]}`}
        >
          <div className="flex items-start ds-gap-3 p-4">
            <div className="flex-1 min-w-0">
              <div className="ds-notif__title">{t.title}</div>
              {t.description && (
                <div className="ds-notif__desc mt-1">
                  {t.description}
                </div>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="ds-notif__close"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
# 期望：0 错误
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/toast.tsx
git commit -m "feat(ui): 重写 toast 使用 TraeWork .ds-notif"
```

---

### Task 11: 重写 tooltip、alert-dialog、dialog、popover、dropdown-menu、scroll-area

**Files:**
- Modify: `src/components/ui/tooltip.tsx`
- Modify: `src/components/ui/alert-dialog.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/popover.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/scroll-area.tsx`

- [ ] **Step 1: 重写 tooltip.tsx**

```tsx
"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn("ds-tooltip", className)}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

- [ ] **Step 2: 重写 dialog.tsx（保留 Radix Dialog 状态机）**

```tsx
"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("ds-backdrop", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn("ds-dialog", className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="ds-dialog__close">
        <X className="h-4 w-4" />
        <span className="sr-only">关闭</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("ds-dialog__head", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("ds-dialog__foot", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("ds-dialog__title", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("ds-dialog__desc", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 3: 重写 alert-dialog.tsx（同 dialog 模式）**

```tsx
"use client";
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn("ds-backdrop", className)}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn("ds-dialog", className)}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants({ variant: "destructive" }), className)}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "secondary" }), className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("ds-dialog__head", className)} {...props} />
);
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("ds-dialog__foot", className)} {...props} />
);
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("ds-dialog__title", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("ds-dialog__desc", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
```

- [ ] **Step 4: 重写 popover.tsx**

```tsx
"use client";
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn("ds-popover", className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

- [ ] **Step 5: 重写 dropdown-menu.tsx（保留 Radix 状态机）**

```tsx
"use client";
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("ds-menu", className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn("ds-menu__item", inset && "ds-menu__item--inset", className)}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("ds-menu__label", inset && "ds-menu__item--inset", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("ds-menu__sep", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
};
```

- [ ] **Step 6: 重写 scroll-area.tsx**

```tsx
"use client";
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("ds-scroll-area", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="ds-scroll-area__viewport">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "ds-scroll-area__bar",
      orientation === "horizontal" ? "ds-scroll-area__bar--h" : "ds-scroll-area__bar--v",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="ds-scroll-area__thumb" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
```

- [ ] **Step 7: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 30
# 期望：0 错误；如果 alert-dialog.tsx 提示找不到 button.tsx 的 buttonVariants，确认 button.tsx 已 export
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/tooltip.tsx src/components/ui/alert-dialog.tsx src/components/ui/dialog.tsx src/components/ui/popover.tsx src/components/ui/dropdown-menu.tsx src/components/ui/scroll-area.tsx
git commit -m "feat(ui): 重写 tooltip/dialog/alert-dialog/popover/dropdown-menu/scroll-area"
```

---

### Task 12: 重写 tabs、accordion、select、switch、progress

**Files:**
- Modify: `src/components/ui/tabs.tsx`
- Modify: `src/components/ui/accordion.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/switch.tsx`
- Modify: `src/components/ui/progress.tsx`

- [ ] **Step 1: 重写 tabs.tsx**

```tsx
"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("ds-tabs", className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn("ds-tabs__trigger", className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("ds-tabs__panel", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 2: 重写 accordion.tsx**

```tsx
"use client";
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("ds-accordion__item", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="ds-accordion__head">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn("ds-accordion__trigger", className)}
      {...props}
    >
      {children}
      <ChevronDown className="ds-accordion__chevron h-4 w-4" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn("ds-accordion__content", className)}
    {...props}
  >
    <div className="ds-accordion__body">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
```

- [ ] **Step 3: 重写 select.tsx（保留 Radix Select 状态机）**

```tsx
"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn("ds-select__trigger", className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-icon-tertiary" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn("ds-select__content", className)}
      position={position}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="ds-select__scroll">
        <ChevronUp className="h-4 w-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="ds-select__viewport">
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="ds-select__scroll">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn("ds-select__item", className)}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="ds-select__indicator">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
};
```

- [ ] **Step 4: 重写 switch.tsx**

```tsx
"use client";
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn("ds-switch", className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className="ds-switch__thumb" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
```

- [ ] **Step 5: 重写 progress.tsx**

```tsx
"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("ds-progress", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="ds-progress__indicator"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
```

- [ ] **Step 6: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 30
# 期望：0 错误
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/tabs.tsx src/components/ui/accordion.tsx src/components/ui/select.tsx src/components/ui/switch.tsx src/components/ui/progress.tsx
git commit -m "feat(ui): 重写 tabs/accordion/select/switch/progress"
```

---

### Task 13: 检查并清理 `dark:` Tailwind 前缀

**Files:**
- Search: `src/**/*.{ts,tsx,css}`
- Modify: 按需

- [ ] **Step 1: 列出所有 `dark:` 前缀**

```bash
Select-String -Path src\**\*.{ts,tsx,css} -Pattern "dark:" -List | Select-Object Path, LineNumber
# 期望输出文件清单；记录每处行号
```

- [ ] **Step 2: 逐文件评估并删除**

每个文件：
- 如果 `dark:` 仅影响颜色（`dark:bg-neutral-900` 等），直接删除
- 如果 `dark:` 影响布局/可见性（`dark:hidden`），评估 light 模式表现后改为对应静态类

**典型删除模式**：
```tsx
// 删除前
className="bg-white dark:bg-neutral-900 text-black dark:text-white"
// 删除后
className="bg-bg-base-default text-text-default"
```

- [ ] **Step 3: 验证 0 命中**

```bash
Select-String -Path src\**\*.{ts,tsx,css} -Pattern "dark:" -List | Measure-Object
# 期望：Count = 0
```

- [ ] **Step 4: 检查 `prefers-color-scheme: dark`**

```bash
Select-String -Path src\**\*.{ts,tsx,css} -Pattern "prefers-color-scheme.*dark" -List
# 期望：0 命中（globals.css 已移除）
```

- [ ] **Step 5: Commit**

```bash
git add -u src/
git commit -m "chore(style): 移除所有 dark: 前缀，彻底删除 dark mode 引用"
```

---

### Task 14: 改造 app-header 导航

**Files:**
- Modify: `src/components/app-header.tsx`

- [ ] **Step 1: 读取当前实现**

```bash
cat src/components/app-header.tsx
```

- [ ] **Step 2: 重写为使用 TraeWork token**

替换所有 `bg-white`、`bg-slate-50`、`bg-neutral-900` 等为：
- `bg-bg-base-default` / `bg-bg-base-secondary`
- `text-text-default` / `text-text-secondary`
- `border-border-neutral-l1` (Tailwind 颜色别名)
- 按钮统一 `<Button variant="default" size="sm">` 或 ghost
- 间距用 `ds-4` `ds-8` `ds-16`

参考样式：
```tsx
<header className="bg-bg-base-default border-b border-border-neutral-l1 h-16">
  <div className="container flex items-center justify-between h-full ds-px-4">
    <Link href="/" className="text-ds-base font-medium text-text-default">
      墨笔
    </Link>
    <nav className="flex items-center ds-gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/pricing">定价</Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">登录</Link>
      </Button>
      <Button variant="default" size="sm">免费注册</Button>
    </nav>
  </div>
</header>
```

- [ ] **Step 3: 验证类型和渲染**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
# 启动 dev 模式，打开首页截图验证
& "D:\mycode\nodejs\npx.cmd" next dev
```

- [ ] **Step 4: Commit**

```bash
git add src/components/app-header.tsx
git commit -m "refactor(ui): 改造 app-header 使用 TraeWork token"
```

---

### Task 15: 改造 project-mode-switcher（三个视图切换）

**Files:**
- Modify: `src/components/project-mode-switcher.tsx`

- [ ] **Step 1: 读取当前实现**

```bash
cat src/components/project-mode-switcher.tsx
```

- [ ] **Step 2: 用 TraeWork 类改造**

将外层包装从 `bg-white border ...` 改为：
```tsx
<div className="ds-btn-group" role="tablist">
  <Button variant="default" size="sm" data-state={active ? "active" : "inactive"}>
    流水线
  </Button>
  ...
</div>
```

或使用 `<Tabs>` Radix 组件配合 `.ds-tabs` 类（如果在 Step 11 已完成 Radix 集成）。

- [ ] **Step 3: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 5
```

- [ ] **Step 4: Commit**

```bash
git add src/components/project-mode-switcher.tsx
git commit -m "refactor(ui): 改造 project-mode-switcher 使用 TraeWork"
```

---

### Task 16: 改造 project-workspace 头部

**Files:**
- Modify: `src/components/project-workspace.tsx`

- [ ] **Step 1: 读取当前实现**

```bash
cat src/components/project-workspace.tsx
```

- [ ] **Step 2: 改造样式类**

替换：
- `bg-slate-50` → `bg-bg-base-secondary`
- `bg-white rounded-2xl shadow-sm p-6` → `ds-card ds-p-6`
- `text-muted-foreground` → `text-text-tertiary`
- `bg-neutral-100 hover:bg-neutral-200` → `bg-bg-overlay-l1 hover:bg-bg-overlay-l2`
- `border border-neutral-200` → `border border-border-neutral-l2`

- [ ] **Step 3: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 5
```

- [ ] **Step 4: Commit**

```bash
git add src/components/project-workspace.tsx
git commit -m "refactor(ui): 改造 project-workspace 使用 TraeWork"
```

---

### Task 17: 改造 pipeline/step1-6 组件

**Files:**
- Modify: `src/components/pipeline/step1-inspire.tsx`
- Modify: `src/components/pipeline/step2-worldbuild.tsx`
- Modify: `src/components/pipeline/step3-character.tsx`
- Modify: `src/components/pipeline/step4-outline.tsx`
- Modify: `src/components/pipeline/step5-expand.tsx`
- Modify: `src/components/pipeline/step6-polish.tsx`
- Modify: `src/components/pipeline/pipeline-flow.tsx`

- [ ] **Step 1: 批量查找 `rounded-2xl` / `bg-white` / `border-neutral`**

```bash
Select-String -Path src\components\pipeline\*.tsx -Pattern "rounded-2xl|bg-white|border-neutral|shadow-sm" | Select-Object Path, LineNumber
```

- [ ] **Step 2: 逐个文件改造**

将：
- `<Card>...` → 保持 `<Card>`（已用 TraeWork 类）
- `rounded-2xl` → `rounded-ds-2xl`
- `bg-white` → `bg-bg-base-default`
- `border-neutral-100` → `border-border-neutral-l1`
- `shadow-sm` → 删除（TraeWork 不使用 shadow）
- `text-muted-foreground` → `text-text-tertiary`
- `text-emerald-600`（成功状态） → `text-status-success`

- [ ] **Step 3: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 20
```

- [ ] **Step 4: Commit**

```bash
git add src/components/pipeline/
git commit -m "refactor(ui): 改造 pipeline 步骤组件使用 TraeWork"
```

---

### Task 18: 改造 workbench 和 chat 组件

**Files:**
- Modify: `src/components/workbench/workbench-client.tsx`
- Modify: `src/components/chat/chat-cocreate-client.tsx`
- Modify: `src/components/editor/tiptap-editor.tsx`

- [ ] **Step 1: 改造 workbench-client**

```bash
Select-String -Path src\components\workbench\workbench-client.tsx -Pattern "rounded-2xl|bg-white|border-neutral|shadow-sm|text-muted" | Measure-Object
```

替换为 TraeWork 类。

- [ ] **Step 2: 改造 chat-cocreate-client**

同上。

- [ ] **Step 3: 改造 tiptap-editor**

工具栏按钮统一用 `<Button variant="ghost" size="icon">`；顶栏 `border-b border-neutral-100` → `border-b border-border-neutral-l1`；底栏 `bg-white` → `bg-bg-base-default`。

- [ ] **Step 4: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 20
```

- [ ] **Step 5: Commit**

```bash
git add src/components/workbench/ src/components/chat/ src/components/editor/
git commit -m "refactor(ui): 改造 workbench/chat/editor 使用 TraeWork"
```

---

### Task 19: 改造 style/style-picker 和 model/model-picker

**Files:**
- Modify: `src/components/style/style-picker.tsx`
- Modify: `src/components/model/model-picker.tsx`

- [ ] **Step 1: 改造 style-picker**

替换：
- `<Button>` 已是 TraeWork（已通过 Task 6 改造）
- `<Card>` 同上
- `rounded-2xl` `bg-white` 等 → TraeWork 类

- [ ] **Step 2: 改造 model-picker**

外层 `<Popover>` 已是 TraeWork（已通过 Task 11 改造）；仅需修改内部 `rounded-md` `bg-neutral-*` 类为 TraeWork 别名。

- [ ] **Step 3: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/style/ src/components/model/
git commit -m "refactor(ui): 改造 style-picker/model-picker 使用 TraeWork"
```

---

### Task 20: 改造 admin 组件

**Files:**
- Modify: `src/components/admin/admin-users-client.tsx`
- Modify: `src/components/admin/admin-projects-client.tsx` (如有)
- Modify: `src/components/admin/admin-logs-client.tsx` (如有)

- [ ] **Step 1: 列出 admin 组件文件**

```bash
ls src/components/admin/
```

- [ ] **Step 2: 改造 admin-users-client**

替换 `rounded-2xl` `bg-white` `border-neutral` 等为 TraeWork 类；`<Badge>` 用 TraeWork 样式（已通过 Task 9 改造）。

- [ ] **Step 3: 改造其它 admin 文件（如有）**

- [ ] **Step 4: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/
git commit -m "refactor(ui): 改造 admin 组件使用 TraeWork"
```

---

### Task 21: 改造页面（/、/login、/register、/pricing）

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/pricing/page.tsx`

- [ ] **Step 1: 改造首页**

替换：
- `bg-slate-50` → `bg-bg-base-secondary`
- `bg-white rounded-2xl shadow-sm` → `ds-card`
- `text-4xl font-semibold` → `text-ds-heading-3xl font-ds-heading`
- `text-lg text-muted-foreground` → `text-ds-lg text-text-secondary`
- `<Button variant="default" size="lg">` 已用 TraeWork

- [ ] **Step 2: 改造 login/register**

居中容器 `max-w-md mx-auto ds-pt-16`；表单用 `ds-card ds-p-8 ds-gap-6`；input 用 `ds-input`；button primary。

- [ ] **Step 3: 改造 pricing**

3 列定价卡网格；每张卡用 `ds-card ds-p-8`；高亮卡加 `ds-card--featured`；`<Badge>` 用于"推荐"标签。

- [ ] **Step 4: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
# 启动 dev，逐页截图验证
& "D:\mycode\nodejs\npx.cmd" next dev
```

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/login/ src/app/register/ src/app/pricing/
git commit -m "refactor(ui): 改造首页/登录/注册/定价页使用 TraeWork"
```

---

### Task 22: 改造 /projects、/project/[id] 页面

**Files:**
- Modify: `src/app/projects/page.tsx`
- Modify: `src/components/projects/projects-client.tsx`
- Modify: `src/app/project/[id]/page.tsx`

- [ ] **Step 1: 改造 projects-client**

项目卡用 `ds-card`；新建按钮用 `Button variant="default"`；空状态用居中卡。

- [ ] **Step 2: 改造 /project/[id] 页面**

头部用 `ds-card`；视图切换由 `<ProjectModeSwitcher>` 负责（已在 Task 15 改造）。

- [ ] **Step 3: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/ src/app/project/ src/components/projects/
git commit -m "refactor(ui): 改造项目列表/项目详情页使用 TraeWork"
```

---

### Task 23: 改造 admin 页面

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/projects/page.tsx`
- Modify: `src/app/admin/logs/page.tsx`

- [ ] **Step 1: 改造 admin 概览**

`ds-card` 网格布局 + 数字 KPI 用 `font-ds-metric text-ds-heading-xl`。

- [ ] **Step 2: 改造 admin/users**

用户表格：每行用 `border-b border-border-neutral-l1`；角色 `<Badge variant="brand|secondary|outline">`。

- [ ] **Step 3: 改造 admin/projects、admin/logs**

同上模式。

- [ ] **Step 4: 验证**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 10
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/
git commit -m "refactor(ui): 改造 admin 页面使用 TraeWork"
```

---

### Task 24: 全站验证

**Files:** 无

- [ ] **Step 1: Type check**

```bash
& "D:\mycode\nodejs\npx.cmd" tsc --noEmit 2>&1 | Select-Object -First 50
# 期望：0 错误
```

- [ ] **Step 2: 移除 `dark:` 验证**

```bash
Select-String -Path src\**\*.{ts,tsx,css} -Pattern "dark:" -List | Measure-Object
# 期望：Count = 0
```

- [ ] **Step 3: 移除 emoji 验证**

```bash
Select-String -Path src\**\*.{ts,tsx} -Pattern "[😀-🙏🚀-🛿✨🎉🔥⭐️✅❌]" -List | Measure-Object
# 期望：Count = 0（界面不要 emoji，符合用户偏好）
```

- [ ] **Step 4: 移除 `bg-blue-*` / `text-blue-*` 验证**

```bash
Select-String -Path src\**\*.{ts,tsx} -Pattern "bg-blue-|text-blue-|bg-indigo-" -List | Measure-Object
# 期望：Count = 0（不要蓝色主按钮）
```

- [ ] **Step 5: 生产构建**

```bash
& "D:\mycode\nodejs\npx.cmd" next build 2>&1 | Select-String -Pattern "error|Error|warn" | Select-Object -First 30
# 期望：无 error；warn 可接受
```

- [ ] **Step 6: 启动 dev，手动截图验证**

```bash
& "D:\mycode\nodejs\npx.cmd" next dev
```

访问以下路径并截图：
- `/`
- `/login`
- `/register`
- `/pricing`
- `/projects`
- `/project/[id]`（任一项目）
- `/admin`
- `/admin/users`

视觉检查项：
- [ ] 页面底色 `#F5F5F5`
- [ ] 卡片白底、圆角 12px
- [ ] 主按钮深灰 `#171717`、白字、圆角 8px
- [ ] 次要按钮浅灰边框
- [ ] body 字体 14px，标题用 SF Pro
- [ ] 状态色（success/warning/error）颜色正确
- [ ] 无 emoji
- [ ] 浏览器切换深色模式 → 页面保持 light

- [ ] **Step 7: 记录验收结果**

在 `docs/superpowers/specs/2026-08-06-traework-migration-design.md` 末尾追加验收章节：

```markdown
## 验收记录

**日期：** 2026-08-XX
**实施者：** [name]
**结果：** [PASS / PARTIAL / FAIL]

### 检查项
- [x] tsc --noEmit 0 错误
- [x] dark: 0 命中
- [x] emoji 0 命中
- [x] 蓝色按钮 0 命中
- [x] next build 通过
- [x] 8 个关键页面截图通过
- [x] 浏览器 dark mode 不影响 light 外观
```

- [ ] **Step 8: Final commit**

```bash
git add docs/superpowers/specs/2026-08-06-traework-migration-design.md
git commit -m "docs: TraeWork 迁移验收通过"
```

---

## 验收标准（汇总）

1. ✅ `tsc --noEmit` 0 错误
2. ✅ `next build` 通过
3. ✅ `dark:` 0 命中
4. ✅ emoji 0 命中
5. ✅ 蓝色主按钮 0 命中
6. ✅ 主按钮显示深灰 `#171717` 白字
7. ✅ 页面底色 `#F5F5F5`、卡片白底、圆角 12px
8. ✅ 浏览器切换深色模式不影响 light 外观
9. ✅ 所有 8 个关键页面视觉一致
10. ✅ 业务代码 0 修改（仅 stylesheet 和 shadcn 内部重写）

## 风险与回滚

- **每阶段独立 commit**，任何阶段失败可 `git revert` 单个 commit
- **globals.css.bak** 在 Task 4 已删除；如需回滚，从 `git log` 找回旧版本
- **shadcn 组件修改**：如某组件改造后行为异常，可单独 revert 该文件
- **业务组件修改**：影响范围大，回滚前先 git diff 确认

## 不在范围内

- 不重写交互层（保留 Radix UI）
- 不替换 lucide-react 图标
- 不修改后端、AI 逻辑、Prisma schema
- 不删 shadcn 依赖包（仅重写 UI 文件）
- 不新增 TraeWork 中没有的组件
- 不修改 token 默认值（除 brand 4 个变量外）
