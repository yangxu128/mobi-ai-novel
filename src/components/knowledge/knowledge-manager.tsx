"use client";

/**
 * 知识库管理界面（KNOWLEDGE 瞬态视图主容器）。
 * 左侧导航（世界观/角色/大纲/记忆 + 计数）+ 右侧内容区。
 * 记忆分区复用 MemoryTab（deletable 模式，含自动记忆开关/伏笔状态/重建）。
 */

import { useState } from "react";
import { Brain, Globe2, ListOrdered, Users } from "lucide-react";
import type { WorldSettingView, CharacterView } from "@/types/knowledge";
import type { StoryMemoryView } from "@/types/memory";
import { KbWorldSection } from "@/components/knowledge/kb-world-section";
import { KbCharacterSection } from "@/components/knowledge/kb-character-section";
import { KbOutlineSection, type OutlineItem } from "@/components/knowledge/kb-outline-section";
import { MemoryTab } from "@/components/knowledge/memory-tab";
import { cn } from "@/lib/utils";

type Section = "world" | "characters" | "outline" | "memory";

interface Props {
  project: {
    id: string;
    genre: string | null;
    worldSettings: WorldSettingView[];
    characters: CharacterView[];
    outlines: OutlineItem[];
    chapters: Array<{ id: string; title: string; outline?: { id: string } | null }>;
  };
  memory: StoryMemoryView;
}

export function KnowledgeManager({ project, memory }: Props) {
  const [section, setSection] = useState<Section>("world");

  const memoryCount =
    memory.characterStates.length + memory.foreshadows.length + memory.events.length;

  const NAV: Array<{ key: Section; label: string; icon: typeof Globe2; count: number }> = [
    { key: "world", label: "世界观", icon: Globe2, count: project.worldSettings.length },
    { key: "characters", label: "角色", icon: Users, count: project.characters.length },
    { key: "outline", label: "情节大纲", icon: ListOrdered, count: project.outlines.length },
    { key: "memory", label: "记忆", icon: Brain, count: memoryCount },
  ];

  return (
    <div className="flex h-full gap-4 p-4">
      {/* 左侧导航 */}
      <nav className="flex w-48 shrink-0 flex-col rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-2">
        {NAV.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => setSection(n.key)}
            className={cn(
              "relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors",
              section === n.key
                ? "bg-bg-overlay-l1 font-medium text-text-default"
                : "text-text-secondary hover:text-text-default"
            )}
          >
            {section === n.key && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-bg-brand" />
            )}
            <n.icon
              className={cn(
                "h-4 w-4",
                section === n.key ? "text-text-brand" : "text-text-tertiary"
              )}
            />
            <span className="flex-1">{n.label}</span>
            <span className="num text-[11px] text-text-tertiary">{n.count}</span>
          </button>
        ))}
      </nav>

      {/* 右侧内容区 */}
      <div className="min-w-0 flex-1 overflow-y-auto rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-6">
        {section === "world" && (
          <KbWorldSection
            projectId={project.id}
            genre={project.genre}
            worldSettings={project.worldSettings}
          />
        )}
        {section === "characters" && (
          <KbCharacterSection projectId={project.id} characters={project.characters} />
        )}
        {section === "outline" && (
          <KbOutlineSection
            projectId={project.id}
            outlines={project.outlines}
            characters={project.characters}
            chapters={project.chapters}
          />
        )}
        {section === "memory" && (
          <div>
            <h2 className="text-base font-semibold text-text-default">记忆</h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              LLM 从章节中自动提取的故事状态，可在此修正与清理
            </p>
            <div className="mt-4">
              <MemoryTab
                memory={memory}
                projectId={project.id}
                deletable
                activeChapterId={null}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
