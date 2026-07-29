# UI 全站美化设计文档

## 背景与目标

当前墨笔 AI 写作平台界面偏朴素，组件默认样式较多，视觉层级和品牌感不足。
本次改造目标是：在功能不变的前提下，参考千问 AI 平台、Kimi、SkillHub 等工具型产品，打造**极简干净、卡片浮层、工具感强**的界面风格，提升首页转化和创作页的专业感。

## 设计原则

1. **极简干净**：减少装饰元素，依靠字号、字重、留白、卡片来构建层级。
2. **卡片浮层**：浅灰背景上放置白色圆角卡片，形成"工作台桌面"的隐喻。
3. **深色主按钮**：主操作统一使用黑色/深灰色按钮，避免蓝色主按钮。
4. **统一圆角与阴影**：大圆角（rounded-2xl 为主）、细微阴影（shadow-sm/shadow-md）。
5. **克制用色**：蓝色/靛蓝/紫罗兰仅用于小面积标签、链接、状态点缀。

## 视觉系统

| 元素 | 值 | 说明 |
|------|-----|------|
| 页面背景 | `bg-slate-50` / `bg-neutral-50` | 浅灰，让白色卡片浮起 |
| 卡片背景 | `bg-white` | 纯白 |
| 主按钮 | `bg-neutral-900 text-white hover:bg-neutral-800` | 黑色实心 |
| 次要按钮 | `border-neutral-200 bg-white hover:bg-neutral-100` | 浅灰边框 |
| 危险/删除 | `text-red-600 hover:text-red-700` / `bg-red-50` | 红色文字或浅红底 |
| 卡片圆角 | `rounded-2xl` | 统一大圆角 |
| 输入框圆角 | `rounded-xl` / `rounded-2xl` | 与卡片一致 |
| 卡片阴影 | `shadow-sm`（默认）、`shadow-md`（hover） | 柔和阴影 |
| 边框 | `border-neutral-100` / `border-neutral-200` | 极淡边框 |
| 标题字色 | `text-neutral-900` | 近黑 |
| 正文字色 | `text-neutral-600` | 中灰 |
| 辅助文字 | `text-neutral-400` | 浅灰 |
| 强调色（标签/链接） | `text-indigo-600` / `bg-indigo-50` | 小面积靛蓝 |

## 页面改造详情

### 1. 全局布局与导航

**文件**：`src/app/layout.tsx`、`src/components/app-header.tsx`

- `body` 背景改为 `bg-slate-50`。
- `AppHeader`：
  - 高度从 `h-14` 改为 `h-16`。
  - 背景改为白色，底部 `border-b border-neutral-200`。
  - Logo 区保留图标 + "墨笔"，去掉右侧副标题。
  - 未登录：「定价」「登录」用 `variant="ghost"`；「免费注册」用黑色实心按钮。
  - 已登录：「我的项目」ghost；「新建」黑色实心 + Plus 图标；头像下拉保留。
  - 所有按钮统一为 `rounded-lg`。

### 2. 首页

**文件**：`src/app/page.tsx`

- 外层容器背景浅灰。
- Hero 区整体放入一个白色大卡片：`rounded-3xl`、`shadow-sm`、内部 `p-8 lg:p-12`。
- 顶部标签：靛蓝色小圆角标签，文字 "AI 全流程协作 · 从灵感到成稿"。
- 标题：`text-4xl lg:text-5xl font-semibold tracking-tight text-neutral-900`。
- 副标题：`text-lg text-neutral-600 max-w-2xl mx-auto`。
- CTA：「免费开始创作」黑色大按钮（`size="lg" rounded-xl`）；「查看定价」浅灰 outline 大按钮。
- Hero 底部增加三步骤示意条：
  - 三个小卡片横向排列：灵感 → 世界观 → 章节
  - 每张卡片带图标、标题、一行说明
  - 卡片间用细箭头连接
- 「三种创作模式」区域：
  - 标题 `text-3xl font-semibold`
  - 三列卡片网格，每张卡片 `rounded-2xl`、白色底、`shadow-sm`
  - 卡片顶部放置彩色微标：流水线（琥珀 `amber`）、工作台（靛蓝 `indigo`）、对话（紫罗兰 `violet`）
  - 标题下方一行描述，CardContent 内用列表展示 2-3 个能力点
- 「核心能力」区域：
  - 同样改为白色卡片网格
  - 图标区域使用对应强调色的浅色背景
- 底部 CTA：白色圆角卡片，黑色按钮

### 3. 项目列表页

**文件**：`src/app/projects/page.tsx`、`src/components/projects/projects-client.tsx`

- 页面背景浅灰。
- 顶部标题区用白色卡片包裹：`rounded-2xl`、`shadow-sm`、内部 flex 两端对齐。
  - 左侧：「我的项目」+ 项目数或副标题
  - 右侧：「新建项目」黑色按钮
- 项目卡片网格：
  - 每张卡片 `bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow`
  - 卡片顶部：项目名 + 模式标签（流水线/工作台/对话）
  - 中部：项目描述或「暂无描述」
  - 底部：更新日期 + 操作按钮（「进入工作台」黑色小按钮，删除用红色文字按钮）
- 空状态：居中白色卡片，内含图标、标题、黑色 CTA 按钮。
- Loading 状态：`src/app/projects/loading.tsx` 同步更新骨架屏样式，保持圆角卡片感。

### 4. 工作台 / 编辑器页

**文件**：`src/app/editor/[projectId]/page.tsx`、`src/components/workbench/workbench-client.tsx`、`src/components/editor/tiptap-editor.tsx`、`src/components/knowledge/knowledge-sidebar.tsx`

- 外层浅灰背景，中间内容区白色底 `rounded-2xl`。
- 顶部面包屑栏：
  - 背景白色，底部 `border-b border-neutral-100`
  - 项目名称 `font-medium`，模式切换器样式统一为 outline
- 三栏布局：
  - 左侧章节树：白色卡片、`rounded-2xl`、细边框
  - 中间编辑区：白色卡片、`rounded-2xl`、更大的内边距
  - 右侧知识库：白色卡片、`rounded-2xl`
- AI 辅助按钮（润色/扩写/续写）：做成 pill 形状小标签组，黑色/靛蓝小按钮
- 编辑器工具栏：使用浅灰背景 `bg-neutral-50`，圆角工具条

### 5. 流水线页

**文件**：`src/app/pipeline/[projectId]/page.tsx`、`src/components/pipeline/*`

- 整体背景浅灰。
- 步骤导航改用横向步骤条，当前步骤高亮（黑色或靛蓝），已完成步骤为中性灰。
- 每个步骤内容区用白色大卡片包裹：`rounded-2xl`、`shadow-sm`。
- 输入框、文本域统一 `rounded-xl`。
- 操作按钮：「下一步」黑色实心，「上一步」浅灰 outline。

### 6. 对话共创页

**文件**：`src/app/chat/[projectId]/page.tsx`、`src/components/chat/chat-cocreate-client.tsx`

- 外层浅灰背景。
- 聊天主区和右侧侧栏分别用白色卡片 `rounded-2xl`。
- 顶部操作栏：白色底、底部细线、按钮改为黑色实心 + outline。
- 用户消息气泡：黑色底白字（`bg-neutral-900 text-white`）。
- AI 消息气泡：浅灰底（`bg-neutral-100 text-neutral-800`）。
- 输入框区域：白色底、顶部细线、输入框 `rounded-2xl`、带柔和阴影。
- 右侧「已识别设定」卡片：小标题加粗、Badge 使用靛蓝/紫罗兰浅色底。

### 7. 定价页

**文件**：`src/app/pricing/page.tsx`

- 页面背景浅灰。
- 定价卡片网格：
  - 每张卡片 `bg-white rounded-2xl shadow-sm`
  - 推荐方案用黑色顶条或黑色边框标识
  - 价格数字 `text-4xl font-bold`
  - 权益列表使用中性色对勾图标
  - CTA 按钮：推荐方案黑色实心，其他方案 outline

### 8. 管理后台

**文件**：`src/app/admin/*`、`src/components/admin/*`

- 页面背景浅灰。
- 左侧 `AdminSidebar`：白色卡片、`rounded-2xl`、当前项黑色背景或靛蓝背景。
- 右侧内容区：白色卡片 `rounded-2xl`、`shadow-sm`。
- 数据表格：
  - 表头 `bg-neutral-50`、文字 `text-neutral-600`
  - 行 hover `bg-neutral-50`
  - 操作链接使用靛蓝色
  - 分页按钮统一为 outline 小按钮

## 组件级调整

### Button

- 不修改 shadcn Button 组件源码，使用时通过 `className` 或 `variant` 控制。
- 全局主操作统一使用 `className="bg-neutral-900 hover:bg-neutral-800 text-white"`。
- 若多次出现，可在项目中定义一个 `<PrimaryButton />` 包装组件（可选，视实现而定）。

### Card

- shadcn Card 默认圆角较小，本次通过 `className="rounded-2xl shadow-sm"` 在使用处覆盖。
- 不修改 Card 组件本身，保持 shadcn 默认升级友好。

### Input / Textarea

- 统一 `rounded-xl` 或 `rounded-2xl`。
- focus 状态 ring 颜色保持默认 primary（靛蓝/系统色），与点缀色一致。

### Badge

- 模式标签：流水线 `bg-amber-100 text-amber-700`，工作台 `bg-indigo-100 text-indigo-700`，对话 `bg-violet-100 text-violet-700`。
- 状态标签：生效中 `bg-emerald-100 text-emerald-700`。

## 响应式策略

- 移动端保持现有响应式断点，卡片网格在 `md` 以下改为单列。
- 大圆角和阴影在移动端保持不变，内边距适当缩小。
- 导航在移动端折叠为汉堡菜单（当前已有逻辑则保留）。

## 验收标准

- [ ] 所有页面背景改为浅灰，内容区使用白色圆角卡片。
- [ ] 主按钮统一为黑色/深灰色，无蓝色主按钮。
- [ ] 卡片统一使用 `rounded-2xl` 和柔和阴影。
- [ ] 首页 Hero 区有大卡片包裹，底部有三步骤示意。
- [ ] 项目列表、工作台、对话、流水线、定价、后台视觉风格一致。
- [ ] 无明显视觉回归（如文字截断、按钮重叠、卡片错位）。
- [ ] 类型检查通过（`npm run typecheck` 或 `next build` 无 TS 错误）。

## 参考产品

- 千问 AI 平台：控制台式卡片布局、浅灰背景、表格质感。
- Kimi：极简白色、大圆角输入框、柔和阴影。
- SkillHub：顶部导航、卡片网格、标签系统。

## 影响范围

主要修改以下文件：

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/projects/page.tsx`
- `src/app/projects/loading.tsx`
- `src/components/app-header.tsx`
- `src/components/projects/projects-client.tsx`
- `src/app/editor/[projectId]/page.tsx`
- `src/components/workbench/workbench-client.tsx`
- `src/components/editor/tiptap-editor.tsx`
- `src/components/knowledge/knowledge-sidebar.tsx`
- `src/app/pipeline/[projectId]/page.tsx`
- `src/components/pipeline/*.tsx`
- `src/app/chat/[projectId]/page.tsx`
- `src/components/chat/chat-cocreate-client.tsx`
- `src/app/pricing/page.tsx`
- `src/app/admin/**/*.tsx`
- `src/components/admin/*.tsx`
