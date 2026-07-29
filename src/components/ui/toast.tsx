"use client";

// 简易 toast 实现（不依赖外部库）
import { create } from "zustand";

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
    }, 4000);
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

export function Toaster() {
  const { toasts, remove } = useToastStore();
  const colorMap: Record<ToastType, string> = {
    default: "bg-background text-foreground border-border",
    success: "bg-emerald-600 text-white border-emerald-700",
    error: "bg-destructive text-destructive-foreground border-destructive",
    warning: "bg-amber-600 text-white border-amber-700",
  };
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md border p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 ${colorMap[t.type]}`}
          onClick={() => remove(t.id)}
        >
          <div className="text-sm font-medium">{t.title}</div>
          {t.description && <div className="mt-1 text-xs opacity-90">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
