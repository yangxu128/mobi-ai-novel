import Link from "next/link";
import { PenLine } from "lucide-react";

const STATS = [
  { v: "3 种", l: "创作模式", dot: "bg-bg-brand" },
  { v: "6 步", l: "创作流水线", dot: "bg-[#F2A90C]" },
  { v: "10-16K", l: "上下文窗口", dot: "bg-[#FFB25C]" },
  { v: "500 字/天", l: "免费 AI 续写", dot: "bg-[#FF7A5C]" },
];

/**
 * 登录/注册页左侧品牌视觉面板：
 * 柔和暖色渐变底 + Logo + 营销大字 + 产品指标（千问式左右分栏）
 */
export function AuthArtworkPanel() {
  return (
    <div className="auth-artwork relative m-5 hidden w-[calc(50%-1.25rem)] flex-col justify-between overflow-hidden rounded-[2rem] p-10 lg:flex">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5" prefetch>
        <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl shadow-[var(--shadow-glow)]">
          <PenLine className="h-5 w-5 text-white" />
        </span>
        <span className="text-xl font-bold tracking-tight text-text-default">墨笔</span>
        <span className="text-sm text-text-secondary">AI 写作平台</span>
      </Link>

      {/* 底部营销区 */}
      <div>
        <div className="text-[2.6rem] font-bold leading-[1.25] tracking-tight text-text-default">
          新用户注册即送
          <br />
          <span className="brand-gradient-text">每日 500 字</span> AI 续写额度
        </div>
        <div className="mt-10 grid grid-cols-4 gap-5">
          {STATS.map((s) => (
            <div key={s.l}>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                <span className="num text-lg font-bold tracking-tight text-text-default">{s.v}</span>
              </div>
              <div className="mt-1 text-xs text-text-secondary">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
