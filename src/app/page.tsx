"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SplitReveal } from "@/components/motion/split-reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { BackToTop } from "@/components/motion/back-to-top";
import { CursorGlow, ClickRipples, Magnetic } from "@/components/home/landing-fx";
import { ModeCarousel } from "@/components/home/mode-carousel";
import { FeatureSection } from "@/components/home/feature-section";
import { SiteFooter } from "@/components/site-footer";

const GENRES = ["玄幻", "都市", "科幻", "悬疑", "言情", "历史", "武侠", "末世"];

export default function Home() {
  return (
    <>
      <CursorGlow />
      <ClickRipples />
      <div className="container pb-16 pt-14 lg:pt-20">
        {/* ══════ Hero：逐字标题 + 磁吸输入条 ══════ */}
        <section className="text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.15] tracking-tight text-text-default md:text-6xl">
            <SplitReveal
              baseDelay={100}
              step={38}
              segments={[
                { text: "让 AI 与你" },
                { text: "共写", gradient: true },
                { text: "一本小说" },
              ]}
            />
          </h1>
          <Reveal delay={620} y={12} blur>
            <p className="mt-5 text-lg text-text-secondary">
              从一句灵感，到世界观、角色、大纲与成稿
            </p>
          </Reveal>
          <Reveal delay={740} y={14}>
            <form
              action="/register"
              onMouseMove={(e) => {
                const el = e.currentTarget;
                const rect = el.getBoundingClientRect();
                el.style.setProperty("--gx", `${e.clientX - rect.left}px`);
                el.style.setProperty("--gy", `${e.clientY - rect.top}px`);
              }}
              className="pill-glow mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full border border-border-neutral-l2 bg-bg-base-default p-2 pl-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              <input
                name="idea"
                maxLength={80}
                placeholder="输入一句话灵感，AI 帮你生成世界观与大纲…"
                className="relative z-10 min-w-0 flex-1 bg-transparent text-sm text-text-default outline-none placeholder:text-text-tertiary"
              />
              <Magnetic strength={0.25}>
                <button
                  type="submit"
                  className="btn-cta relative z-10 shrink-0 rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white hover:bg-neutral-700"
                >
                  开始创作
                </button>
              </Magnetic>
            </form>
          </Reveal>
          <Reveal delay={860} y={10}>
            <p className="mt-4 text-xs text-text-tertiary">免费版包含 1 个项目 + 每日 500 字 AI 续写</p>
          </Reveal>
        </section>

        {/* ══════ 三种创作模式：大卡片横向轮播 ══════ */}
        <section id="modes" className="mt-16 scroll-mt-20 lg:mt-20">
          <Reveal blur>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-text-default">三种创作模式，随时切换</h2>
              <p className="mt-2 text-text-secondary">同一个项目，三种姿态，数据实时同步</p>
            </div>
          </Reveal>
          <ModeCarousel />
        </section>

        {/* ══════ 核心能力：左文案 + 右 mockup 分栏 ══════ */}
        <FeatureSection />

        {/* ══════ 题材快捷入口（3D 倾斜卡片） ══════ */}
        <section className="pb-4 pt-2">
          <Reveal blur>
            <h3 className="mb-6 text-xl font-bold tracking-tight text-text-default">从一个题材开始</h3>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {GENRES.map((g, i) => (
              <Reveal key={g} delay={i * 60} y={14} className="h-full">
                <TiltCard className="h-full" max={8}>
                  <Link
                    href="/projects?new=1"
                    className="group flex h-32 flex-col justify-between rounded-2xl bg-[#F7F7F5] p-5 transition-colors hover:bg-[#EFEFED]"
                  >
                    <span className="text-2xl font-bold tracking-tight text-text-default">{g}</span>
                    <span className="flex items-center justify-between text-sm text-text-tertiary transition-colors group-hover:text-text-default">
                      AI 开一部
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════ 横幅 CTA ══════ */}
        <section className="mt-14">
          <Reveal blur>
            <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-[#F7F7F5] px-8 py-12 md:flex-row md:items-center md:px-14">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-text-default md:text-3xl">
                  一个灵感，<span className="text-shimmer">一章成稿</span>
                </h3>
                <p className="mt-2 text-text-secondary">三分钟注册，三步生成你的第一章。</p>
              </div>
              <Magnetic strength={0.2}>
                <Link
                  href="/register"
                  className="btn-cta inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-6 py-3 text-sm text-white hover:bg-neutral-700"
                >
                  免费注册
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </section>
      </div>
      <SiteFooter />
      <BackToTop />
    </>
  );
}
