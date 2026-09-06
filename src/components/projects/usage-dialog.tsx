"use client";

/**
 * 套餐用量弹窗：当前积分状态 + 本月按功能的 AI 消耗明细。
 * 打开时拉取 /api/quota/usage（积分余额 + AIUsageLog 聚合）。
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { DISPLAY_TZ, formatCount } from "@/lib/utils";

interface UsageItem {
  action: string;
  label: string;
  count: number;
  tokens: number;
  credits: number;
}

interface UsageInfo {
  role: string;
  unlimited: boolean;
  monthlyGranted: number;
  monthlyUsed: number;
  bonusBalance: number;
  available: number;
  resetsAt: string;
  cycleLabel: string;
  totalTokens: number;
  totalCredits: number;
  usage: UsageItem[];
}

const PLAN_NAMES: Record<string, string> = {
  FREE: "免费版",
  BASIC: "基础版",
  STANDARD: "标准版",
  PRO: "专业版",
  ULTIMATE: "旗舰版",
  ADMIN: "管理员",
};

/** tokens 数值格式化：20 万以上显示「x.x 万」 */
function fmtTokens(n: number): string {
  return n >= 100_000 ? `${(n / 10_000).toFixed(1)} 万` : formatCount(n);
}

export function UsageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [info, setInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/quota/usage");
      if (r.ok) setInfo((await r.json()) as UsageInfo);
    } catch {
      // 静默失败：保留上次数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const planName = info ? (PLAN_NAMES[info.role] || info.role) : "";
  const monthlyPct =
    info && info.monthlyGranted > 0
      ? Math.min(100, Math.round((info.monthlyUsed / info.monthlyGranted) * 100))
      : 0;
  const monthlyRemaining = info
    ? Math.max(0, info.monthlyGranted - info.monthlyUsed)
    : 0;
  const resetsText = info
    ? new Date(info.resetsAt).toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        timeZone: DISPLAY_TZ,
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="p-0">
          <DialogTitle>套餐用量</DialogTitle>
        </DialogHeader>

        {loading && !info ? (
          <div className="flex items-center justify-center py-12 text-text-tertiary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            加载中
          </div>
        ) : info ? (
          <div className="space-y-5">
            {/* 总览卡：套餐 + 可用积分 */}
            <div className="rounded-2xl border border-border-neutral-l1 bg-bg-overlay-l2 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">当前套餐</span>
                <span className="rounded-full bg-bg-brand-popup px-2 py-0.5 text-xs font-medium text-text-brand">
                  {planName}
                  {info.unlimited ? "（不限量）" : ""}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-text-default">
                  {info.unlimited ? "不限量" : formatCount(info.available)}
                </span>
                <span className="text-xs text-text-tertiary">可用积分</span>
              </div>

              {/* 月度积分进度 */}
              {!info.unlimited && info.monthlyGranted > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-text-tertiary">
                      本月已用 {formatCount(info.monthlyUsed)} /{" "}
                      {formatCount(info.monthlyGranted)} 积分
                    </span>
                    <span className="text-text-secondary">{monthlyPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-overlay-l1">
                    <div
                      className="brand-gradient h-full rounded-full transition-all"
                      style={{ width: `${monthlyPct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-xs text-text-tertiary">
                    剩余月度积分 {formatCount(monthlyRemaining)}
                    {info.bonusBalance > 0 &&
                      `，签到积分 ${formatCount(info.bonusBalance)}`}
                    ，{resetsText} 重置
                  </div>
                </div>
              )}

              {!info.unlimited && info.monthlyGranted === 0 && (
                <div className="mt-3 text-xs leading-relaxed text-text-tertiary">
                  免费版无月度积分，每日签到领 50 积分（长期有效）
                  {info.bonusBalance > 0 &&
                    `，当前签到积分 ${formatCount(info.bonusBalance)}`}
                </div>
              )}
            </div>

            {/* 本月消耗明细 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-text-default">
                  本月消耗
                </span>
                <span className="text-xs text-text-tertiary">
                  共 {fmtTokens(info.totalTokens)} tokens ≈{" "}
                  {info.totalCredits} 积分
                </span>
              </div>
              {info.usage.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-neutral-l1 py-6 text-center text-xs text-text-tertiary">
                  本月暂无 AI 用量
                </div>
              ) : (
                <div className="divide-y divide-border-neutral-l1 rounded-2xl border border-border-neutral-l1">
                  {info.usage.map((u) => (
                    <div
                      key={u.action}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="block text-[13px] text-text-default">
                          {u.label}
                        </span>
                        <span className="block text-[11px] text-text-tertiary">
                          {u.count} 次
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[13px] text-text-default">
                          {fmtTokens(u.tokens)} tokens
                        </span>
                        <span className="block text-[11px] text-text-tertiary">
                          ≈ {u.credits} 积分
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 说明 + 升级入口 */}
            {!info.unlimited && (
              <>
                <p className="text-xs leading-relaxed text-text-tertiary">
                  计费规则：1 积分 = 4000 tokens，按 AI 实际用量扣减；先扣签到积分再扣月度积分。月度积分每月
                  1 日重置，签到积分长期有效。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/pricing");
                  }}
                  className="h-10 w-full rounded-full bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                >
                  升级套餐
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-text-tertiary">
            加载失败，请关闭后重试
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
