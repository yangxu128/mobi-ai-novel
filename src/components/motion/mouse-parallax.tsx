"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * 鼠标视差容器：监听鼠标位置，把归一化偏移写入 CSS 变量 --mx / --my（-0.5 ~ 0.5）。
 * 子元素用 calc(var(--mx) * <深度系数> * 1px) 做不同深度的位移，rAF 内做插值让运动平滑。
 * prefers-reduced-motion 时不监听，变量保持 0。
 */
export function MouseParallax({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / rect.width - 0.5;
      targetY = (e.clientY - rect.top) / rect.height - 0.5;
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };
    const tick = () => {
      curX += (targetX - curX) * 0.055;
      curY += (targetY - curY) * 0.055;
      el.style.setProperty("--mx", curX.toFixed(4));
      el.style.setProperty("--my", curY.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
