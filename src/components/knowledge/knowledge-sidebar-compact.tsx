"use client";

/**
 * 工作台右侧知识库面板（只读展示 + 搜索过滤）。
 * 页签：人物设定 / 世界观 / 情节大纲（仅当前章节关联的大纲）/ 记忆（LLM wiki）。
 * 底部为管理知识库入口。
 */

import { memo, useState } from "react";
import Link from "next/link";
import { Feather, Search, LibraryBig } from "lucide-react";
import type { WorldSettingView, CharacterView } from "@/types/knowledge";
import type { StoryMemoryView } from "@/types/memory";
import { getCategoryLabel, roleLabel } from "@/lib/knowledge/labels";
import { MemoryTab } from "@/components/knowledge/memory-tab";
import { cn } from "@/lib/utils";

type KbTab = "chars" | "world" | "outline" | "memory";

interface ActiveOutline {
  sceneTitle?: string | null;
  sceneSummary?: string | null;
  plotPoints?: unknown;
  volume?: number | null;
}

const CN_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function volumeLabel(n: number | null | undefined): string {
  if (n == null) return "未分卷";
  if (n <= 0) return `卷${n}`;
  if (n <= 10) return `卷${CN_NUM[n] || n}`;
  if (n < 20) return `卷十${CN_NUM[n - 10] || ""}`;
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `卷${CN_NUM[t]}十${u ? CN_NUM[u] : ""}`;
  }
  return `卷${n}`;
}

function plotPointCount(pp: unknown): number | null {
  if (Array.isArray(pp)) return pp.length;
  if (typeof pp === "string") {
    try {
      const parsed = JSON.parse(pp);
      return Array.isArray(parsed) ? parsed.length : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const KnowledgeSidebarCompact = memo(function KnowledgeSidebarCompact({
  worldSettings,
  characters,
  activeOutline,
  genre,
  projectId,
  memory,
  activeChapterId,
}: {
  worldSettings: WorldSettingView[];
  characters: CharacterView[];
  /** 当前编辑章节关联的大纲（仅展示这一条） */
  activeOutline: ActiveOutline | null;
  genre?: string | null;
  projectId: string;
  /** 记忆 wiki（事件/角色状态/伏笔） */
  memory?: StoryMemoryView;
  /** 当前编辑章节 id（"更新本章记忆"按钮用） */
  activeChapterId?: string | null;
}) {
  const [tab, setTab] = useState<KbTab>("chars");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredChars = q
    ? characters.filter((c) =>
        `${c.name} ${c.personality || ""} ${c.background || ""}`
          .toLowerCase()
          .includes(q)
      )
    : characters;
  const filteredWorld = q
    ? worldSettings.filter((w) =>
        `${w.title} ${typeof w.content === "string" ? w.content : ""}`
          .toLowerCase()
          .includes(q)
      )
    : worldSettings;
  // 情节大纲：只显示当前章节关联的大纲
  const currentOutline =
    activeOutline && (!q || `${activeOutline.sceneTitle || ""} ${activeOutline.sceneSummary || ""}`.toLowerCase().includes(q))
      ? activeOutline
      : null;

  const countByTab: Record<KbTab, number> = {
    chars: filteredChars.length,
    world: filteredWorld.length,
    outline: currentOutline ? 1 : 0,
    memory:
      (memory?.characterStates.length || 0) +
      (memory?.foreshadows.length || 0) +
      (memory?.events.length || 0),
  };
  const emptyByTab: Record<KbTab, string> = {
    chars: "暂无角色卡，可在流水线的「角色卡」步骤中添加",
    world: "暂无世界观内容，可在流水线的「世界观」步骤中添加",
    outline: "本章暂无关联大纲，可在流水线的「大纲」步骤中生成",
    memory: "暂无记忆，保存章节后自动提取",
  };

  return (
    <div className="flex h-full flex-col">
      {/* 知识库头 + 搜索 */}
      <div className="px-4 pt-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-default">知识库</h2>
          <span className="num text-[11px] text-text-tertiary">{countByTab[tab]} 条</span>
        </div>
        <div className="search-pill search-pill--full mt-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索设定、人物、世界观..."
          />
        </div>
      </div>

      {/* 页签 */}
      <div className="mt-1 flex items-center gap-4 border-b border-border-neutral-l1 px-4">
        <button
          type="button"
          className={cn("kb-tab", tab === "chars" && "is-active")}
          onClick={() => setTab("chars")}
        >
          人物设定
        </button>
        <button
          type="button"
          className={cn("kb-tab", tab === "world" && "is-active")}
          onClick={() => setTab("world")}
        >
          世界观
        </button>
        <button
          type="button"
          className={cn("kb-tab", tab === "outline" && "is-active")}
          onClick={() => setTab("outline")}
        >
          情节大纲
        </button>
        <button
          type="button"
          className={cn("kb-tab", tab === "memory" && "is-active")}
          onClick={() => setTab("memory")}
        >
          记忆
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "chars" &&
          (filteredChars.length === 0 ? (
            <KbEmpty hint={q ? "没有匹配的角色" : emptyByTab.chars} />
          ) : (
            <div className="space-y-2">
              {filteredChars.map((c) => (
                <div
                  key={c.id}
                  className="kb-card"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-text-onbrand">
                      {c.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-text-default">{c.name}</div>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="rounded bg-bg-brand-popup px-1.5 py-0.5 text-[10px] text-text-brand">
                          {roleLabel[c.role] || c.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  {c.personality && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-tertiary">
                      {c.personality}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

        {tab === "world" &&
          (filteredWorld.length === 0 ? (
            <KbEmpty hint={q ? "没有匹配的设定" : emptyByTab.world} />
          ) : (
            <div className="space-y-2">
              {filteredWorld.map((w) => (
                <div
                  key={w.id}
                  className="kb-card"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-bg-overlay-l1 px-1.5 py-0.5 text-[10px] text-text-tertiary">
                      {getCategoryLabel(
                        w.category,
                        genre,
                        `${w.title} ${typeof w.content === "string" ? w.content : ""}`
                      )}
                    </span>
                    <span className="truncate text-xs font-medium text-text-default">{w.title}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-tertiary">
                    {typeof w.content === "string"
                      ? w.content
                      : (w.content as { text?: string })?.text || JSON.stringify(w.content)}
                  </p>
                </div>
              ))}
            </div>
          ))}

        {tab === "outline" &&
          (!currentOutline ? (
            <KbEmpty hint={q ? "没有匹配的大纲" : emptyByTab.outline} />
          ) : (
            (() => {
              const o = currentOutline;
              const points = plotPointCount(o.plotPoints);
              return (
                <div className="kb-card">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 rounded bg-bg-brand-popup px-1.5 py-0.5 text-[10px] text-text-brand">
                      {volumeLabel(o.volume)}
                    </span>
                    {o.sceneTitle && (
                      <span className="truncate text-xs font-medium text-text-default">
                        {o.sceneTitle}
                      </span>
                    )}
                  </div>
                  {o.sceneSummary && (
                    <p className="mt-1.5 text-xs leading-relaxed text-text-tertiary">
                      {o.sceneSummary}
                    </p>
                  )}
                  {points != null && points > 0 && (
                    <div className="mt-1.5 text-[10px] text-text-tertiary">
                      {points} 个情节要点
                    </div>
                  )}
                </div>
              );
            })()
          ))}

        {tab === "memory" &&
          (!memory || countByTab.memory === 0 ? (
            <KbEmpty hint={emptyByTab.memory} />
          ) : (
            <MemoryTab
              memory={memory}
              projectId={projectId}
              activeChapterId={activeChapterId ?? null}
            />
          ))}
      </div>

      {/* 管理知识库入口：跳转流水线（世界观/角色卡步骤） */}
      <div className="border-t border-border-neutral-l1 p-3">
        <Link
          href={`/project/${projectId}?view=pipeline`}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border-neutral-l2 text-xs font-medium text-text-default transition-colors hover:bg-bg-overlay-l1"
        >
          <LibraryBig className="h-3.5 w-3.5 text-text-tertiary" />
          管理知识库
        </Link>
      </div>
    </div>
  );
});

function KbEmpty({ hint }: { hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-overlay-l1">
        <Feather className="h-6 w-6 text-text-tertiary" />
      </span>
      <p className="mt-4 text-sm font-medium text-text-secondary">暂无内容</p>
      <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-text-tertiary">{hint}</p>
    </div>
  );
}
