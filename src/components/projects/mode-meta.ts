import { Workflow, PenLine, MessageSquare } from "lucide-react";

/** 项目三种创作模式的展示元数据（列表卡片 / 回收站共用） */
export const modeInfo = {
  PIPELINE: { label: "流水线", icon: Workflow, query: "pipeline", chip: "chip-amber" },
  WORKBENCH: { label: "工作台", icon: PenLine, query: "workbench", chip: "chip-indigo" },
  CHAT: { label: "对话共创", icon: MessageSquare, query: "chat", chip: "chip-violet" },
} as const;

export type ModeKey = keyof typeof modeInfo;
