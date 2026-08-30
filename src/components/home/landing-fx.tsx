"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── 鼠标跟随光晕：柔和暖光以插值方式跟随光标 ────────────────── */

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return; // 触屏不启用
    const el = ref.current;
    if (!el) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.3;
    let x = tx;
    let y = ty;
    let raf = 0;
    let visible = false;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        el.style.opacity = "1";
      }
    };
    const onLeave = () => {
      visible = false;
      el.style.opacity = "0";
    };
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate3d(${x - 240}px, ${y - 240}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="cursor-glow"
      style={{ opacity: 0, transition: "opacity .5s ease" }}
    />
  );
}

/* ── 点击涟漪：全页点击处扩散光环 ────────────────────────────── */

export function ClickRipples() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e: MouseEvent) => {
      // 忽略文本选择时的拖拽（只响应主键单击）
      if (e.button !== 0) return;
      const el = document.createElement("span");
      el.className = "click-ripple";
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove(), { once: true });
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return null;
}

/* ── 磁吸容器：子元素向光标方向轻微吸引 ──────────────────────── */

export function Magnetic({
  children,
  strength = 0.18,
  className = "",
}: {
  children: ReactNode;
  /** 吸引强度（位移 = 光标偏离中心 × strength） */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    el.style.transition = "none";
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform .35s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "translate(0, 0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn("inline-block", className)}
    >
      {children}
    </div>
  );
}
