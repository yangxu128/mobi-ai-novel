import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

/**
 * 官网内容页共享布局：标题区 + 正文 + 页脚。
 * 用于服务条款/隐私政策/FAQ/指南/关于等静态信息页。
 */
export function SimplePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="page-wash">
        <div className="container py-14">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs tracking-widest text-text-tertiary">MOBI · 墨笔</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-default md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-text-secondary">{description}</p>
            <p className="mt-2 text-xs text-text-tertiary">
              最后更新：2026 年 8 月 31 日 · 有疑问请联系{" "}
              <a href="mailto:1419644549@qq.com" className="text-text-brand hover:underline">
                1419644549@qq.com
              </a>
            </p>

            <div className="mt-10 rounded-3xl border border-border-neutral-l1 bg-bg-base-default p-8 shadow-[var(--shadow-card)] md:p-10">
              {children}
            </div>

            <p className="mt-8 text-center text-sm text-text-tertiary">
              准备好开始创作了吗？{" "}
              <Link href="/register" className="text-text-brand hover:underline">
                免费注册墨笔 →
              </Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}

/** 内容小节：标题 + 正文容器 */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight text-text-default">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-text-secondary">{children}</div>
    </section>
  );
}
