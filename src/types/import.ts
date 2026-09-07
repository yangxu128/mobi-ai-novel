/** 导入流程共享类型（向导前端 + importProjectAction 服务端共用） */

/** 章节切分草稿（纯文本，未入库） */
export type ImportChapterDraft = {
  /** 卷号（默认 1） */
  volume: number;
  /** 章号：序章/楔子 = 0，正文从 1 起，番外从 900 起 */
  chapter: number;
  /** 章节标题（如"第一章 初入宗门"，切分时可被用户编辑） */
  title: string;
  /** 纯文本正文 */
  content: string;
  /** 全局顺序 0..n-1（与章节列表下标一致，摘要关联用） */
  order: number;
};

export type ImportWorldCategory =
  | "BACKGROUND"
  | "GEOGRAPHY"
  | "RULE"
  | "SYSTEM"
  | "OTHER";

/** 世界观条目（UI 层 content 为 string，入库时包装 { text }） */
export type ImportWorldSetting = {
  title: string;
  category: ImportWorldCategory;
  content: string;
};

export type ImportCharacterRole =
  | "PROTAGONIST"
  | "SUPPORTING"
  | "ANTAGONIST"
  | "EXTRA";

/** 角色条目 */
export type ImportCharacter = {
  name: string;
  role: ImportCharacterRole;
  appearance: string;
  personality: string;
  background: string;
  motivation: string;
};

/** AI 智能解析输出（前端持有、可编辑，字段均可为空） */
export type ImportAIResult = {
  /** 从文本推断的作品标题（推断不出为空串） */
  title: string;
  genre: string;
  synopsis: string;
  worldSettings: ImportWorldSetting[];
  characters: ImportCharacter[];
  /** key = ImportChapterDraft.order */
  chapterSummaries: Record<number, string>;
};

/** importProjectAction 入参 */
export type ImportProjectInput = {
  project: {
    title: string;
    genre: string;
    mode: "PIPELINE" | "WORKBENCH" | "CHAT";
    synopsis?: string;
    styleProfile?: unknown;
    targetChapters?: number;
    chapterWords?: number;
  };
  worldSettings: ImportWorldSetting[];
  characters: ImportCharacter[];
  chapters: Array<{
    volume: number;
    chapter: number;
    title: string;
    content: string;
    final: boolean;
  }>;
  /** key = chapters 下标；空对象 = 不生成大纲关联 */
  outlineSummaries: Record<number, string>;
};
