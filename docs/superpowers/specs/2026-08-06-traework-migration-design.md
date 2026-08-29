# TraeWork 设计规范迁移 — 设计文档

> 状态：待用户 review
> 创建日期：2026-08-06
> 关联规范：`dl_builtin_trae_work/SKILL.md` + `README.md`
> 关联 token：`dl_builtin_trae_work/colors_and_type.css`
> 关联组件：`dl_builtin_trae_work/components.css` + `dl_builtin_trae_work/components/*.json`
> 关联 UI Kit：`dl_builtin_trae_work/ui_kits/{dashboard,dashboard-2,settings,dev-explorer,landing}`

## 1. 背景与目标

### 1.1 现状
当前 `墨笔 AI 写作平台` 是一套 Next.js 15 + TypeScript + Tailwind + shadcn/ui（基于 Radix UI + cva）项目，使用 `cn()` 工具类组合样式，已完成 2026-07-29 UI refresh（极简风格、深灰主按钮、浅灰底+白卡大圆角）。

**问题：**
- UI token 是手写的 Tailwind class（`bg-neutral-900`、`rounded-2xl`、`shadow-sm` 等），缺乏系统化 token 体系
- shadcn 组件繁多（22 个），每次改设计都要逐个改 cva
- 没有正式的 icon 系统，依赖 lucide-react + emoji
- 不符合设计-工程协作的现代规范（design token 单一来源、组件契约 JSON）

### 1.2 目标
将 TraeWork Light-mode 设计系统集成到本项目，**全面替换**为：
- **设计 token 单一来源**：`colors_and_type.css` 的 CSS 变量作为唯一来源
- **组件类体系**：`.ds-btn`、`.ds-card`、`.ds-dialog` 等代替手写 Tailwind + cva
- **icon 系统**：保留 lucide-react，但通过 `currentColor` 接入 TraeWork icon 颜色 token
- **light-only**：彻底移除 `dark:` 前缀和 `.dark{}` 块
- **中文界面**：界面文案保持中文；token 名、class 名按规范原文
- **统一规范**：所有页面、组件、状态用同一套视觉语言

### 1.3 非目标
- **不重写交互层**：保留 Radix UI 状态机（Dialog/Popover/Select/Tabs 等），仅替换外观样式
- **不替换图标源**：保留 lucide-react，仅改用 TraeWork 颜色 token
- **不修改后端、AI 逻辑、数据库 schema**：纯前端样式层迁移
- **不删除 shadcn 包**：保留 Radix UI 依赖，但 UI 文件将改造为使用 TraeWork 样式

## 2. 设计原则

来自 `dl_builtin_trae_work/SKILL.md`，本项目采纳：

1. **Light mode only**：移除所有 dark mode 变体（`dark:` 前缀、`.dark{}` 块、`prefers-color-scheme: dark`）
2. **Token-first**：每个颜色/圆角/间距/字号必须解析到 `colors_and_type.css` 的 token
3. **Quiet by default**：中性底色、克制边框、字体承担层级。brand 色仅用于关键操作
4. **Type-first**：用字号/字重/留白建立层级，避免堆装饰
5. **Body baseline = 14px / 20px**：主内容 14px，dense 控件用 body-sm 12px / body-xs 10px
6. **Step surface depth one level at a time**：不在 `--bg-base-default` 卡片内嵌 `--bg-base-secondary` 容器
7. **Container 间距**：卡片间 ≥ `--spacer-16`、卡片组间 ≥ `--spacer-24`、页面 section 间 ≥ `--spacer-32`、页面 major region 间 ≥ `--spacer-48`
8. **单 view 一个 brand CTA**：主按钮每页只一个；其它品牌级操作降级为 neutral
9. **Motion short and functional**：120ms hover、200ms 状态、300ms 布局。translation ≤ 4px、scale ≤ 1.05
10. **Accessible**：文字对比 ≥ 4.5:1、图标 ≥ 3:1、focus ring 可见、icon-only button 必须 `aria-label`

## 3. 视觉系统（TraeWork 实际值）

| 元素 | Token | 实际值 | 用途 |
|------|-------|--------|------|
| 页面底 | `--bg-base-secondary` | `#F5F5F5` | 全站页面背景 |
| 卡片底 | `--bg-base-default` | `#FFFFFF` | 卡片/容器背景 |
| 控件底 | `--bg-overlay-l1` | `rgba(115,115,115,0.08)` | 输入框、inline 控件 |
| 悬浮菜单 | `--bg-menu` | `#FFFFFF` | popover、menu |
| 主品牌 | `--bg-brand` | `#4B3FE3` | 紫色（**注意：与之前深灰偏好冲突，见 §6.1**）|
| 主品牌 hover | `--bg-brand-hover` | `#6A6FFF` | |
| 主品牌 active | `--bg-brand-active` | `#3F31C6` | |
| 文本主色 | `--text-default` | `#171717` | |
| 文本副 | `--text-secondary` | `#404040` | |
| 文本弱 | `--text-tertiary` | `#737373` | |
| 文本禁用 | `--text-disabled` | `#A1A1A1` | |
| 文本反白 | `--text-onbrand` | `#FFFFFF` | |
| 边框弱 | `--border-neutral-l1` | `rgba(115,115,115,0.12)` | |
| 边框中 | `--border-neutral-l2` | `rgba(115,115,115,0.18)` | |
| 边框强 | `--border-neutral-l3` | `rgba(115,115,115,0.36)` | |
| 边框对比 | `--border-contrast` | `#000000` | |
| 边框品牌 | `--border-brand` | `#4B3FE3` | |
| 字体默认 | `--font-family-default` | SF Pro Text / PingFang SC | |
| 字体标题 | `--font-family-heading` | SF Pro / PingFang SC | |
| 字体度量 | `--font-family-metric` | Inter | KPI 数字 |
| 字体代码 | `--code-editor-font-family` | JetBrains Mono | |
| 圆角容器 | `--radius-8` | 8px | button、input |
| 圆角卡片 | `--radius-12` | 12px | card、dialog |
| 圆角更大 | `--radius-16/20/24/32` | 16-32px | hero card |
| body-base | `--body-base-font-size/line-height` | 14px / 20px | 默认 |
| body-sm | `--body-sm-font-size/line-height` | 11px / 16px | dense |
| body-md | `--body-md-font-size/line-height` | 12px / 18px | caption |
| body-lg | `--body-lg-font-size/line-height` | 18px / 28px | intro |
| heading-sm | `--heading-sm-font-size/line-height` | 16px / 24px | h4 |
| heading-md | `--heading-md-font-size/line-height` | 20px / 28px | h3 |
| heading-lg | `--heading-lg-font-size/line-height` | 22px / 30px | h2 |
| heading-xl | `--heading-xl-font-size/line-height` | 24px / 32px | h1 |
| heading-display | `--heading-display-font-size/line-height` | 52px / 60px | hero |
| icon 尺寸 | `--icon-size-12/14/16/20/24` | 12/14/16/20/24px | |
| 状态-成功 | `--status-success-default` | `#15A877` | success |
| 状态-警告 | `--status-warning-default` | `#E27900` | warning |
| 状态-错误 | `--status-error-default` | `#E8463A` | error |
| 状态-信息 | `--status-primary-default` | `#2F74FF` | info |

## 4. 颜色覆盖映射（trae brand → 用户偏好）

### 4.1 主品牌色（**唯一需要决策的项**）

TraeWork 的 `--bg-brand` 是**紫色 `#4B3FE3`**。你之前明确表达过：
> 不喜欢蓝色按钮，偏好深灰色主按钮

**冲突点**：直接用 TraeWork token，主按钮会变紫色，违反你的设计偏好。

**推荐方案（方案 A — 仍采用规范，仅微调 brand 色）**：
保留 token 结构，但把 `--bg-brand` 的值覆盖为深灰：
```css
:root {
  /* 覆盖 TraeWork 默认的紫色 brand，保持你"深灰主按钮"的偏好 */
  --bg-brand: #171717;          /* 替换 #4B3FE3 */
  --bg-brand-hover: #404040;    /* 替换 #6A6FFF */
  --bg-brand-active: #0A0A0A;   /* 替换 #3F31C6 */
  --bg-brand-disabled: rgba(23, 23, 23, 0.20);
}
```
**效果**：
- 主按钮黑底白字（与之前 `bg-neutral-900` 一致）
- 保留 TraeWork 的 `--text-brand`、`--icon-brand` 等 brand 系列色（深灰）
- 保留 `.ds-btn--primary` 类名（不破坏 token-first 原则）
- 与你"完全采用 TraeWork 规范"的选择协调：所有 token、组件、布局均按规范；唯一例外是 brand 色值

**方案 B（不推荐）**：完全照搬紫色 brand — 视觉变化最大，但与你之前偏好冲突。

> **本设计文档采用方案 A**。这是与用户"完全采用 TraeWork 规范"+"深灰主按钮偏好"的协调解。

### 4.2 其它 token 全部采用 TraeWork 原值
包括状态色（success/warning/error）、文字色、边框色、间距、圆角、字号。

## 5. 文件改造清单

### 5.1 全局样式

| 文件 | 操作 | 内容 |
|------|------|------|
| `dl_builtin_trae_work/colors_and_type.css` | **复制到** `src/styles/tokens.css` | 完整 token 定义 |
| `dl_builtin_trae_work/components.css` | **复制到** `src/styles/components.css` | `.ds-*` 组件类 |
| `dl_builtin_trae_work/scaffold.css` | **选择性复制** | 仅取 reset、typography utilities |
| `src/app/globals.css` | **重写** | 引入 token + 组件类，移除 `.dark{}` 和 `dark:` 前缀；保留必要的 page 动画、scrollbar、TipTap prose |

### 5.2 shadcn → .ds-* 组件映射

| shadcn 组件（`src/components/ui/`） | 改造方向 | 备注 |
|------|------|------|
| `button.tsx` | **重写**：内部用 `.ds-btn .ds-btn--primary/secondary/ghost/danger-subtle` 类，cva 包装为透传 | 保留 `asChild` 走 Slot |
| `card.tsx` | **重写**：用 `.ds-card .ds-card__title .ds-card__desc` 类 | 移除 `shadow` |
| `input.tsx` | **重写**：用 `.ds-input` 类 | |
| `textarea.tsx` | **重写**：用 `.ds-textarea` 类 | |
| `select.tsx` | **保留 Radix，包装样式** | trigger 用 `.ds-select-trigger`、content 用 `.ds-menu` |
| `dialog.tsx` | **保留 Radix Dialog，包装样式** | overlay `.ds-backdrop`、content `.ds-dialog` |
| `popover.tsx` | **保留 Radix Popover，包装样式** | content `.ds-popover` |
| `tooltip.tsx` | **保留 Radix Tooltip，包装样式** | content `.ds-tooltip` |
| `dropdown-menu.tsx` | **保留 Radix，包装样式** | content `.ds-menu` |
| `tabs.tsx` | **保留 Radix Tabs，包装样式** | list `.ds-tabs`、trigger/panel 对应 |
| `accordion.tsx` | **保留 Radix，包装样式** | |
| `alert-dialog.tsx` | **保留 Radix，包装样式** | 同 dialog |
| `switch.tsx` | **保留 Radix Switch，包装样式** | |
| `checkbox.tsx` | **新增**（如果 Radix Checkbox 已装则改造） | `.ds-check` |
| `radio.tsx` | **新增** | `.ds-radio` |
| `badge.tsx` | **重写**：用 `.ds-tag` | |
| `avatar.tsx` | **重写**：用 `.ds-avatar` | |
| `progress.tsx` | **重写**：用 `.ds-progress` | |
| `skeleton.tsx` | **重写**：用 `.ds-skeleton` | |
| `scroll-area.tsx` | **保留 Radix，包装样式** | 解决之前滚动条方向问题 |
| `separator.tsx` | **保留 Radix，包装样式** | |
| `label.tsx` | **重写**：用 TraeWork label 类 | |
| `toast.tsx` | **重写**：用 `.ds-notif` | 保留 zustand store |

**保留策略**：所有 shadcn 文件保留 API 签名（props、ref、forwardRef），内部用 TraeWork 类。这样上层 `pages` 调用代码（`<Button variant="default">`）几乎无需改动。

### 5.3 业务组件改造

| 文件 | 操作 |
|------|------|
| `src/components/app-header.tsx` | 用 TraeWork 类型 token（字体、间距、圆角）重排 |
| `src/components/project-mode-switcher.tsx` | 用 `.ds-tabs` 类 |
| `src/components/project-workspace.tsx` | 重排布局，对接 token；保留 ModelPicker 等业务逻辑 |
| `src/components/projects/projects-client.tsx` | 用 `.ds-card`、`.ds-tag`、`.ds-btn` |
| `src/components/workbench/workbench-client.tsx` | 用 `.ds-tabs`、`.ds-card` |
| `src/components/pipeline/pipeline-flow.tsx` | 用 `.ds-card`、`.ds-btn` |
| `src/components/pipeline/step*.tsx` | 6 个步骤组件逐个改造 |
| `src/components/chat/chat-cocreate-client.tsx` | 用 `.ds-card`、`.ds-input` |
| `src/components/editor/tiptap-editor.tsx` | 工具栏用 `.ds-btn`；保留 TipTap prose |
| `src/components/style/style-picker.tsx` | 用 `.ds-radio`、`.ds-card` |
| `src/components/model/model-picker.tsx` | 用 `.ds-menu`、`.ds-btn` |
| `src/components/admin/admin-users-client.tsx` | 用 `.ds-tag`、`.ds-table`（如适用） |

### 5.4 页面改造

| 路由 | 改造点 |
|------|--------|
| `/` (首页) | Hero 大卡 + 三模式卡 + 能力卡，全部用 `.ds-card`、`.ds-btn` |
| `/login` | 居中卡片 + 表单 `.ds-input`、`.ds-btn--primary` |
| `/register` | 同上 |
| `/pricing` | 定价卡 `.ds-card` + 标签 `.ds-tag` |
| `/projects` | 顶部条 + 项目网格 `.ds-card` |
| `/project/[id]` | 三视图头部 + 切换器 `.ds-tabs`、流水线/工作台/对话卡 |
| `/admin` | 概览卡 `.ds-card` + 列表 `.ds-menu` |
| `/admin/users` | 用户表格 `.ds-table`（如可）+ 角色 `.ds-tag` |
| `/admin/projects` | 项目列表 |
| `/admin/logs` | 日志表格 |

### 5.5 删除项

| 操作 | 范围 |
|------|------|
| **删除** | `src/app/globals.css` 中 `.dark{}` 块 |
| **删除** | 所有 `dark:` Tailwind 前缀（约 50+ 处） |
| **删除** | `darkMode: "class"` / `darkMode: ["class", '[data-theme="dark"]']`（如有） |
| **删除** | 主题切换按钮（如果存在） |
| **保留** | lucide-react 全部图标 |
| **保留** | `@radix-ui/*` 全部包 |
| **保留** | `tailwind.config.js` 用于 reset、layout utilities（spacing、flex、grid），但删除颜色相关 extension |

## 6. 关键设计决策

### 6.1 主品牌色（详见 §4.1）
- **采用方案 A**：覆盖 `--bg-brand` 为深灰 `#171717`，保留其余 token 原值
- **理由**：与用户"深灰主按钮"偏好协调；保持 token-first 原则；后续若改回紫色仅需改 4 个变量

### 6.2 中文界面 vs 英文 token 名
- **界面文案保持中文**（按钮文字、标题、占位符）
- **CSS 变量名、Tailwind 工具类、`.ds-*` 类名用规范原文**（如 `.ds-btn--primary`、`.ds-card__title`、`--bg-base-default`）
- **理由**：token 名是工程契约，中文化会破坏可复用性；规范要求"machine-readable"

### 6.3 lucide-react 颜色处理
TraeWork icon 颜色通过 `--icon-default` / `--icon-secondary` / `--icon-tertiary` / `--icon-onbrand` token 控制。lucide-react 默认 `currentColor`，通过 wrapper class 控制：
```tsx
<span className="text-[color:var(--icon-default)]">
  <Sparkles className="h-4 w-4" />
</span>
```
或直接在 tailwind.config 中加扩展颜色（**推荐方案**）：
```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'icon-default': 'var(--icon-default)',
      'icon-secondary': 'var(--icon-secondary)',
      'icon-tertiary': 'var(--icon-tertiary)',
      'icon-onbrand': 'var(--icon-onbrand)',
      'text-default': 'var(--text-default)',
      'text-secondary': 'var(--text-secondary)',
      'text-tertiary': 'var(--text-tertiary)',
      'text-disabled': 'var(--text-disabled)',
      'border-neutral-l1': 'var(--border-neutral-l1)',
      'border-neutral-l2': 'var(--border-neutral-l2)',
      'border-neutral-l3': 'var(--border-neutral-l3)',
      'bg-base-default': 'var(--bg-base-default)',
      'bg-base-secondary': 'var(--bg-base-secondary)',
      'bg-base-tertiary': 'var(--bg-base-tertiary)',
      'bg-overlay-l1': 'var(--bg-overlay-l1)',
      'bg-overlay-l2': 'var(--bg-overlay-l2)',
      'bg-overlay-l3': 'var(--bg-overlay-l3)',
      'bg-brand': 'var(--bg-brand)',
      'bg-brand-hover': 'var(--bg-brand-hover)',
    },
    borderRadius: {
      'ds-sm': 'var(--radius-4)',
      'ds-md': 'var(--radius-6)',
      'ds-lg': 'var(--radius-8)',
      'ds-xl': 'var(--radius-10)',
      'ds-2xl': 'var(--radius-12)',
      'ds-3xl': 'var(--radius-16)',
    },
    spacing: {
      'ds-2': 'var(--spacer-2)',
      'ds-4': 'var(--spacer-4)',
      'ds-8': 'var(--spacer-8)',
      'ds-12': 'var(--spacer-12)',
      'ds-16': 'var(--spacer-16)',
      'ds-24': 'var(--spacer-24)',
      'ds-32': 'var(--spacer-32)',
      'ds-48': 'var(--spacer-48)',
    },
  },
},
```
然后业务代码可以继续使用 `<Sparkles className="h-4 w-4 text-icon-default" />` 而无需每次写 `style={{}}`。
**注意**：Tailwind 颜色仅作为便捷别名，**主样式仍应使用 `.ds-*` 类**。

### 6.4 Dark mode 彻底移除
- 删除 `.dark{}` 块
- 删除 `dark:` Tailwind 前缀
- 删除 `prefers-color-scheme: dark` 媒体查询
- **风险**：用户可能在浏览器/系统设为 dark mode 时仍想看 light UI。验证方式：手动切换系统深色，页面应保持 light。

### 6.5 组件类 vs Tailwind 共存
- **优先用 `.ds-*` 类**（如 `className="ds-btn ds-btn--primary ds-btn--md"`）
- **布局工具用 Tailwind**（如 `className="flex items-center gap-2"`）
- **不要混用语义类**：不要在 `.ds-card` 元素上又加 `bg-white border rounded-2xl shadow-sm`

### 6.6 不重写交互层
- 保留 Radix UI 的所有状态机、键盘交互、ARIA 属性
- 仅替换外观样式（背景色、圆角、阴影、间距、字体）
- Radix 的 `data-state="open|closed"` 等属性可用于 `.ds-*` 类的状态切换

### 6.7 滚动条统一
- 仍使用 globals.css 的 `::-webkit-scrollbar` 自定义滚动条
- 颜色用 `--border-neutral-l1` 或新加 `--scrollbar-thumb` token

## 7. 风险与验证

### 7.1 风险清单
| 风险 | 等级 | 缓解 |
|------|------|------|
| Radix UI 默认样式与 TraeWork 冲突 | 中 | 复写 Radix 的 `[data-state]`、`[data-radix-*]` 选择器 |
| TipTap prose 样式与 token 不一致 | 中 | 自定义 `.prose-editor` 类，覆盖 Tailwind Typography |
| shadcn 22 个组件逐个改造工作量大 | 高 | 分阶段：先 button/card/input/textarea/dialog，再 select/popover/tabs 等复杂组件 |
| 中文界面文案在 UI Kit 中无法直接复用 | 低 | 仅参考 token 和 class 名；文案全部重写 |
| 现有 cva 代码量多 | 中 | cva 作为内部封装保留；调用方不变 |
| 用户偏好与 TraeWork brand 色冲突 | 已解决 | 覆盖 brand 变量为深灰 |

### 7.2 验证清单
- [ ] Lighthouse a11y ≥ 95
- [ ] 关键页面（首页 / 项目 / 工作台 / 流水线 / 管理）截图与 `dl_builtin_trae_work/ui_kits/` 对比
- [ ] 浏览器 dark mode 切换：界面保持 light
- [ ] 键盘 Tab 顺序、focus ring 可见
- [ ] 所有 button、input、card 视觉风格与 TraeWork 一致
- [ ] 移除 `dark:` 前缀后无遗漏（grep 验证）
- [ ] 移除 emoji（如有）
- [ ] 不再有蓝色主按钮

## 8. 实施计划（待 spec 通过后展开为 plan）

```
阶段 1: Token 接入（globals.css 重写，引入 token.css、components.css）
阶段 2: 基础组件重写（button, card, input, textarea, label, badge, avatar, separator, skeleton）
阶段 3: 反馈组件（toast、tooltip、alert、progress）
阶段 4: 浮层组件（dialog, popover, dropdown-menu, alert-dialog, scroll-area）
阶段 5: 导航组件（tabs, accordion, select, switch）
阶段 6: 页面改造（首页、login、register、pricing、projects、project/[id]、admin/*）
阶段 7: 业务组件改造（app-header、project-mode-switcher、pipeline/step*、workbench、chat、editor、style-picker、model-picker、admin-users-client）
阶段 8: 全站验证（Lighthouse、截图对比、dark mode 移除、grep 清理 dark:）
```

每个阶段独立可运行、可验证；阶段间可并行；阶段 1-5 完成前页面会有过渡样式（token 已就绪但 cva 还在用 Tailwind 类）。

## 9. 验收标准

1. 全站界面风格与 `dl_builtin_trae_work/ui_kits/dashboard` 在 token/typography/spacing 上视觉一致
2. 主按钮为深灰（`#171717`）白字、圆角 8px、hover 变浅（`#404040`）
3. 页面底 `#F5F5F5`、卡片白底、圆角 12px
4. 字体：默认 14px、标题用 SF Pro/PingFang SC
5. 所有 `dark:` 前缀已移除（grep 0 命中）
6. 浏览器切换深色模式不影响页面外观
7. 所有 button/icon 满足对比度（4.5:1 / 3:1）
8. 所有 shadcn 组件 API 签名不变，业务代码 0 修改
9. 类型检查通过：`tsc --noEmit` 0 错误
10. 生产构建通过：`next build` 成功

## 10. 参考文件

- `dl_builtin_trae_work/SKILL.md` — 规范总览
- `dl_builtin_trae_work/colors_and_type.css` — 完整 token 定义
- `dl_builtin_trae_work/components.css` — `.ds-*` 组件类
- `dl_builtin_trae_work/components/{buttons,cards,forms,table,dialog,menu,tabs,tag,progress,avatar,alert,breadcrumb,pagination,skeleton}.json` — 组件契约
- `dl_builtin_trae_work/library-consumption.json` — 消费路由
- `dl_builtin_trae_work/uikit-plan.json` — UI Kit 蓝图
- `docs/superpowers/specs/2026-07-29-ui-refresh-design.md` — 上一次 UI refresh 设计（作为历史参考）
