"use client";

// 简易 toast 实现（不依赖外部库）
// 样式遵循 TraeWork 规范 + 用户偏好：
//   - 白色卡片 + 大圆角 + 左侧 4px 色彩条
//   - success/warning 用黑色条、error 用红色条、default 用浅灰条
//   - 使用 .ds-notif / .ds-notif--* 类作为容器
import { create } from "zustand";
import { X } from "lucide-react";

type ToastType = "default" | "success" | "error" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (t: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(opts: { title: string; description?: string; type?: ToastType }) {
  useToastStore.getState().add({
    title: opts.title,
    description: opts.description,
    type: opts.type || "default",
  });
}

// 左侧 4px 色彩条（TraeWork 语义化）
// success 黑色、warning 黑色、error 红色、default 浅灰
const accentMap: Record<ToastType, string> = {
  default: "border-l-border-neutral-l2",
  success: "border-l-text-brand",
  error: "border-l-status-error",
  warning: "border-l-text-brand",
};

export function Toaster() {
  const { toasts, remove } = useToastStore();
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col w-[360px] pointer-events-none"
      style={{ gap: "var(--spacer-8)" }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`ds-notif pointer-events-auto border-l-4 ${accentMap[t.type]}`}
        >
          <div
            className="flex items-start"
            style={{ gap: "var(--spacer-12)", padding: "var(--spacer-12) var(--spacer-16)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="ds-notif__title">{t.title}</div>
              {t.description && (
                <div className="ds-notif__desc">{t.description}</div>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="ds-notif__close"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
