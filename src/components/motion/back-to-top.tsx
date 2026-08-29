"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** 右下角回到顶部按钮：内容区滚动超过一屏后浮现 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 页面滚动发生在 <main class="page-content"> 内层容器，用捕获阶段监听
    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      const el = target instanceof Document ? document.documentElement : target;
      if (!(el instanceof HTMLElement)) return;
      if (el.classList?.contains("page-content")) {
        setVisible(el.scrollTop > 600);
      }
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  return (
    <button
      aria-label="回到顶部"
      onClick={() => {
        const main = document.querySelector<HTMLElement>("main.page-content");
        main?.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={cn(
        "fixed bottom-8 right-8 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-text-default shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:bg-neutral-50",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
