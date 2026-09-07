"use client";

/**
 * 工作台/对话页右侧知识库面板：搜索过滤 + 四页签直接管理。
 * 人物设定 / 世界观 / 情节大纲页签嵌入 Kb 分区组件（新增/编辑/删除），
 * 记忆页签复用 MemoryTab（LLM wiki，含自动记忆开关/伏笔状态/重建）。
 * 搜索框过滤传入各分区的数据，实现「浏览即管理」。
 */

import { memo, useState } from "react";
import { Search } from "lucide-react";
import type { WorldSettingView, CharacterView } from "@/types/knowledge";
import type { StoryMemoryView } from "@/types/memory";
import { MemoryTab } from "@/components/knowledge/memory-tab";
import { KbWorldSection } from "@/components/knowledge/kb-world-section";
import { KbCharacterSection } from "@/components/knowledge/kb-character-section";
import { KbOutlineSection, type OutlineItem } from "@/components/knowledge/kb-outline-section";
import { cn } from "@/lib/utils";

type KbTab = "chars" | "world" | "outline" | "memory";

/** memory 未传时的类型安全兜底（服务端目前总是构造完整对象） */
const EMPTY_MEMORY: StoryMemoryView = {
  autoMemory: false,
  characterStates: [],
  foreshadows: [],
  events: [],
};

export const KnowledgeSidebarCompact = memo(function KnowledgeSidebarCompact({
  worldSettings,
  characters,
  outlines,
  chapters,
  genre,
  projectId,
  memory,
  activeChapterId,
}: {
  worldSettings: WorldSettingView[];
  characters: CharacterView[];
  /** 全量大纲（情节大纲页签可管理全部条目） */
  outlines: OutlineItem[];
  /** 章节（大纲分区判断「已关联章节」徽标用） */
  chapters: Array<{ id: string; title: string; outline?: { id: string } | null }>;
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
  const filteredOutlines = q
    ? outlines.filter((o) =>
        `${o.sceneTitle} ${o.sceneSummary} ${o.foreshadowing || ""}`
          .toLowerCase()
          .includes(q)
      )
    : outlines;

  const countByTab: Record<KbTab, number> = {
    chars: filteredChars.length,
    world: filteredWorld.length,
    outline: filteredOutlines.length,
    memory:
      (memory?.characterStates.length || 0) +
      (memory?.foreshadows.length || 0) +
      (memory?.events.length || 0),
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
            placeholder="搜索设定、人物、大纲..."
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

      {/* 分区内容：直接嵌入可编辑的 Kb 分区组件 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "chars" && (
          <KbCharacterSection
            projectId={projectId}
            characters={filteredChars}
            embedded
          />
        )}

        {tab === "world" && (
          <KbWorldSection
            projectId={projectId}
            genre={genre}
            worldSettings={filteredWorld}
            embedded
          />
        )}

        {tab === "outline" && (
          <KbOutlineSection
            projectId={projectId}
            outlines={filteredOutlines}
            characters={characters}
            chapters={chapters}
            embedded
          />
        )}

        {tab === "memory" && (
          // 始终渲染 MemoryTab：空态展示与"自动记忆/更新本章/重建"操作栏
          // 都在其内部，记忆为空时不能只渲染空提示（否则操作入口消失）
          <MemoryTab
            memory={memory ?? EMPTY_MEMORY}
            projectId={projectId}
            activeChapterId={activeChapterId ?? null}
            deletable
          />
        )}
      </div>
    </div>
  );
});
