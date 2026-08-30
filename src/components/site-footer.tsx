import Link from "next/link";
import { PenLine, Github, Mail } from "lucide-react";

/**
 * 官网页脚：品牌信息 + 链接分栏 + 版权条。
 * 仅用于营销页（首页/定价页），工作台等应用页不引入。
 * 未开放的页面（文档/条款等）暂用 # 占位。
 */
export function SiteFooter() {
  const columns = [
    {
      title: "产品",
      links: [
        { label: "功能特性", href: "/#capabilities" },
        { label: "创作模式", href: "/#modes" },
        { label: "定价方案", href: "/pricing" },
        { label: "更新日志", href: "/changelog" },
      ],
    },
    {
      title: "资源",
      links: [
        { label: "创作指南", href: "/guide" },
        { label: "常见问题", href: "/faq" },
        { label: "API 文档", href: "/api-docs" },
      ],
    },
    {
      title: "公司",
      links: [
        { label: "关于我们", href: "/about" },
        { label: "联系我们", href: "mailto:hello@mobi.ai" },
        { label: "加入我们", href: "/about#join" },
      ],
    },
  ];

  return (
    <footer className="mt-10 border-t border-border-neutral-l1 bg-bg-base-default/70">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* 品牌 */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2" prefetch>
              <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]">
                <PenLine className="h-4 w-4 text-text-onbrand" />
              </span>
              <span className="text-lg font-semibold text-text-default">墨笔</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-tertiary">
              AI 全流程协作的写小说平台。从一句灵感，到一本成稿。
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-neutral-l1 text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@mobi.ai"
                aria-label="邮件联系"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-neutral-l1 text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* 链接分栏 */}
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <div className="mb-3 text-sm font-medium text-text-default">{col.title}</div>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-tertiary transition-colors hover:text-text-default"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* 版权条 */}
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border-neutral-l1 pt-6 text-xs text-text-tertiary sm:flex-row sm:items-center">
          <span>© 2026 墨笔 AI · 让 AI 与你共写一本小说</span>
          <span className="flex gap-4">
            <Link href="/terms" className="transition-colors hover:text-text-default">服务条款</Link>
            <Link href="/privacy" className="transition-colors hover:text-text-default">隐私政策</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
