import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "墨笔 AI 写作平台",
  description: "AI 全流程协作的写小说平台，从灵感到成稿的完整创作链路",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="h-full bg-bg-base-secondary text-text-default antialiased"
        suppressHydrationWarning
      >
        {/* 外部字体：React 19 会把带 precedence 的样式表 link 提升到 <head>。
            不能用 CSS @import —— css-loader 会把它重排到规则中间导致浏览器忽略 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          precedence="default"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=JetBrains+Mono:wght@400;500;600&family=Noto+Serif+SC:wght@600;700;900&display=swap"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
