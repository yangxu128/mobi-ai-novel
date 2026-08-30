"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MessageSquare, PenLine, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── 三张模式卡的右侧 mockup（静态图形，浅灰 UI 截图感） ───── */

function PipelineMock() {
  const steps = ["灵感", "世界观", "角色", "大纲", "扩写", "润色"];
  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                  i < 3 ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white text-neutral-400"
                }`}
              >
                {i < 3 ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={`whitespace-nowrap text-[10px] ${i < 3 ? "text-text-default" : "text-text-tertiary"}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <span className="mx-1 mb-4 h-px flex-1 bg-neutral-200" />}
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 rounded-lg bg-neutral-50 p-3">
        <div className="h-1.5 w-3/4 rounded-full bg-neutral-200" />
        <div className="h-1.5 w-1/2 rounded-full bg-neutral-200" />
      </div>
    </div>
  );
}

function WorkbenchMock() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-black/5">
      <div className="flex items-center gap-1.5 border-b border-neutral-100 px-3.5 py-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-4 w-4 rounded ${i === 0 ? "bg-neutral-900" : "bg-neutral-200"}`} />
        ))}
        <span className="ml-auto rounded border border-neutral-200 px-1.5 py-0.5 text-[9px] text-neutral-400">⌘K</span>
      </div>
      <div className="space-y-2 p-4">
        <div className="text-sm font-semibold text-text-default">第1章 · 忘忧花开</div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-neutral-200" />
          <div className="h-1.5 w-[92%] rounded-full bg-neutral-200" />
          <div className="h-1.5 w-[96%] rounded-full bg-neutral-100" />
          <div className="h-1.5 w-[58%] rounded-full bg-neutral-100" />
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <span className="rounded-full bg-bg-brand-popup px-2 py-0.5 text-[9px] text-text-brand">AI 续写</span>
          <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[9px] text-neutral-400">润色</span>
          <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[9px] text-neutral-400">扩写</span>
        </div>
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="space-y-2.5 rounded-xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-black/5">
      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-neutral-900 px-3 py-1.5 text-[11px] text-white">
        写一个采莲女在湖上捡到古镜的开头
      </div>
      <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2 text-[11px] leading-relaxed text-text-secondary">
        九月的碧水湖，莲蓬熟了。青莲撑船划进湖心时，一枚古铜镜正躺在水底的光斑里……
      </div>
      <div className="flex gap-1.5">
        <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[9px] text-neutral-400">分支 A</span>
        <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[9px] text-neutral-400">分支 B</span>
        <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[9px] text-neutral-400">继续接龙</span>
      </div>
    </div>
  );
}

const MODES = [
  {
    key: "pipeline",
    icon: Workflow,
    eyebrow: "MODE 01",
    name: "结构化流水线",
    tagline: "新手友好，六步引导式完成创作",
    points: ["灵感卡 → 世界观 → 角色卡 → 大纲 → 扩写 → 润色", "每步遵循 AI 生成 → 人工编辑 → 确认流转"],
    href: "/register",
    cta: "从流水线开始",
    Mock: PipelineMock,
  },
  {
    key: "workbench",
    icon: PenLine,
    eyebrow: "MODE 02",
    name: "写作工作台",
    tagline: "专业作者深度创作环境",
    points: ["TipTap 富文本编辑器 + 行内 AI（Cmd+K）", "章节树 / 知识库侧栏 / 一致性提示 / 版本快照"],
    href: "/register",
    cta: "进入工作台",
    Mock: WorkbenchMock,
  },
  {
    key: "chat",
    icon: MessageSquare,
    eyebrow: "MODE 03",
    name: "对话共创",
    tagline: "爱好者零门槛聊天式创作",
    points: ["叙事者接龙、分支选择、角色扮演", "AI 自动提取世界观/角色，一键转正式项目"],
    href: "/register",
    cta: "开始对话共创",
    Mock: ChatMock,
  },
];

const N = MODES.length;
const normalize = (i: number) => ((i % N) + N) % N;

/**
 * 无限轮播（transform 版）：不用原生滚动，轨道用 translateX 位移动画，
 * 虚拟索引无界递增、按 N 取模渲染卡片——从原理上不存在滚动钳制/回跳问题。
 * - 快速连点：动画期间的方向进入队列，animationend 后串行执行
 * - 入场：加载时三张卡堆叠成牌堆，停顿后展开
 */
export function ModeCarousel() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideEls = useRef<(HTMLElement | null)[]>([]);
  const [step, setStep] = useState(1024); // 卡宽 + 间距
  const [pos, setPos] = useState(0); // 无界虚拟索引
  const [dir, setDir] = useState<0 | 1 | -1>(0); // 当前动画方向
  const [animating, setAnimating] = useState(false);
  const pendingRef = useRef(0); // 动画期间缓存的连点方向
  const [entered, setEntered] = useState(false); // 入场展开完成
  const [stack, setStack] = useState<{ x: number; y: number; r: number; s: number }[] | null>(null);
  const stackMeasured = useRef(false);

  /* 步长测量 + 视口变化跟进 */
  useEffect(() => {
    const measure = () => {
      const el = slideEls.current[0];
      if (el) setStep(el.offsetWidth + 24);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* 入场：堆叠 → 展开 */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) return;
    const vx = viewport.getBoundingClientRect();
    const centerX = vx.left + vx.width / 2;
    const rots = [-2.5, 2, -1.5];
    const arr = slideEls.current.slice(0, N).map((el, i) => {
      if (!el) return { x: 0, y: 0, r: 0, s: 1 };
      const r = el.getBoundingClientRect();
      return {
        x: centerX - (r.left + r.width / 2) + i * 10,
        y: i * 14,
        r: rots[i % rots.length],
        s: 1 - i * 0.018,
      };
    });
    setStack(arr);
    stackMeasured.current = true;
    // 不能用 rAF 嵌套：标签页处于后台时 rAF 会挂起，导致永不展开。
    // setStack 的重渲染会先应用堆叠态，这里直接定时展开即可。
    const t = setTimeout(() => setEntered(true), 650);
    return () => clearTimeout(t);
  }, []);

  /** 单步滑动（transform 动画由 key={pos} 重挂载触发） */
  const stepTo = useCallback((d: 1 | -1) => {
    setDir(d);
    setAnimating(true);
    setPos((p) => p + d);
  }, []);

  function nav(d: 1 | -1) {
    if (!entered) return;
    if (animating) {
      pendingRef.current += d; // 动画中：缓存方向，结束后串行执行
      return;
    }
    stepTo(d);
  }

  function goToDot(i: number) {
    if (!entered) return;
    const forward = (i - normalize(pos) + N) % N;
    if (forward === 0) return;
    if (animating) {
      pendingRef.current += forward;
      return;
    }
    if (forward === 1) stepTo(1);
    else if (forward === N - 1) stepTo(-1);
    else setPos((p) => p + forward); // 多步直接切换（无动画）
  }

  function onReelAnimationEnd(e: React.AnimationEvent) {
    if (e.target !== e.currentTarget) return;
    setAnimating(false);
    setDir(0);
    if (pendingRef.current !== 0) {
      const d: 1 | -1 = pendingRef.current > 0 ? 1 : -1;
      pendingRef.current -= d;
      stepTo(d);
    }
  }

  const active = normalize(pos);

  /** 每张滑块的入场样式：堆叠态（模糊失焦）→（展开对焦）→ 原位清晰 */
  const slideStyle = (a: number): CSSProperties => {
    if (entered) {
      const d = normalize(a) * 120;
      return {
        transition: `transform 1.3s cubic-bezier(0.22, 1, 0.36, 1) ${d}ms, filter 1.3s cubic-bezier(0.22, 1, 0.36, 1) ${d}ms`,
        filter: "blur(0px)",
      };
    }
    if (!stack) return { opacity: 0 };
    const slot = normalize(a);
    const s = stack[slot];
    if (!s) return {};
    return {
      transform: `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg) scale(${s.s})`,
      filter: `blur(${5 + slot * 2.5}px)`, // 堆叠时失焦，越靠后越模糊
      zIndex: N - slot,
      transition: "none",
      boxShadow: "0 24px 64px rgba(26, 26, 26, 0.16)",
    };
  };

  /* 渲染窗口：当前卡前后各留一张，虚拟索引 → 取模取内容 */
  const rendered: { a: number; m: (typeof MODES)[number] }[] = [];
  for (let a = pos - 1; a <= pos + 2; a++) {
    rendered.push({ a, m: MODES[normalize(a)] });
  }

  return (
    <div>
      <div ref={viewportRef} className="overflow-hidden">
        {/* 基准层：整体左移一个卡位，让当前卡左缘与内容区对齐、下一张从右侧露边 */}
        <div className="-translate-x-full" style={{ transform: `translateX(-${step}px)` }}>
          {/* 动画层：pos 变化时重挂载，重放 ±step 位移动画 */}
          <div
            key={pos}
            onAnimationEnd={onReelAnimationEnd}
            className={cn(
              "flex gap-6 will-change-transform",
              animating && dir === 1 && "animate-reel-next",
              animating && dir === -1 && "animate-reel-prev",
            )}
            style={{ "--reel-from": `${step}px` } as CSSProperties}
          >
            {rendered.map(({ a, m }) => {
              const Icon = m.icon;
              const Mock = m.Mock;
              return (
                <article
                  key={a}
                  ref={(el) => {
                    if (a >= 0 && a < N) slideEls.current[a] = el;
                  }}
                  style={slideStyle(a)}
                  className="w-[min(1000px,92vw)] shrink-0 rounded-[2rem] bg-[#F7F7F5] p-8 md:p-12"
                >
                  <div className="grid items-center gap-10 md:grid-cols-2">
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.key === "pipeline" ? "chip-amber" : m.key === "workbench" ? "chip-indigo" : "chip-violet"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="num text-xs tracking-widest text-text-tertiary">{m.eyebrow}</span>
                      </div>
                      <h3 className="text-2xl font-bold tracking-tight text-text-default md:text-3xl">{m.name}</h3>
                      <p className="mt-2 text-text-secondary">{m.tagline}</p>
                      <ul className="mt-5 space-y-2">
                        {m.points.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-neutral-900" />
                            {p}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={m.href}
                        className="btn-cta mt-6 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white hover:bg-neutral-700"
                      >
                        {m.cta}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <Mock />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* 箭头 + 圆点 */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          aria-label="上一张"
          onClick={() => nav(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-text-default transition-colors hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          {MODES.map((m, i) => (
            <button
              key={m.key}
              aria-label={`第 ${i + 1} 张`}
              onClick={() => goToDot(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === active ? "w-6 bg-neutral-900" : "w-2 bg-neutral-300 hover:bg-neutral-400",
              )}
            />
          ))}
        </div>
        <button
          aria-label="下一张"
          onClick={() => nav(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-text-default transition-colors hover:bg-neutral-50"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
