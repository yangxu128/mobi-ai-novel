"use client";

/**
 * 「平台模型」面板：绑定/管理平台账号，同步官方模型。
 * 未绑定 → 引导绑定；已绑定 → 积分/订阅概览 + 同步/解绑/购买套餐。
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  RefreshCw,
  Link2,
  Unlink,
  Star,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  bindPlatformAction,
  unbindPlatformAction,
  syncPlatformModelsAction,
  refreshPlatformQuotaAction,
  setDefaultModelAction,
} from "@/actions/ai-settings";
import { toast } from "@/components/ui/toast";
import type { ProviderVM, PlatformQuotaVM } from "./settings-client";

const PLATFORM_URL = (
  process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const PLAN_NAMES: Record<string, string> = {
  FREE: "免费版",
  BASIC: "基础版",
  STANDARD: "标准版",
  PRO: "专业版",
  ULTIMATE: "旗舰版",
};

function planName(plan?: string | null): string {
  if (!plan) return "无订阅";
  return PLAN_NAMES[plan] || plan;
}

export function PlatformPanel({
  providers,
  initialQuota,
  onChanged,
}: {
  providers: ProviderVM[];
  initialQuota: PlatformQuotaVM | null;
  onChanged: () => void;
}) {
  const router = useRouter();
  const official = providers.find((p) => p.type === "official");
  const [quota, setQuota] = useState<PlatformQuotaVM | null>(initialQuota);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [binding, setBinding] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onBind(e: React.FormEvent) {
    e.preventDefault();
    setBinding(true);
    const res = await bindPlatformAction({ email, password });
    setBinding(false);
    if (!res.ok) {
      toast({ title: "绑定失败", description: res.error, type: "error" });
      return;
    }
    toast({
      title: "绑定成功",
      description: `已同步 ${res.modelCount ?? 0} 个官方模型`,
    });
    setPassword("");
    onChanged();
    router.refresh();
  }

  function onUnbind() {
    startTransition(async () => {
      const res = await unbindPlatformAction();
      if (!res.ok) {
        toast({ title: "解绑失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: "已解绑平台账号" });
      setQuota(null);
      onChanged();
      router.refresh();
    });
  }

  function onSyncModels() {
    startTransition(async () => {
      const res = await syncPlatformModelsAction();
      if (!res.ok) {
        toast({ title: "同步失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: "同步完成", description: `共 ${res.modelCount ?? 0} 个官方模型` });
      onChanged();
      router.refresh();
    });
  }

  function onRefreshQuota() {
    startTransition(async () => {
      const res = await refreshPlatformQuotaAction();
      if (!res.ok) {
        toast({ title: "查询失败", description: res.error, type: "error" });
        return;
      }
      setQuota({ quota: res.quota, subscription: res.subscription });
    });
  }

  function onSetDefault(ref: string) {
    startTransition(async () => {
      const res = await setDefaultModelAction(ref);
      if (!res.ok) {
        toast({ title: "设置失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: "已设为默认模型" });
      onChanged();
      router.refresh();
    });
  }

  /* ---------- 未绑定：引导 + 绑定表单 ---------- */
  if (!official) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-overlay-l1">
              <Cloud className="h-4.5 w-4.5 text-icon-secondary" />
            </span>
            <h2 className="text-base font-semibold text-text-default">平台模型</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            绑定平台账号后即可使用官方模型，按云端套餐积分计费，无需自备 API Key。
            未绑定或不购买套餐时，可随时在「自定义模型」中添加自己的模型使用。
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-bg-overlay-l1 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-icon-secondary" />
            <p className="text-xs leading-5 text-text-tertiary">
              绑定凭证仅保存在本机，有效期 90 天；生成请求由本机直达平台，正文数据不经过第三方。
            </p>
          </div>
        </div>

        <form
          onSubmit={onBind}
          className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-6"
        >
          <h3 className="text-sm font-semibold text-text-default">绑定平台账号</h3>
          <div className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="平台账号邮箱"
              className="auth-input"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="auth-input"
            />
          </div>
          <button
            type="submit"
            disabled={binding}
            className="mt-5 h-10 rounded-full bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
          >
            {binding ? "绑定中..." : "绑定"}
          </button>
          <p className="mt-4 text-xs text-text-tertiary">
            还没有平台账号？
            <a
              href={`${PLATFORM_URL}/register`}
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline underline-offset-2 text-text-secondary hover:text-text-default"
            >
              前往注册
            </a>
          </p>
        </form>
      </div>
    );
  }

  /* ---------- 已绑定：概览 + 操作 + 模型列表 ---------- */
  const q = quota?.quota;
  const sub = quota?.subscription;
  const busy = pending;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-overlay-l1">
              <Link2 className="h-4.5 w-4.5 text-icon-secondary" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text-default">已绑定平台账号</h2>
              <p className="mt-0.5 text-xs text-text-tertiary">{official.baseUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshQuota}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-neutral-l2 bg-white px-4 text-xs font-medium text-text-default transition-colors hover:bg-neutral-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              刷新
            </button>
            <a
              href={`${PLATFORM_URL}/pricing`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
            >
              购买套餐
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-bg-overlay-l1 px-4 py-3">
            <p className="text-xs text-text-tertiary">套餐</p>
            <p className="mt-1 text-sm font-semibold text-text-default">
              {q
                ? q.unlimited
                  ? "不限量"
                  : planName(sub?.plan)
                : "查询失败"}
            </p>
          </div>
          <div className="rounded-xl bg-bg-overlay-l1 px-4 py-3">
            <p className="text-xs text-text-tertiary">可用积分</p>
            <p className="mt-1 text-sm font-semibold text-text-default">
              {q ? (q.unlimited ? "不限" : q.available) : "-"}
            </p>
          </div>
          <div className="rounded-xl bg-bg-overlay-l1 px-4 py-3">
            <p className="text-xs text-text-tertiary">本月已用</p>
            <p className="mt-1 text-sm font-semibold text-text-default">
              {q ? (q.unlimited ? "-" : q.monthlyUsed) : "-"}
            </p>
          </div>
          <div className="rounded-xl bg-bg-overlay-l1 px-4 py-3">
            <p className="text-xs text-text-tertiary">签到积分</p>
            <p className="mt-1 text-sm font-semibold text-text-default">
              {q ? (q.unlimited ? "-" : q.bonusBalance) : "-"}
            </p>
          </div>
        </div>

        {q && !q.unlimited && q.available <= 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-status-error/30 bg-status-error/5 px-4 py-3">
            <p className="text-xs text-status-error">
              平台积分不足，官方模型暂不可用；可购买套餐或改用自定义模型
            </p>
            <a
              href={`${PLATFORM_URL}/pricing`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-medium text-status-error underline underline-offset-2"
            >
              去购买
            </a>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-default">
            官方模型（{official.models.length}）
          </h3>
          <button
            onClick={onSyncModels}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-neutral-l2 bg-white px-3 text-xs font-medium text-text-default transition-colors hover:bg-neutral-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
            同步官方模型
          </button>
        </div>

        {official.models.length === 0 ? (
          <p className="mt-4 text-sm text-text-tertiary">
            暂无模型，点击「同步官方模型」从平台拉取
          </p>
        ) : (
          <div className="mt-4 space-y-1.5">
            {official.models.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-overlay-l1"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-default">{m.name}</p>
                  <p className="truncate text-xs text-text-tertiary">{m.modelId}</p>
                </div>
                {m.isDefault ? (
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                    <Star className="h-3.5 w-3.5" />
                    默认
                  </span>
                ) : (
                  <button
                    onClick={() => onSetDefault(`${m.modelId}@${official.id}`)}
                    disabled={busy}
                    className="text-xs text-text-tertiary transition-colors hover:text-text-default disabled:opacity-60"
                  >
                    设为默认
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onUnbind}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-neutral-l2 bg-white px-4 text-xs font-medium text-status-error transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          <Unlink className="h-3.5 w-3.5" />
          解绑平台账号
        </button>
      </div>
    </div>
  );
}
