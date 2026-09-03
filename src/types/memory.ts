/**
 * 记忆 wiki 相关共享类型。
 * 供 lib/ai/wiki.ts（提取/查询）、actions/wiki.ts、知识库记忆页签共用。
 */

/** CharacterState.current 的 JSON 结构 */
export interface CharacterStateCurrent {
  location?: string;
  status?: string;
  goal?: string;
  relations?: Array<{
    target: string;
    change: string;
    chapterNo?: number;
  }>;
  lastSeenChapterNo?: number;
}

export interface CharacterStateView {
  characterId: string;
  characterName: string;
  role?: string;
  current: CharacterStateCurrent;
  updatedAt?: string;
}

export type ForeshadowStatusView = "open" | "resolved" | "abandoned";

export interface ForeshadowView {
  id: string;
  title: string;
  content: string;
  status: ForeshadowStatusView;
  plantedChapterNo: number | null;
  resolvedChapterNo: number | null;
}

export interface StoryEventView {
  id: string;
  chapterNo: number;
  content: string;
  characters: string[];
  key: boolean;
  source: "chapter" | "chat";
}

/** 知识库"记忆"页签的整体视图 */
export interface StoryMemoryView {
  autoMemory: boolean;
  characterStates: CharacterStateView[];
  foreshadows: ForeshadowView[];
  events: StoryEventView[];
}

/** LLM 提取返回的解析结构（wikiExtractPrompt 的输出契约） */
export interface WikiExtractResult {
  summary: string;
  events: Array<{ content: string; characters: string[]; key: boolean }>;
  characterUpdates: Array<{
    name: string;
    location?: string;
    status?: string;
    goal?: string;
    relationChanges?: Array<{ target: string; change: string }>;
  }>;
  foreshadows: {
    new: Array<{ title: string; content: string }>;
    resolved: string[];
  };
}

/** 注入生成上下文的故事状态卡（getStoryState 的裁剪产物） */
export interface StoryStateContext {
  characterStates: Array<{
    name: string;
    location?: string;
    status?: string;
    goal?: string;
    relationChanges?: Array<{ target: string; change: string; chapterNo?: number }>;
    lastSeenChapterNo?: number;
  }>;
  openForeshadows: Array<{
    title: string;
    content: string;
    plantedChapterNo?: number | null;
  }>;
  resolvedForeshadows: Array<{
    title: string;
    plantedChapterNo?: number | null;
    resolvedChapterNo?: number | null;
  }>;
  keyEvents: Array<{ chapterNo: number; content: string }>;
}
