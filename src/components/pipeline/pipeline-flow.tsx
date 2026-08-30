"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProjectStepAction } from "@/actions/project";
import { Step1Inspire } from "./step1-inspire";
import { Step2Worldbuild } from "./step2-worldbuild";
import { Step3Character } from "./step3-character";
import { Step4Outline } from "./step4-outline";
import { Step5Expand } from "./step5-expand";
import { Step6Polish } from "./step6-polish";

const STEPS = [
  { key: 1, label: "灵感卡", desc: "AI 生成 3 张灵感卡" },
  { key: 2, label: "世界观", desc: "构建世界观框架" },
  { key: 3, label: "角色卡", desc: "创建主角与配角" },
  { key: 4, label: "大纲", desc: "生成结构化大纲" },
  { key: 5, label: "章节扩写", desc: "AI 流式扩写章节" },
  { key: 6, label: "润色定稿", desc: "润色与一致性检查" },
];

interface Props {
  project: {
    id: string;
    title: string;
    genre: string;
    synopsis: string | null;
    currentStep: number;
    worldSettings: Array<{
      id: string;
      category: string;
      title: string;
      content: unknown;
    }>;
    characters: Array<{
      id: string;
      name: string;
      role: string;
      appearance?: string | null;
      personality?: string | null;
      background?: string | null;
      motivation?: string | null;
      arc?: string | null;
    }>;
    outlines: Array<{
      id: string;
      volume: number;
      chapter: number;
      sceneTitle: string;
      sceneSummary: string;
      povCharacterId: string | null;
      plotPoints: unknown;
      foreshadowing: string | null;
      order: number;
    }>;
    chapters: Array<{
      id: string;
      title: string;
      content: string;
      wordCount: number;
      status: string;
      outline?: {
        id: string;
        sceneTitle: string;
        sceneSummary: string;
        plotPoints: string[];
      } | null;
    }>;
  };
  worldSummary: string;
  characterSummary: string;
}

export function PipelineFlowImpl({ project, worldSummary, characterSummary }: Props) {
  const [step, setStep] = useState(project.currentStep || 1);

  // 各步骤产出数据的本地副本：SSR props 是首屏快照，
  // 步骤保存后通过 "pipeline-step-next" 事件的 detail 同步到这里，后续步骤无需刷新页面
  const [synopsis, setSynopsis] = useState(project.synopsis || "");
  const [worldSettings, setWorldSettings] = useState(project.worldSettings);
  const [characters, setCharacters] = useState(project.characters);

  // 从本地数据重算摘要（与 project-workspace 的格式一致）
  const localWorldSummary = worldSettings
    .map((w) => `【${w.title}】${typeof w.content === "string" ? w.content : JSON.stringify(w.content)}`)
    .join("\n");
  const localCharacterSummary = characters
    .map(
      (c) =>
        `${c.name}(${c.role})：${c.personality || ""} ${c.background || ""} ${
          c.motivation ? "动机：" + c.motivation : ""
        }`
    )
    .join("\n");
  const effectiveWorldSummary = localWorldSummary || worldSummary;
  const effectiveCharacterSummary = localCharacterSummary || characterSummary;

  // 监听子组件触发的 "next" 事件（detail 携带该步骤刚保存的数据）
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { synopsis?: string; worldSettings?: Props["project"]["worldSettings"]; characters?: Props["project"]["characters"] }
        | undefined;
      if (detail?.synopsis) setSynopsis(detail.synopsis);
      if (detail?.worldSettings) setWorldSettings(detail.worldSettings);
      if (detail?.characters) setCharacters(detail.characters);
      const next = Math.min(6, step + 1);
      setStep(next);
      updateProjectStepAction(project.id, next);
    };
    window.addEventListener("pipeline-step-next", handler);
    return () => window.removeEventListener("pipeline-step-next", handler);
  }, [step, project.id]);

  function gotoStep(s: number) {
    setStep(s);
    updateProjectStepAction(project.id, s);
  }

  return (
    <div className="h-full flex flex-col">
      {/* 步骤条 */}
      <div className="flex items-center justify-between border-b pb-3 shrink-0">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => gotoStep(s.key)}
              className="flex items-center gap-2 group"
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step > s.key
                    ? "bg-bg-brand text-text-onbrand"
                    : step === s.key
                    ? "bg-bg-brand text-text-onbrand ring-4 ring-border-neutral-l2"
                    : "bg-bg-overlay-l1 text-text-tertiary group-hover:bg-bg-overlay-l2"
                }`}
              >
                {step > s.key ? <Check className="h-3.5 w-3.5" /> : s.key}
              </div>
              <div className="text-left hidden md:block">
                <div className={`text-sm font-medium ${step === s.key ? "text-text-default" : "text-text-tertiary"}`}>
                  {s.label}
                </div>
                <div className="text-xs text-text-tertiary hidden lg:block">{s.desc}</div>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div
                  className={`flex-1 h-px mx-2 ${step > s.key ? "bg-bg-brand" : "bg-bg-overlay-l2"}`}
                />
            )}
          </div>
        ))}
      </div>

      {/* 步骤内容（独立滚动） */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        {step === 1 && (
          <Step1Inspire projectId={project.id} genre={project.genre} />
        )}
        {step === 2 && (
          <Step2Worldbuild
            projectId={project.id}
            genre={project.genre}
            inspiration={synopsis}
            existing={worldSettings}
          />
        )}
        {step === 3 && (
          <Step3Character
            projectId={project.id}
            genre={project.genre}
            worldSummary={effectiveWorldSummary}
            existing={characters}
          />
        )}
        {step === 4 && (
          <Step4Outline
            projectId={project.id}
            genre={project.genre}
            worldSummary={effectiveWorldSummary}
            characterSummary={effectiveCharacterSummary}
            characters={characters.map((c) => ({ id: c.id, name: c.name }))}
            existing={project.outlines}
          />
        )}
        {step === 5 && (
          <Step5Expand projectId={project.id} chapters={project.chapters} />
        )}
        {step === 6 && (
          <Step6Polish projectId={project.id} chapters={project.chapters} />
        )}
      </div>

      {/* 底部步骤导航 */}
      <div className="flex items-center justify-between border-t border-border-neutral-l1 pt-3 shrink-0">
        <Button
          variant="outline"
          disabled={step === 1}
          onClick={() => gotoStep(step - 1)}
          className="border-border-neutral-l2 hover:bg-bg-overlay-l1"
        >
          上一步
        </Button>
        <span className="text-sm text-text-tertiary">
          第 {step} / 6 步
        </span>
        {step < 6 ? (
          <Button onClick={() => gotoStep(step + 1)} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
            跳到下一步
          </Button>
        ) : (
          <Button asChild variant="outline" className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
            <Link href={`/project/${project.id}?view=workbench`}>前往工作台继续编辑</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// memo 包裹：project 数据变化时重渲染（chapters content 等可能被保存更新）
export const PipelineFlow = memo(PipelineFlowImpl, (prev, next) => {
  return (
    prev.project.id === next.project.id &&
    prev.worldSummary === next.worldSummary &&
    prev.characterSummary === next.characterSummary &&
    prev.project.chapters.length === next.project.chapters.length &&
    prev.project.chapters.every((c, i) =>
      c.id === next.project.chapters[i].id &&
      c.content === next.project.chapters[i].content &&
      c.wordCount === next.project.chapters[i].wordCount
    )
  );
});
