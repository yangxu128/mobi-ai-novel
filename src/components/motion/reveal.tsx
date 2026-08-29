"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * 滚动渐显容器：进入视口时淡入 + 上浮
 * - 仅触发一次，触发后断开观察器
 * - delay 用于同屏多元素的交错入场
 * - prefers-reduced-motion 下由全局样式将过渡时长压为 0，直接显示
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: ReactNode;
  /** 交错延迟（毫秒） */
  delay?: number;
  /** 初始下移距离（像素） */
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-in" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms`, "--reveal-y": `${y}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}
