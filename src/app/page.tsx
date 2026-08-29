import Link from "next/link";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { MouseParallax } from "@/components/motion/mouse-parallax";
import { TiltCard } from "@/components/motion/tilt-card";
import { SiteFooter } from "@/components/site-footer";
import {
  PenLine,
  Workflow,
  MessageSquare,
  BookOpen,
  Sparkles,
  Shield,
  ArrowRight,
  Layers,
} from "lucide-react";

/* ── 模式卡片内的迷你演示动画（纯 CSS 循环） ────────────────── */

/** 流水线：六个步骤循环点亮 */
function PipelineDemo() {
  return (
    <div className="relative flex items-center justify-between px-2 py-1">
      <div className="absolute left-3 right-3 top-1/2 h-px bg-border-neutral-l2" aria-hidden />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="relative z-10 h-4 w-4 rounded-full border-2 border-border-neutral-l2 bg-bg-base-default"
          style={{ animation: `step-pulse 2.4s ease-in-out ${i * 0.4}s infinite` }}
        />
      ))}
    </div>
  );
}

/** 工作台：打字机效果——逐字打出 → 停顿 → 回删，循环 */
function WorkbenchDemo() {
  return (
    <div className="px-1 py-1 text-[11px] leading-relaxed text-text-secondary">
      <span className="wb-typed">九月的碧水湖，莲蓬熟了。</span>
      <span className="wb-caret ml-px inline-block h-3 w-[2px] translate-y-[2px] rounded bg-[#7C8CFF]" />
    </div>
  );
}

/** 对话共创：用户/AI 气泡交替弹入 */
function ChatDemo() {
  return (
    <div className="space-y-2">
      <div
        className="ml-auto w-fit max-w-[78%] rounded-xl rounded-br-sm bg-bg-brand px-3 py-1.5 text-[11px] leading-snug text-text-onbrand"
        style={{ animation: "bubble-pop 3.6s ease 0s infinite" }}
      >
        帮我把开头改得更有悬念
      </div>
      <div
        className="w-fit max-w-[82%] rounded-xl rounded-bl-sm bg-white px-3 py-1.5 text-[11px] leading-snug text-text-secondary ring-1 ring-black/5"
        style={{ animation: "bubble-pop 3.6s ease 1.4s infinite" }}
      >
        好的，试着把结局倒叙到开头……
      </div>
    </div>
  );
}

const MODE_CARDS = [
  {
    icon: Workflow,
    chip: "chip-amber",
    title: "结构化流水线",
    desc: "新手友好，六步引导式完成创作",
    points: ["灵感卡 → 世界观 → 角色卡 → 大纲 → 章节扩写 → 润色定稿", "每步遵循 AI 生成 → 人工编辑 → 确认流转"],
    Demo: PipelineDemo,
  },
  {
    icon: PenLine,
    chip: "chip-indigo",
    title: "写作工作台",
    desc: "专业作者深度创作环境",
    points: ["TipTap 富文本编辑器 + 行内 AI（Cmd+K）", "章节树 / 知识库侧栏 / 一致性提示 / 版本快照"],
    Demo: WorkbenchDemo,
  },
  {
    icon: MessageSquare,
    chip: "chip-violet",
    title: "对话共创",
    desc: "爱好者零门槛聊天式创作",
    points: ["叙事者接龙、分支选择、角色扮演", "AI 自动提取世界观/角色，一键转正式项目"],
    Demo: ChatDemo,
  },
];

/* ── 能力卡片内的迷你演示动画 ────────────────────────────────── */

/** 知识库 RAG：三张知识卡依次被选中注入 */
function RagDemo() {
  const chips = ["世界观", "角色卡", "章节稿"];
  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        {chips.map((c, i) => (
          <span
            key={c}
            className="rounded-lg border border-border-neutral-l1 bg-bg-base-default px-2.5 py-1 text-[10px] text-text-secondary"
            style={{ animation: `rag-pick 3s ease-in-out ${i * 1}s infinite` }}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center">
        <span
          className="h-1 w-16 rounded-full bg-[#2FD9A4]/60"
          style={{ animation: `layer-lit 3s ease-in-out 2.2s infinite` }}
        />
      </div>
    </div>
  );
}

/** 分层上下文：远/中/近三层依次点亮 */
function LayersDemo() {
  const widths = ["45%", "70%", "95%"];
  return (
    <div className="space-y-2 px-3 py-1">
      {widths.map((w, i) => (
        <div
          key={i}
          className="h-2 rounded-full bg-gradient-to-r from-[#38C6FF]/75 to-[#7DDAFF]/35"
          style={{ width: w, marginInline: i === 2 ? "auto" : undefined, animation: `layer-lit 3s ease-in-out ${i * 0.5}s infinite` }}
        />
      ))}
    </div>
  );
}

/** 一致性引擎：扫描线往返扫过文稿，问题行闪烁标红 */
function ScanDemo() {
  return (
    <div className="relative space-y-1.5 overflow-hidden rounded-lg bg-white/70 px-3 py-2.5 ring-1 ring-black/5">
      <div className="h-1.5 w-[85%] rounded-full bg-bg-overlay-l2" />
      <div
        className="h-1.5 w-[62%] rounded-full bg-status-error-surface-l2"
        style={{ animation: "caret-blink 1.2s ease-in-out infinite" }}
      />
      <div className="h-1.5 w-[90%] rounded-full bg-bg-overlay-l2" />
      <div className="h-1.5 w-[55%] rounded-full bg-bg-overlay-l2" />
      <span
        aria-hidden
        className="scan-line absolute bottom-0 top-0 w-[2px] rounded bg-gradient-to-b from-transparent via-[#FF7A5C] to-transparent"
      />
    </div>
  );
}

const CAPABILITY_CARDS = [
  {
    icon: BookOpen,
    chip: "chip-teal",
    title: "知识库 RAG",
    desc: "世界观/角色卡/章节稿自动检索注入 AI 上下文，长篇创作不串设定",
    Demo: RagDemo,
  },
  {
    icon: Layers,
    chip: "chip-cyan",
    title: "分层上下文管理",
    desc: "近期全文 + 中期摘要 + 远期大纲，10-16K 字精准控制上下文窗口",
    Demo: LayersDemo,
  },
  {
    icon: Shield,
    chip: "chip-coral",
    title: "一致性引擎",
    desc: "AI 扫描全文，自动标记与世界观/角色矛盾的段落，给出修改建议",
    Demo: ScanDemo,
  },
];

const STEPS = [
  { step: "01", title: "输入灵感", desc: "一句话描述你的故事点子" },
  { step: "02", title: "AI 生成世界观", desc: "自动构建角色、大纲与章节" },
  { step: "03", title: "沉浸式写作", desc: "在工作台或对话中完成成稿" },
];

const TICKER = [
  "玄幻", "都市", "言情", "科幻", "悬疑", "历史", "武侠", "末世",
  "世界观生成", "角色卡", "章节扩写", "一致性检查", "知识库 RAG", "行内 AI",
];

/* ── Hero 内漂浮的小说元素卡片（鼠标视差 + 摇摆） ───────────── */

function SkeletonLines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-1.5">
      {widths.map((w, i) => (
        <div key={i} className="h-2 rounded-full bg-neutral-200/80" style={{ width: w }} />
      ))}
    </div>
  );
}

function FloatCard({
  className,
  rot,
  depth,
  duration,
  delay,
  blur = false,
  children,
}: {
  className: string;
  rot: number;
  depth: number;
  duration: number;
  delay: number;
  blur?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute hidden xl:block ${className}`}
      style={{
        transform: "translate(calc(var(--mx, 0) * var(--px) * 1px), calc(var(--my, 0) * var(--px) * 1px))",
        "--px": depth,
      } as CSSProperties}
    >
      <div
        className="animate-bob"
        style={{ "--rot": `${rot}deg`, animationDuration: `${duration}s`, animationDelay: `${delay}s` } as CSSProperties}
      >
        <div
          className={`rounded-2xl bg-white shadow-[var(--shadow-card-hover)] ring-1 ring-black/5 ${
            blur ? "scale-90 opacity-60 blur-[2px]" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function FloatingField() {
  return (
    <>
      {/* 章节卡 */}
      <FloatCard className="left-[3%] top-[16%]" rot={-9} depth={18} duration={7} delay={0}>
        <div className="w-44 p-3.5">
          <div className="mb-1.5 text-xs font-semibold text-text-default">第1章 · 忘忧花开</div>
          <SkeletonLines widths={["100%", "92%", "96%", "60%"]} />
          <div className="mt-2.5 text-[10px] text-text-tertiary">2422 字 · 已保存</div>
        </div>
      </FloatCard>

      {/* 角色卡 */}
      <FloatCard className="right-[3%] top-[13%]" rot={8} depth={26} duration={8} delay={0.6}>
        <div className="w-40 p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full brand-gradient text-sm font-semibold text-text-onbrand">
              青
            </div>
            <div>
              <div className="text-xs font-semibold text-text-default">青莲</div>
              <div className="text-[10px] text-text-tertiary">主角 · 采莲女</div>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {["坚韧", "好奇", "水灵根"].map((t) => (
              <span key={t} className="rounded-full bg-bg-overlay-l1 px-2 py-0.5 text-[10px] text-text-secondary">
                {t}
              </span>
            ))}
          </div>
        </div>
      </FloatCard>

      {/* 世界观卡 */}
      <FloatCard className="bottom-[14%] left-[5%]" rot={6} depth={30} duration={7.5} delay={1.2}>
        <div className="w-44 p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-default">
            <span className="flex h-4 w-4 items-center justify-center rounded chip-teal text-[9px]">界</span>
            九重天境
          </div>
          <SkeletonLines widths={["100%", "88%", "52%"]} />
        </div>
      </FloatCard>

      {/* AI 续写气泡 */}
      <FloatCard className="bottom-[15%] right-[4.5%]" rot={-8} depth={22} duration={6.8} delay={0.3}>
        <div className="w-48 p-3.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-brand">AI 续写中</span>
            <span className="typing-dot h-1 w-1 rounded-full bg-bg-brand" style={{ animationDelay: "0s" }} />
            <span className="typing-dot h-1 w-1 rounded-full bg-bg-brand" style={{ animationDelay: "0.15s" }} />
            <span className="typing-dot h-1 w-1 rounded-full bg-bg-brand" style={{ animationDelay: "0.3s" }} />
          </div>
          <div className="mt-2">
            <SkeletonLines widths={["100%", "94%", "70%"]} />
          </div>
        </div>
      </FloatCard>

      {/* 灵感卡（远景，模糊） */}
      <FloatCard className="left-[27%] top-[5%]" rot={-7} depth={36} duration={9} delay={0.9} blur>
        <div className="w-36 brand-gradient p-3 text-text-onbrand ring-0">
          <div className="text-[10px] font-medium opacity-90">✦ 一句话灵感</div>
          <div className="mt-1 text-xs font-semibold leading-relaxed">一朵莲花承载九重天，花蕊是神域</div>
        </div>
      </FloatCard>

      {/* 大纲卡（远景，模糊） */}
      <FloatCard className="bottom-[6%] right-[26%]" rot={10} depth={34} duration={8.4} delay={1.5} blur>
        <div className="w-40 p-3.5">
          <div className="mb-1.5 text-xs font-semibold text-text-default">第一卷 · 大纲</div>
          <div className="space-y-1">
            {["忘忧花开", "无垢便降临", "鉴冥引路人", "铁匠铺的主人"].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                <span className="num text-text-tertiary">{i + 1}.</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </FloatCard>
    </>
  );
}

/** Hero / CTA 卡片共用的暖色光球装饰 */
function GlowOrbs() {
  return (
    <>
      <div
        aria-hidden
        className="animate-float-a pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#FF9A3D] opacity-15 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-b pointer-events-none absolute -top-16 right-8 h-64 w-64 rounded-full bg-[#F2A90C] opacity-10 blur-3xl"
      />
    </>
  );
}

export default function Home() {
  return (
    <>
      <div className="container py-8 lg:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border-neutral-l1 shadow-[var(--shadow-card)] px-6 py-14 lg:px-12 lg:py-20 mb-10 hero-wash">
        <GlowOrbs />
        <MouseParallax className="absolute inset-0">
          <FloatingField />
        </MouseParallax>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <Reveal delay={0} y={16}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-brand-popup text-text-brand text-xs font-medium mb-6">
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-bg-brand" />
              AI 全流程协作 · 从灵感到成稿
            </div>
          </Reveal>
          <Reveal delay={90} y={20}>
            <h1 className="text-4xl lg:text-[3.4rem] lg:leading-[1.15] font-bold tracking-tight mb-6 text-text-default">
              让 AI 与你<span className="shimmer-text">共写</span>一本小说
            </h1>
          </Reveal>
          <Reveal delay={180} y={20}>
            <p className="text-lg text-text-secondary mb-8 leading-relaxed">
              墨笔是一个 AI 全流程协作的写小说平台，提供结构化流水线、写作工作台、对话共创三种模式。
              世界观、角色卡、章节稿共享同一知识库，AI 自动检索注入上下文，解决长篇一致性。
            </p>
          </Reveal>
          <Reveal delay={270} y={20}>
            <div className="flex gap-3 justify-center">
              <Button asChild size="lg" className="btn-glow">
                <Link href="/register">免费开始创作</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">查看定价</Link>
              </Button>
            </div>
            <p className="text-xs text-text-tertiary mt-4">免费版包含 1 个项目 + 每日 500 字 AI 续写</p>
          </Reveal>
        </div>

        {/* 三步示意条 */}
        <div className="relative z-10 mt-14 lg:mt-16 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((item, i) => (
              <Reveal key={item.step} delay={380 + i * 110} y={20}>
                <div className="relative flex items-start gap-3.5 p-4 rounded-2xl bg-bg-base-default border border-border-neutral-l1 shadow-[var(--shadow-card)]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full brand-gradient text-text-onbrand text-xs font-semibold">
                    {item.step}
                  </div>
                  <div>
                    <div className="font-medium text-text-default">{item.title}</div>
                    <div className="text-sm text-text-tertiary mt-0.5">{item.desc}</div>
                  </div>
                  {i < 2 && (
                    <ArrowRight className="animate-arrow-nudge hidden md:block absolute -right-[13px] top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary z-10 bg-bg-base-default rounded-full" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 词条跑马灯（双向滚动） */}
      <section className="mb-14 marquee-hover" aria-hidden>
        <div className="space-y-3 marquee-mask overflow-hidden">
          {[0, 1].map((row) => (
            <div key={row} className="flex w-max gap-3">
              <div className={`flex w-max gap-3 ${row === 0 ? "animate-marquee-l" : "animate-marquee-r"}`}>
                {[...TICKER, ...TICKER].map((t, i) => (
                  <span
                    key={`${row}-${i}`}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border-neutral-l1 bg-bg-base-default px-4 py-1.5 text-sm text-text-secondary shadow-[var(--shadow-card)]"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${i % 3 === 0 ? "bg-bg-brand" : i % 3 === 1 ? "bg-[#F2A90C]" : "bg-[#9570FF]"}`} />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 三种创作模式 */}
      <section id="modes" className="mb-14">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 text-text-default">三种创作模式，随时切换</h2>
            <p className="text-text-secondary">同一个项目，三种姿态，数据实时同步</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {MODE_CARDS.map((card, i) => {
            const Icon = card.icon;
            const Demo = card.Demo;
            return (
              <Reveal key={card.title} delay={i * 100} className="h-full">
                <TiltCard className="h-full">
                    <Card className="group h-full rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]">
                      <CardHeader className="items-center text-center">
                        <div className={`icon-pop h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${card.chip}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle>{card.title}</CardTitle>
                        <CardDescription>{card.desc}</CardDescription>
                      </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-xl bg-bg-overlay-l1/60 px-4 py-4">
                        <Demo />
                      </div>
                      <ul className="space-y-2">
                        {card.points.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-bg-brand/70" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 核心能力 */}
      <section id="capabilities" className="mb-14">
        <div className="grid md:grid-cols-3 gap-6">
          {CAPABILITY_CARDS.map((card, i) => {
            const Icon = card.icon;
            const Demo = card.Demo;
            return (
              <Reveal key={card.title} delay={i * 100} className="h-full">
                <TiltCard className="h-full">
                  <Card className="group h-full rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]">
                    <CardHeader className="items-center text-center">
                      <div className={`icon-pop h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${card.chip}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-xl bg-bg-overlay-l1/60 px-4 py-4">
                        <Demo />
                      </div>
                      <p className="text-center text-sm leading-relaxed text-text-secondary">{card.desc}</p>
                    </CardContent>
                  </Card>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="relative overflow-hidden rounded-3xl border border-border-neutral-l1 shadow-[var(--shadow-card)] hero-wash px-6 py-14 lg:py-16 text-center">
        <GlowOrbs />
        <Reveal>
          <h2 className="text-3xl font-bold mb-3 text-text-default">
            现在开始你的<span className="shimmer-text">第一本小说</span>
          </h2>
          <p className="text-text-secondary mb-6">三分钟注册，三步生成第一章</p>
          <Button asChild size="lg" className="btn-glow">
            <Link href="/register">免费注册</Link>
          </Button>
        </Reveal>
      </section>
      </div>
      <SiteFooter />
    </>
  );
}
