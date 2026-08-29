"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Workflow, PenLine, MessageSquare, Plus, MoreVertical, Trash2 } from "lucide-react";
import { createProjectAction, deleteProjectAction } from "@/actions/project";
import { toast } from "@/components/ui/toast";
import { formatDate, formatWordCount } from "@/lib/utils";
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
import type { StyleProfile } from "@/lib/ai/style";

const GENRES = ["玄幻", "都市", "言情", "科幻", "悬疑", "历史", "武侠", "末世", "同人", "其他"];

const modeInfo = {
  PIPELINE: { label: "流水线", icon: Workflow, query: "pipeline" },
  WORKBENCH: { label: "工作台", icon: PenLine, query: "workbench" },
  CHAT: { label: "对话共创", icon: MessageSquare, query: "chat" },
} as const;

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

  // 新建表单状态
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("都市");
  const [mode, setMode] = useState<"PIPELINE" | "WORKBENCH" | "CHAT">("PIPELINE");
  const [synopsis, setSynopsis] = useState("");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);

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
    router.push(`/project/${res.projectId}?view=${modeInfo[mode].query}`);
  }

  function handleDelete(e?: React.MouseEvent) {
    // 阻止 AlertDialogAction 自动关闭对话框，等异步删除完成后再手动关闭
    e?.preventDefault();
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteProjectAction(deleteId);
      if (res.ok) {
        toast({ title: "已删除", type: "success" });
        setProjects((prev) => prev.filter((p) => p.id !== deleteId));
        setDeleteId(null);
      } else {
        toast({ title: "删除失败", description: res.error, type: "error" });
      }
    });
  }

  return (
    <div className="container py-8">
      <div className="bg-bg-base-default rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-default">我的项目</h1>
          <p className="text-sm text-text-tertiary mt-1">在所有模式间切换，数据自动同步</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          新建项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
          <CardContent className="py-16 text-center">
            <p className="text-text-tertiary mb-4">还没有项目，点击右上角&ldquo;新建项目&rdquo;开始创作</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              创建第一个项目
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const mi = modeInfo[p.mode as keyof typeof modeInfo];
            const Icon = mi.icon;
            return (
              <Card key={p.id} className="rounded-2xl border-border-neutral-l1 shadow-sm hover:shadow-md transition-shadow group bg-bg-base-default">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/project/${p.id}?view=${mi.query}`}
                      prefetch={true}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-7 w-7 rounded-lg bg-bg-overlay-l1 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-text-secondary" />
                        </div>
                        <CardTitle className="text-base truncate">{p.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span>{p.genre}</span>
                        <span>·</span>
                        <span>{mi.label}</span>
                        {p.mode === "PIPELINE" && (
                          <>
                            <span>·</span>
                            <span>第 {p.currentStep}/6 步</span>
                          </>
                        )}
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-status-error focus:text-status-error"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除项目
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-tertiary line-clamp-2 min-h-[2.5rem]">
                    {p.synopsis || "暂无简介"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-text-tertiary mt-3 pt-3 border-t border-border-neutral-l1">
                    <span>{formatWordCount(p.wordCount)}</span>
                    <span>{formatDate(p.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
              项目及其所有世界观、角色卡、大纲、章节稿将永久删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
