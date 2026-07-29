"use client";

import { useState, useEffect } from "react";
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

export function PipelineFlow({ project, worldSummary, characterSummary }: Props) {
  const [step, setStep] = useState(project.currentStep || 1);

  // 监听子组件触发的 "next" 事件
  useEffect(() => {
    const handler = () => {
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
                    ? "bg-primary text-primary-foreground"
                    : step === s.key
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground group-hover:bg-accent"
                }`}
              >
                {step > s.key ? <Check className="h-3.5 w-3.5" /> : s.key}
              </div>
              <div className="text-left hidden md:block">
                <div className={`text-sm font-medium ${step === s.key ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </div>
                <div className="text-xs text-muted-foreground hidden lg:block">{s.desc}</div>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 ${step > s.key ? "bg-primary" : "bg-border"}`}
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
            inspiration={project.synopsis || ""}
            existing={project.worldSettings}
          />
        )}
        {step === 3 && (
          <Step3Character
            projectId={project.id}
            genre={project.genre}
            worldSummary={worldSummary}
            existing={project.characters}
          />
        )}
        {step === 4 && (
          <Step4Outline
            projectId={project.id}
            genre={project.genre}
            worldSummary={worldSummary}
            characterSummary={characterSummary}
            characters={project.characters.map((c) => ({ id: c.id, name: c.name }))}
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
      <div className="flex items-center justify-between border-t pt-3 shrink-0">
        <Button
          variant="outline"
          disabled={step === 1}
          onClick={() => gotoStep(step - 1)}
        >
          上一步
        </Button>
        <span className="text-sm text-muted-foreground">
          第 {step} / 6 步
        </span>
        {step < 6 ? (
          <Button onClick={() => gotoStep(step + 1)}>跳到下一步</Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/editor/${project.id}`}>前往工作台继续编辑</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
