"use client";

/**
 * 回收站：软删除的项目列表，支持恢复 / 彻底删除。
 */

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Undo2, Trash } from "lucide-react";
import { restoreProjectAction, purgeProjectAction } from "@/actions/project";
import { toast } from "@/components/ui/toast";
import { formatDateTime, formatCount, cn } from "@/lib/utils";
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
import { AppSidebar } from "@/components/projects/app-sidebar";
import { modeInfo } from "@/components/projects/mode-meta";

type TrashItem = {
  id: string;
  title: string;
  genre: string;
  mode: string;
  wordCount: number;
  synopsis: string | null;
  deletedAt: string;
};

export function TrashClient({ initialProjects }: { initialProjects: TrashItem[] }) {
  const [items, setItems] = useState<TrashItem[]>(initialProjects);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function restore(id: string) {
    startTransition(async () => {
      const res = await restoreProjectAction(id);
      if (res.ok) {
        toast({ title: "已恢复到我的项目", type: "success" });
        setItems((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast({ title: "恢复失败", description: res.error, type: "error" });
      }
    });
  }

  function purge(id: string) {
    // 先关确认框再后台执行，避免 Radix 指针锁竞态
    setPurgeId(null);
    startTransition(async () => {
      const res = await purgeProjectAction(id);
      if (res.ok) {
        toast({ title: "已彻底删除", type: "success" });
        setItems((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast({ title: "删除失败", description: res.error, type: "error" });
      }
    });
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--bg-canvas)] md:flex-row">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 md:w-auto">
        <div className="mx-auto max-w-[1000px] px-6 py-8 lg:px-10">
          <h1 className="font-display text-3xl font-bold text-text-default">回收站</h1>
          <p className="mt-1.5 text-sm text-text-tertiary">
            已删除的项目保留在此，可恢复或彻底删除
          </p>

          {items.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border-neutral-l2 bg-bg-base-default/60 py-20 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-overlay-l1">
                <Trash2 className="h-5 w-5 text-text-tertiary" />
              </span>
              <p className="mt-4 text-sm text-text-tertiary">回收站是空的</p>
            </div>
          ) : (
            <div className="mt-6 space-y-2.5">
              {items.map((p) => {
                const mi = modeInfo[p.mode as keyof typeof modeInfo] ?? modeInfo.PIPELINE;
                const Icon = mi.icon;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 rounded-xl border border-border-neutral-l1 bg-bg-base-default px-4 py-3 shadow-[var(--shadow-card)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-brand-popup text-icon-brand opacity-80">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display truncate text-[15px] font-semibold text-text-default">
                        {p.title}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {p.genre} · {formatCount(p.wordCount)} 字 · 删除于 {formatDateTime(p.deletedAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => restore(p.id)}
                      className="shrink-0"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      恢复
                    </Button>
                    <Button
                      variant="danger-subtle"
                      size="sm"
                      disabled={pending}
                      onClick={() => setPurgeId(p.id)}
                      className={cn("shrink-0")}
                    >
                      <Trash className="h-3.5 w-3.5" />
                      彻底删除
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!purgeId} onOpenChange={(o) => !o && setPurgeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>彻底删除项目？</AlertDialogTitle>
            <AlertDialogDescription>
              项目及其所有世界观、角色卡、大纲、章节稿将被永久删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => purge(purgeId!)} disabled={pending}>
              {pending ? "删除中..." : "彻底删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
