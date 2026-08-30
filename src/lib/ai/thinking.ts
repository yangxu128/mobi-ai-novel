/**
 * 深度思考全局开关（客户端）。
 * 开启后推理模型（DeepSeek v4 等）会先输出思考再给正文：更慢、更耗 token。
 * 默认关闭。状态存 localStorage，通过自定义事件通知所有监听组件。
 */

const KEY = "mb-thinking-enabled";
export const THINKING_CHANGE_EVENT = "mb-thinking-change";

export function isThinkingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setThinkingEnabled(v: boolean): void {
  window.localStorage.setItem(KEY, v ? "1" : "0");
  window.dispatchEvent(new CustomEvent(THINKING_CHANGE_EVENT));
}
