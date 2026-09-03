"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreVertical, Trash2, Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { createProjectAction, deleteProjectAction } from "@/actions/project";
import { toast } from "@/components/ui/toast";
import { formatUpdatedAt, formatCount, cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StylePicker } from "@/components/style/style-picker";
import { AppSidebar } from "@/components/projects/app-sidebar";
import { modeInfo } from "@/components/projects/mode-meta";
import type { StyleProfile } from "@/lib/ai/style";

const GENRES = ["玄幻", "都市", "言情", "科幻", "悬疑", "历史", "武侠", "末世", "同人", "其他"];

const STEP_LABELS = ["灵感卡", "世界观", "角色卡", "大纲", "章节扩写", "润色定稿"];

const PAGE_SIZE = 12;

/** 模式徽标短文案（对齐设计稿：短词而非完整说明） */
function modeBadge(p: ProjectItem): string {
  if (p.mode === "PIPELINE") {
    return STEP_LABELS[p.currentStep - 1] ?? `第 ${p.currentStep} 步`;
  }
  if (p.mode === "WORKBENCH") return "自由创作";
  return "对话共创";
}

export type ProjectItem = {
  id: string;
  title: string;
  genre: string;
  mode: string;
  status: string;
  currentStep: number;
  wordCount: number;
  synopsis: string | null;
  coverImage: string | null;
  updatedAt: string;
};

/** 分页页码序列：首尾 + 当前附近，间隔用省略号 */
function pageSequence(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, 2, current - 1, current, current + 1, total - 1, total]);
  const pages = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of pages) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export function ProjectsClient({
  initialProjects,
  newOpen,
}: {
  initialProjects: ProjectItem[];
  newOpen: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [createOpen, setCreateOpen] = useState(newOpen);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  // 列表交互：搜索 / 视图 / 分页
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  // 新建表单状态
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("都市");
  const [mode, setMode] = useState<"PIPELINE" | "WORKBENCH" | "CHAT">("PIPELINE");
  const [synopsis, setSynopsis] = useState("");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  // 全书规模（可选）：给大纲规划一个整体观
  const [targetChapters, setTargetChapters] = useState("");
  const [chapterWords, setChapterWords] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.synopsis || "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "请填写标题", type: "warning" });
      return;
    }
    setCreating(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("genre", genre);
    fd.set("mode", mode);
    fd.set("synopsis", synopsis);
    if (targetChapters) fd.set("targetChapters", targetChapters);
    if (chapterWords) fd.set("chapterWords", chapterWords);
    if (styleProfile) {
      fd.set("styleProfile", JSON.stringify(styleProfile));
    }
    const res = await createProjectAction(fd);
    setCreating(false);
    if (!res.ok) {
      toast({ title: "创建失败", description: res.error, type: "error" });
      return;
    }
    toast({ title: "项目已创建", type: "success" });
    setCreateOpen(false);
    setTitle("");
    setSynopsis("");
    setStyleProfile(null);
    setTargetChapters("");
    setChapterWords("");
    router.push(`/project/${res.projectId}?view=${modeInfo[mode].query}`);
  }

  function handleDelete(id: string) {
    // 立即关闭确认框（交给 Radix 正常收尾，恢复 body 指针事件），
    // 删除在后台执行：成功才从列表移除，失败用 toast 提示。
    setDeleteId(null);
    startTransition(async () => {
      const res = await deleteProjectAction(id);
      if (res.ok) {
        toast({ title: "已移入回收站", type: "success" });
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast({ title: "删除失败", description: res.error, type: "error" });
      }
    });
  }

  return (
    <div className="flex min-h-full bg-[var(--bg-canvas)]">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10">
          {/* 页头：衬线标题 + 搜索/视图/新建 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-text-default">我的项目</h1>
              <p className="mt-1.5 text-sm text-text-tertiary">在所有模式间切换，数据自动同步</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="search-pill">
                <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="搜索项目名称或内容"
                />
              </div>
              <div className="flex h-9 items-center gap-0.5 rounded-full border border-border-neutral-l1 bg-bg-base-default p-1">
                <button
                  type="button"
                  aria-label="卡片视图"
                  onClick={() => setView("grid")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    view === "grid"
                      ? "bg-bg-overlay-l2 text-text-default"
                      : "text-text-tertiary hover:text-text-default"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="列表视图"
                  onClick={() => setView("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    view === "list"
                      ? "bg-bg-overlay-l2 text-text-default"
                      : "text-text-tertiary hover:text-text-default"
                  )}
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="h-9 rounded-xl px-4">
                <Plus className="h-4 w-4" />
                新建项目
              </Button>
            </div>
          </div>

          {/* 主体 */}
          {filtered.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border-neutral-l2 bg-bg-base-default/60 py-20 text-center">
              <p className="text-sm text-text-tertiary">
                {query
                  ? `没有找到与「${query}」匹配的项目`
                  : "还没有项目，点击右上角「新建项目」开始创作"}
              </p>
              {!query && (
                <Button onClick={() => setCreateOpen(true)} className="mt-5 h-9 rounded-xl px-4">
                  <Plus className="h-4 w-4" />
                  创建第一个项目
                </Button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paged.map((p) => (
                <ProjectCard key={p.id} p={p} onDelete={() => setDeleteId(p.id)} />
              ))}
              {/* 新建占位卡 */}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="group flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-neutral-l2 bg-bg-base-default/50 text-text-tertiary transition-colors hover:border-[#FFB877] hover:bg-bg-base-default hover:text-text-brand"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-overlay-l1 transition-colors group-hover:bg-bg-brand-popup">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">新建项目</span>
                <span className="text-xs">从此开启你的创作</span>
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-2.5">
              {paged.map((p) => (
                <ProjectRow key={p.id} p={p} onDelete={() => setDeleteId(p.id)} />
              ))}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-neutral-l2 bg-bg-base-default/50 text-sm text-text-tertiary transition-colors hover:border-[#FFB877] hover:bg-bg-base-default hover:text-text-brand"
              >
                <Plus className="h-4 w-4" />
                新建项目
              </button>
            </div>
          )}

          {/* 分页 */}
          {filtered.length > 0 && (
            <div className="mt-8 flex items-center justify-between gap-4">
              <span className="text-xs text-text-tertiary">共 {filtered.length} 个项目</span>
              {totalPages > 1 ? (
                <div className="flex items-center gap-1">
                  <PagerBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} ariaLabel="上一页">
                    ‹
                  </PagerBtn>
                  {pageSequence(safePage, totalPages).map((n, i) =>
                    n === "…" ? (
                      <span key={`e${i}`} className="px-1 text-xs text-text-tertiary">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={cn(
                          "num flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-[13px] transition-colors",
                          n === safePage
                            ? "bg-bg-brand text-text-onbrand"
                            : "text-text-secondary hover:bg-bg-overlay-l1 hover:text-text-default"
                        )}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <PagerBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} ariaLabel="下一页">
                    ›
                  </PagerBtn>
                </div>
              ) : (
                <span />
              )}
              <span className="num text-xs text-text-tertiary">{PAGE_SIZE} 条/页</span>
            </div>
          )}
        </div>
      </main>

      {/* 新建项目对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl !p-0">
          <div className="px-8 pt-7 pb-2">
            <DialogHeader>
              <DialogTitle>新建项目</DialogTitle>
              <DialogDescription>选择适合你的创作模式，后续可随时切换</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleCreate} className="space-y-5 px-8 pb-2">
            <div className="space-y-2">
              <Label>创作模式</Label>
              <div className="grid grid-cols-3 gap-3">
                {(["PIPELINE", "WORKBENCH", "CHAT"] as const).map((m) => {
                  const Icon = modeInfo[m].icon;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm transition-colors ${
                        mode === m
                          ? "border-border-neutral-l3 bg-bg-overlay-l1 text-text-default font-medium"
                          : "border-border-neutral-l1 hover:bg-bg-overlay-l1 text-text-default"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{modeInfo[m].label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-tertiary leading-relaxed">
                {mode === "PIPELINE" && "六步引导式创作，适合新手和首次创作"}
                {mode === "WORKBENCH" && "TipTap 编辑器 + 行内 AI，适合专业作者"}
                {mode === "CHAT" && "聊天式共创，零门槛，自动提取知识卡"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">小说标题</Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给小说起个名字"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>题材</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>全书规模（可选，AI 规划大纲时会据此把控整体节奏）</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={targetChapters}
                  onChange={(e) => setTargetChapters(e.target.value)}
                  placeholder="目标章节数，如 24"
                />
                <Select value={chapterWords} onValueChange={setChapterWords}>
                  <SelectTrigger>
                    <SelectValue placeholder="每章字数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1500">每章约 1500 字</SelectItem>
                    <SelectItem value="2000">每章约 2000 字</SelectItem>
                    <SelectItem value="3000">每章约 3000 字</SelectItem>
                    <SelectItem value="4000">每章约 4000 字</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="synopsis">简介（可选）</Label>
              <Textarea
                id="synopsis"
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="一两句话描述你的故事"
                rows={4}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>写作风格（可选）</Label>
              <StylePicker value={styleProfile} onChange={setStyleProfile} />
            </div>
            <DialogFooter className="px-8 pb-7 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>
              项目将移入回收站，可在回收站中恢复或彻底删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteId!)}
              disabled={pending}
            >
              {pending ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ========== 项目卡片（网格视图） ========== */

function ProjectCard({ p, onDelete }: { p: ProjectItem; onDelete: () => void }) {
  const mi = modeInfo[p.mode as keyof typeof modeInfo] ?? modeInfo.PIPELINE;
  const Icon = mi.icon;
  const isPipeline = p.mode === "PIPELINE";
  const percent = isPipeline ? Math.round((p.currentStep / 6) * 100) : null;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-6 shadow-[var(--shadow-card)] card-lift">
      {/* 整卡点击区域 */}
      <Link
        href={`/project/${p.id}?view=${mi.query}`}
        prefetch
        className="absolute inset-0 z-10 rounded-2xl"
        aria-label={`打开 ${p.title}`}
      />
      <div className="flex items-start gap-3">
        <Icon className="icon-pop mt-0.5 h-5 w-5 shrink-0 text-icon-brand" />
        <h3 className="font-display min-w-0 flex-1 truncate pt-0.5 text-[16px] font-semibold text-text-default transition-colors group-hover:text-text-brand">
          {p.title}
        </h3>
        <CardMenu onDelete={onDelete} />
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <span className="inline-flex h-6 items-center rounded-full bg-bg-overlay-l1 px-2.5 text-[11px] text-text-secondary">
          {p.genre}
        </span>
        <span className="inline-flex h-6 items-center gap-1 rounded-full px-1 text-[11px] text-text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {modeBadge(p)}
        </span>
        {percent !== null && (
          <span className="num ml-auto text-[11px] text-text-tertiary">{percent}%</span>
        )}
      </div>

      {isPipeline && (
        <div className="mt-2 inline-block h-1 w-full overflow-hidden rounded-full bg-bg-overlay-l1">
          <div
            className="brand-gradient h-full rounded-full transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <p className="mt-4 line-clamp-2 min-h-[2.6em] text-[13px] leading-relaxed text-text-tertiary">
        {p.synopsis || "暂无简介"}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-border-neutral-l1 pt-4 text-xs">
        <span className="num text-text-secondary">{formatCount(p.wordCount)} 字</span>
        <span className="text-text-tertiary">{formatUpdatedAt(p.updatedAt)} 更新</span>
      </div>
    </div>
  );
}

/* ========== 项目行（列表视图） ========== */

function ProjectRow({ p, onDelete }: { p: ProjectItem; onDelete: () => void }) {
  const mi = modeInfo[p.mode as keyof typeof modeInfo] ?? modeInfo.PIPELINE;
  const Icon = mi.icon;

  return (
    <div className="group relative flex items-center gap-4 rounded-xl border border-border-neutral-l1 bg-bg-base-default px-4 py-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <Link
        href={`/project/${p.id}?view=${mi.query}`}
        prefetch
        className="absolute inset-0 z-10 rounded-xl"
        aria-label={`打开 ${p.title}`}
      />
      <Icon className="h-5 w-5 shrink-0 text-icon-brand" />
      <h3 className="font-display w-44 shrink-0 truncate text-[16px] font-semibold text-text-default group-hover:text-text-brand">
        {p.title}
      </h3>
      <span className="hidden h-6 items-center rounded-full bg-bg-overlay-l1 px-2.5 text-[11px] text-text-secondary sm:inline-flex">
        {p.genre}
      </span>
      <span className="hidden h-6 items-center gap-1 rounded-full px-1 text-[11px] text-text-brand sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        {modeBadge(p)}
      </span>
      <p className="hidden min-w-0 flex-1 truncate text-[13px] text-text-tertiary md:block">
        {p.synopsis || "暂无简介"}
      </p>
      <span className="num ml-auto shrink-0 text-xs text-text-secondary md:ml-0">
        {formatCount(p.wordCount)} 字
      </span>
      <span className="w-24 shrink-0 text-right text-[11px] text-text-tertiary">
        {formatUpdatedAt(p.updatedAt)}
      </span>
      <CardMenu onDelete={onDelete} />
    </div>
  );
}

function CardMenu({ onDelete }: { onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="更多操作"
          className="relative z-20 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-status-error focus:text-status-error"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除项目
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PagerBtn({
  disabled,
  onClick,
  ariaLabel,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
