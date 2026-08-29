/**
 * 知识库相关的前端展示类型。
 * 提取到共享模块，避免在多个组件中重复定义。
 */

export interface WorldSettingView {
  id: string;
  category: string;
  title: string;
  content: unknown;
}

export interface CharacterView {
  id: string;
  name: string;
  role: string;
  appearance?: string | null;
  personality?: string | null;
  background?: string | null;
  motivation?: string | null;
  arc?: string | null;
}
