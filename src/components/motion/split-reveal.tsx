"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Segment {
  text: string;
  /** 该段使用品牌渐变流光 */
  gradient?: boolean;
}

/**
 * 逐字显现标题：文字按字符拆分，进入视口后交错升起 + 去模糊。
 * segments 支持局部渐变段（如关键词高亮）。
 */
export function SplitReveal({
  segments,
  className = "",
  /** 首字符起始延迟（毫秒） */
  baseDelay = 0,
  /** 每个字符的交错延迟（毫秒） */
  step = 32,
}: {
  segments: Segment[];
  className?: string;
  baseDelay?: number;
  step?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let charIndex = 0;

  return (
    <span ref={ref} className={cn("inline-block", visible && "split-in", className)}>
      {segments.map((seg, si) => (
        <span key={si}>
          {Array.from(seg.text).map((ch) => {
            const d = baseDelay + charIndex++ * step;
            return (
              <span
                key={`${si}-${charIndex}`}
                className={cn("cr", seg.gradient && "text-shimmer")}
                aria-hidden
                style={
                  {
                    "--d": `${d}ms`,
                    // 渐变段：负延迟做相位差，流光在字符间波动
                    ...(seg.gradient ? { animationDelay: `${-charIndex * 110}ms` } : {}),
                  } as CSSProperties
                }
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            );
          })}
        </span>
      ))}
      {/* 屏幕阅读器读取完整文本 */}
      <span className="sr-only">
        {segments.map((s) => s.text).join("")}
      </span>
    </span>
  );
}
