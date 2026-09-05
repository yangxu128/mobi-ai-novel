"use client";

/**
 * 知识库"记忆"页签：展示 LLM wiki 提取的故事状态。
 * - 角色状态卡（所在地/处境/目标/关系动态，随剧情滚动更新）
 * - 伏笔登记表（待回收/已回收/已放弃，可手动切换状态）
 * - 事件时间线（按章节号分组，关键事件标记主线）
 * 操作：自动记忆开关、单章强制更新、游标式重建。
 */

import { useState, useTransition } from "react";
import {
  Brain,
  RefreshCw,
  RotateCcw,
  MapPin,
  Target,
  Heart,
  AlertCircle,
} from "lucide-react";
import type { StoryMemoryView, ForeshadowView } from "@/types/memory";
import type { CharacterStateCurrent } from "@/types/memory";
import { roleLabel, foreshadowStatusLabel } from "@/lib/knowledge/labels";
import {
  updateChapterWikiAction,
  rebuildProjectMemoryAction,
  setForeshadowStatusAction,
  toggleAutoMemoryAction,
} from "@/actions/wiki";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface Props {
  memory: StoryMemoryView;
  projectId: string;
  /** 当前编辑章节 id（工作台模式下传入，用于"更新本章记忆"） */
  activeChapterId?: string | null;
}

export function MemoryTab({ memory, projectId, activeChapterId }: Props) {
  const [autoMemory, setAutoMemory] = useState(memory.autoMemory);
  const [updating, setUpdating] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [, startTransition] = useTransition();

  async function onToggleAuto(enabled: boolean) {
    setAutoMemory(enabled);
    const res = await toggleAutoMemoryAction(projectId, enabled);
    if (!res.ok) {
      setAutoMemory(!enabled);
      toast({ title: "设置失败", description: res.error, type: "error" });
    }
  }

  async function onUpdateChapter() {
    if (!activeChapterId) return;
    setUpdating(true);
    try {
      const res = await updateChapterWikiAction(activeChapterId);
      if (res.ok) {
        toast({ title: "本章记忆已更新", type: "success" });
      } else {
        toast({ title: "更新失败", description: res.error, type: "error" });
      }
    } finally {
      setUpdating(false);
    }
  }

  async function onRebuild() {
    if (!window.confirm("将清空现有记忆并按章节顺序重新提取（每章消耗一次 AI 配额），确定重建？")) {
      return;
    }
    setRebuilding(true);
    try {
      let cursor = 0;
      // 游标循环：每次 1 章，直到 done 或出错（配额不足）
      for (;;) {
        const res = await rebuildProjectMemoryAction(projectId, cursor);
        setProgress({ processed: res.processed, total: res.total });
        if (!res.ok) {
          toast({ title: "重建中断", description: res.error, type: "error" });
          break;
        }
        if (res.done) {
          toast({ title: "记忆重建完成", type: "success" });
          break;
        }
        cursor = res.processed;
      }
    } finally {
      setRebuilding(false);
    }
  }

  function onForeshadowStatus(f: ForeshadowView, status: ForeshadowView["status"]) {
    startTransition(async () => {
      const res = await setForeshadowStatusAction(f.id, status);
      if (!res.ok) {
        toast({ title: "状态更新失败", description: res.error, type: "error" });
      }
    });
  }

  const hasAny =
    memory.characterStates.length > 0 ||
    memory.foreshadows.length > 0 ||
    memory.events.length > 0;

  return (
    <div className="space-y-3">
      {/* 操作栏 */}
      <div className="rounded-xl border border-border-neutral-l1 bg-bg-base-secondary p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-text-brand" />
            <span className="text-xs font-medium text-text-default">自动记忆</span>
          </div>
          <Switch checked={autoMemory} onCheckedChange={onToggleAuto} />
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-text-tertiary">
          保存章节后自动提取摘要、事件、角色状态与伏笔（配额不足时静默跳过）
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={!activeChapterId || updating}
            onClick={onUpdateChapter}
          >
            <RefreshCw className={cn("h-3 w-3", updating && "animate-spin")} />
            更新本章记忆
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={rebuilding}
            onClick={onRebuild}
          >
            <RotateCcw className={cn("h-3 w-3", rebuilding && "animate-spin")} />
            {rebuilding
              ? `重建中 ${progress.processed}/${progress.total || "?"}`
              : "重建记忆"}
          </Button>
        </div>
      </div>

      {!hasAny && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-overlay-l1">
            <Brain className="h-5 w-5 text-text-tertiary" />
          </span>
          <p className="mt-3 text-xs font-medium text-text-secondary">暂无记忆</p>
          <p className="mt-1 max-w-[200px] text-[10px] leading-relaxed text-text-tertiary">
            保存章节后自动提取；也可在编辑章节时手动更新
          </p>
        </div>
      )}

      {/* 角色状态卡 */}
      {memory.characterStates.length > 0 && (
        <Section title={`角色状态（${memory.characterStates.length}）`}>
          {memory.characterStates.map((s) => {
            const cur = s.current as CharacterStateCurrent;
            return (
              <div
                key={s.characterId}
                className="kb-card"
              >
                <div className="flex items-center gap-2">
                  <span className="brand-gradient flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-text-onbrand">
                    {s.characterName.slice(0, 1)}
                  </span>
                  <span className="text-xs font-semibold text-text-default">{s.characterName}</span>
                  {s.role && (
                    <span className="rounded bg-bg-overlay-l1 px-1.5 py-0.5 text-[10px] text-text-tertiary">
                      {roleLabel[s.role] || s.role}
                    </span>
                  )}
                  {cur.lastSeenChapterNo != null && cur.lastSeenChapterNo > 0 && (
                    <span className="ml-auto text-[10px] text-text-tertiary">
                      第{cur.lastSeenChapterNo}章
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  {cur.location && (
                    <p className="flex items-start gap-1 text-[11px] leading-relaxed text-text-tertiary">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      {cur.location}
                    </p>
                  )}
                  {cur.status && (
                    <p className="flex items-start gap-1 text-[11px] leading-relaxed text-text-tertiary">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      {cur.status}
                    </p>
                  )}
                  {cur.goal && (
                    <p className="flex items-start gap-1 text-[11px] leading-relaxed text-text-tertiary">
                      <Target className="mt-0.5 h-3 w-3 shrink-0" />
                      {cur.goal}
                    </p>
                  )}
                  {(cur.relations || []).length > 0 && (
                    <div className="flex items-start gap-1 text-[11px] leading-relaxed text-text-tertiary">
                      <Heart className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        {(cur.relations || [])
                          .slice(-3)
                          .map(
                            (r) =>
                              `对${r.target}：${r.change}`
                          )
                          .join("；")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* 伏笔登记表 */}
      {memory.foreshadows.length > 0 && (
        <Section title={`伏笔（${memory.foreshadows.length}）`}>
          {memory.foreshadows.map((f) => (
            <div
              key={f.id}
              className="kb-card"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                    f.status === "open" && "bg-bg-brand-popup text-text-brand",
                    f.status === "resolved" && "bg-bg-overlay-l1 text-text-tertiary",
                    f.status === "abandoned" && "bg-bg-overlay-l1 text-text-tertiary line-through"
                  )}
                >
                  {foreshadowStatusLabel[f.status] || f.status}
                </span>
                <span className="truncate text-xs font-medium text-text-default">{f.title}</span>
                {f.plantedChapterNo != null && (
                  <span className="ml-auto shrink-0 text-[10px] text-text-tertiary">
                    第{f.plantedChapterNo}章埋
                  </span>
                )}
              </div>
              {f.content && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-tertiary">
                  {f.content}
                </p>
              )}
              {f.status === "open" && (
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    className="rounded-md border border-border-neutral-l2 px-2 py-0.5 text-[10px] text-text-secondary transition-all hover:bg-bg-overlay-l1 focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none active:scale-95"
                    onClick={() => onForeshadowStatus(f, "resolved")}
                  >
                    标记已回收
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border-neutral-l2 px-2 py-0.5 text-[10px] text-text-secondary transition-all hover:bg-bg-overlay-l1 focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none active:scale-95"
                    onClick={() => onForeshadowStatus(f, "abandoned")}
                  >
                    放弃
                  </button>
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* 事件时间线 */}
      {memory.events.length > 0 && (
        <Section title={`事件时间线（${memory.events.length}）`}>
          <div className="rounded-xl border border-border-neutral-l1 bg-bg-base-secondary p-3">
            {memory.events
              .slice()
              .reverse()
              .map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-2 border-b border-border-neutral-l1 py-1.5 last:border-0 last:pb-0 first:pt-0"
                >
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                      e.source === "chat"
                        ? "bg-bg-overlay-l1 text-text-tertiary"
                        : "bg-bg-brand-popup text-text-brand"
                    )}
                  >
                    {e.source === "chat"
                      ? "对话阶段"
                      : e.chapterNo > 0
                        ? `第${e.chapterNo}章`
                        : "未排序"}
                  </span>
                  <p className="text-[11px] leading-relaxed text-text-secondary">
                    {e.key && <span className="mr-1 font-semibold text-text-brand">[主线]</span>}
                    {e.content}
                  </p>
                </div>
              ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 px-1 text-[11px] font-semibold text-text-secondary">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
