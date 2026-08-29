"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/motion/count-up";

/* ── 右侧 mockup（带轻量循环动画） ──────────────────────────── */

function RagMock() {
  const chips = ["世界观", "角色卡", "章节稿"];
  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
      <div className="flex items-center justify-center gap-2">
        {chips.map((c, i) => (
          <span
            key={c}
            className="rounded-lg border border-border-neutral-l1 bg-white px-2.5 py-1 text-[10px] text-text-secondary"
            style={{ animation: `rag-pick 3s ease-in-out ${i * 1}s infinite` }}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <span className="h-1 w-20 rounded-full bg-[#2FD9A4]/60" style={{ animation: "layer-lit 3s ease-in-out 2.2s infinite" }} />
      </div>
      <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-center text-[10px] text-text-tertiary">
        检索完成 → 注入 AI 上下文
      </div>
    </div>
  );
}

function LayersMock() {
  const rows = [
    { w: "45%", label: "远期大纲" },
    { w: "70%", label: "中期摘要" },
    { w: "95%", label: "近期全文" },
  ];
  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-center gap-3">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-[#38C6FF]/80 to-[#7DDAFF]/40"
              style={{ width: r.w, animation: `layer-lit 3s ease-in-out ${i * 0.5}s infinite` }}
            />
            <span className="text-[10px] text-text-tertiary">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanMock() {
  return (
    <div className="relative space-y-1.5 overflow-hidden rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
      <div className="h-1.5 w-[85%] rounded-full bg-neutral-200" />
      <div
        className="h-1.5 w-[62%] rounded-full bg-status-error-surface-l2"
        style={{ animation: "caret-blink 1.2s ease-in-out infinite" }}
      />
      <div className="h-1.5 w-[90%] rounded-full bg-neutral-100" />
      <div className="h-1.5 w-[55%] rounded-full bg-neutral-100" />
      <span
        aria-hidden
        className="scan-line absolute bottom-0 top-0 w-[2px] rounded bg-gradient-to-b from-transparent via-[#FF7A5C] to-transparent"
      />
      <div className="pt-1 text-[10px] text-status-error">发现 1 处与角色设定矛盾 → 已给出修改建议</div>
    </div>
  );
}

const FEATURES = [
  {
    key: "rag",
    icon: BookOpen,
    title: "知识库 RAG",
    short: "设定自动入库，AI 随取随用",
    desc: "世界观、角色卡、章节稿自动检索并注入 AI 上下文，写到第 300 章也不串设定。",
    kpi: { to: 3, suffix: " 类", label: "知识自动检索注入" },
    Mock: RagMock,
  },
  {
    key: "context",
    icon: Layers,
    title: "分层上下文",
    short: "长篇不爆窗口",
    desc: "近期全文 + 中期摘要 + 远期大纲三层管理，精准控制每一次 AI 调用的上下文窗口。",
    kpi: { to: 16, suffix: "K", label: "上下文窗口（K tokens）" },
    Mock: LayersMock,
  },
  {
    key: "consistency",
    icon: ShieldCheck,
    title: "一致性引擎",
    short: "设定冲突自动纠错",
    desc: "AI 扫描全文，自动标记与世界观/角色矛盾的段落，并给出具体修改建议。",
    kpi: { to: 10, suffix: " 类", label: "结尾钩子自动设计" },
    Mock: ScanMock,
  },
];

/** SkillHub 式左右分栏：左侧 sticky 文案 + 可点击能力列表，右侧 mockup + 大数字 KPI */
export function FeatureSection() {
  const [active, setActive] = useState(0);
  const Current = FEATURES[active];

  return (
    <section id="capabilities" className="grid gap-10 py-14 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
      {/* 左：文案与能力列表 */}
      <div>
        <div className="num text-xs tracking-widest text-text-tertiary">WHY MOBI</div>
        <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-text-default md:text-[2.6rem]">
          把灵感，
          <br />
          写成一部连载小说
        </h2>        <p className="mt-4 max-w-md text-text-secondary">长篇创作最难的一致性与上下文问题，交给引擎解决，你只管写。</p>

        <div className="mt-8 space-y-1">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isActive = i === active;
            return (
              <button
                key={f.key}
                onClick={() => setActive(i)}
                className="w-full rounded-xl px-4 py-3 text-left transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", isActive ? "bg-neutral-900" : "bg-neutral-300")} />
                  <Icon className={cn("h-4 w-4", isActive ? "text-text-default" : "text-text-tertiary")} />
                  <span className={cn("font-medium", isActive ? "text-text-default" : "text-text-tertiary")}>{f.title}</span>
                </div>
                {isActive && <p className="pl-6 pt-2 text-sm leading-relaxed text-text-secondary">{f.desc}</p>}
              </button>
            );
          })}
        </div>

        <Link
          href="/register"
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white transition-colors hover:bg-neutral-700"
        >
          免费开始创作
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 右：mockup + 大数字 KPI（SkillHub 式滚动计数） */}
      <div className="rounded-[2rem] bg-[#F7F7F5] p-8 md:p-10">
        <div className="num text-[3.2rem] font-bold leading-none tracking-tight text-text-default md:text-[4rem]">
          <CountUp key={Current.key} to={Current.kpi.to} />
          {Current.kpi.suffix}
        </div>
        <div className="mt-2 text-sm text-text-tertiary">{Current.kpi.label}</div>
        <div className="mt-8" key={`${Current.key}-mock`}>
          <Current.Mock />
        </div>
        <p className="mt-6 text-xs leading-relaxed text-text-tertiary">
          平台对每一次 AI 调用进行上下文编排与一致性校验，保障长篇创作的设定稳定。
        </p>
      </div>
    </section>
  );
}
