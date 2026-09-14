"use client";

/**
 * 「自定义模型」面板（BYOK）：Provider 卡片列表 + 模型管理。
 * 添加流程：选预设（自动带出 baseUrl 与常用模型）或完全自定义 → 填 Key → 创建。
 * 模型管理：手填添加 / 拉取远端列表勾选导入 / 设全局默认 / 删除。
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Star,
  Trash2,
  Pencil,
  ChevronDown,
  RefreshCw,
  Server,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addCustomProviderAction,
  updateCustomProviderAction,
  deleteProviderAction,
  addModelsAction,
  deleteModelAction,
  setDefaultModelAction,
} from "@/actions/ai-settings";
import { PROVIDER_PRESETS } from "@/lib/ai/presets";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ProviderVM } from "./settings-client";

export function CustomPanel({
  providers,
  onChanged,
}: {
  providers: ProviderVM[];
  onChanged: () => void;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(
    providers[0]?.id || null
  );
  const [, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okTitle: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast({ title: okTitle + "失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: okTitle });
      onChanged();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          使用自己的 API Key 直连服务商，完全免费，不消耗平台积分
        </p>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
        >
          <Plus className="h-3.5 w-3.5" />
          添加服务商
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-neutral-l2 bg-bg-base-default/60 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-overlay-l1">
            <Server className="h-5 w-5 text-text-tertiary" />
          </span>
          <p className="mt-4 text-sm text-text-secondary">尚未添加自定义模型</p>
          <p className="mt-1 text-xs text-text-tertiary">
            支持 OpenAI、DeepSeek、豆包、智谱、Kimi、Ollama 等任意 OpenAI 协议接口
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-full bg-neutral-900 px-5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
          >
            <Plus className="h-3.5 w-3.5" />
            添加服务商
          </button>
        </div>
      ) : (
        providers.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            expanded={expandedId === p.id}
            onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
            onSetDefault={() =>
              run(
                () => setDefaultModelAction(p.models[0] ? `${p.models[0].modelId}@${p.id}` : null),
                "已设为默认服务商"
              )
            }
            onDelete={() => run(() => deleteProviderAction(p.id), "已删除")}
            onChanged={onChanged}
          />
        ))
      )}

      <AddProviderDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          onChanged();
          router.refresh();
        }}
      />
    </div>
  );
}

/* ------------------------------ Provider 卡片 ------------------------------ */

function ProviderCard({
  provider,
  expanded,
  onToggle,
  onDelete,
  onChanged,
}: {
  provider: ProviderVM;
  expanded: boolean;
  onToggle: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okTitle: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast({ title: okTitle + "失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: okTitle });
      onChanged();
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default">
      <div className="flex items-center justify-between px-6 py-4">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-overlay-l1">
            <Server className="h-4.5 w-4.5 text-icon-secondary" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-text-default">{provider.name}</p>
              {provider.isDefault && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-bg-overlay-l2 px-2 py-0.5 text-[11px] text-text-secondary">
                  <Star className="h-3 w-3" />
                  默认
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-text-tertiary">
              {provider.baseUrl} · {provider.models.length} 个模型 · {provider.apiKeyMasked || "未配置 Key"}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-tertiary transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setEditOpen(true)}
            title="编辑"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="删除"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-status-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border-neutral-l1 px-6 py-4">
          {provider.models.length === 0 ? (
            <p className="text-sm text-text-tertiary">暂无模型，请在下方添加或从远端拉取</p>
          ) : (
            <div className="space-y-1.5">
              {provider.models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-overlay-l1"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text-default">{m.name}</p>
                    <p className="truncate text-xs text-text-tertiary">{m.modelId}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {m.isDefault ? (
                      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                        <Star className="h-3.5 w-3.5" />
                        默认
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          run(
                            () => setDefaultModelAction(`${m.modelId}@${provider.id}`),
                            "已设为默认模型"
                          )
                        }
                        className="text-xs text-text-tertiary transition-colors hover:text-text-default"
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      onClick={() => run(() => deleteModelAction(m.id), "已删除模型")}
                      className="text-text-tertiary transition-colors hover:text-status-error"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <ModelAdder providerId={provider.id} onChanged={onChanged} />
        </div>
      )}

      <EditProviderDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        provider={provider}
        onDone={() => {
          onChanged();
          router.refresh();
        }}
      />
    </div>
  );
}

/* ------------------------------ 模型添加/拉取 ------------------------------ */

function ModelAdder({
  providerId,
  onChanged,
}: {
  providerId: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [modelId, setModelId] = useState("");
  const [name, setName] = useState("");
  const [probing, setProbing] = useState(false);
  const [remote, setRemote] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function addManual() {
    if (!modelId.trim()) {
      toast({ title: "请填写模型 ID", type: "warning" });
      return;
    }
    startTransition(async () => {
      const res = await addModelsAction({
        providerId,
        models: [{ modelId, name: name || modelId }],
      });
      if (!res.ok) {
        toast({ title: "添加失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: "已添加模型" });
      setModelId("");
      setName("");
      onChanged();
      router.refresh();
    });
  }

  async function probe() {
    setProbing(true);
    setRemote(null);
    setSelected(new Set());
    try {
      const r = await fetch(`/api/ai/models?probeProviderId=${providerId}`);
      const data = (await r.json()) as { models?: { id: string; name: string }[]; error?: string };
      if (!r.ok) {
        toast({ title: "拉取失败", description: data.error || "请检查配置", type: "error" });
        return;
      }
      if (!data.models || data.models.length === 0) {
        toast({ title: "远端未返回模型", description: "可手动添加", type: "warning" });
        return;
      }
      setRemote(data.models);
    } catch {
      toast({ title: "拉取失败", description: "网络错误", type: "error" });
    } finally {
      setProbing(false);
    }
  }

  function importSelected() {
    const models = [...selected]
      .map((id) => remote?.find((m) => m.id === id))
      .filter((m): m is { id: string; name: string } => !!m);
    if (models.length === 0) return;
    startTransition(async () => {
      const res = await addModelsAction({
        providerId,
        models: models.map((m) => ({ modelId: m.id, name: m.name })),
      });
      if (!res.ok) {
        toast({ title: "导入失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: `已导入 ${models.length} 个模型` });
      setRemote(null);
      setSelected(new Set());
      onChanged();
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-xl bg-bg-overlay-l1 px-4 py-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className="text-xs text-text-tertiary">模型 ID</label>
          <input
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="如 deepseek-chat"
            className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none placeholder:text-text-quaternary focus:border-neutral-400"
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="text-xs text-text-tertiary">显示名称（可选）</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如 DeepSeek Chat"
            className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none placeholder:text-text-quaternary focus:border-neutral-400"
          />
        </div>
        <button
          onClick={addManual}
          disabled={pending}
          className="h-9 rounded-full bg-neutral-900 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
        >
          添加
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-border-neutral-l1 pt-3">
        <button
          onClick={probe}
          disabled={probing}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-neutral-l2 bg-white px-3 text-xs font-medium text-text-default transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${probing ? "animate-spin" : ""}`} />
          从服务商拉取模型列表
        </button>
        <span className="text-xs text-text-tertiary">失败时可在上方手动添加</span>
      </div>

      {remote && (
        <div className="mt-3 space-y-1">
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-border-neutral-l1 bg-white p-1">
            {remote.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-text-default transition-colors hover:bg-bg-overlay-l1"
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={(e) => {
                    setSelected((s) => {
                      const next = new Set(s);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      return next;
                    });
                  }}
                  className="h-3.5 w-3.5 accent-neutral-900"
                />
                <span className="truncate">{m.id}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">已选 {selected.size} 个</span>
            <button
              onClick={importSelected}
              disabled={pending || selected.size === 0}
              className="h-8 rounded-full bg-neutral-900 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
            >
              导入所选
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ 添加/编辑 Provider Dialog ------------------------------ */

function AddProviderDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [presetKey, setPresetKey] = useState("openai");
  const preset = PROVIDER_PRESETS.find((p) => p.key === presetKey) || PROVIDER_PRESETS[0];
  const [name, setName] = useState(preset.name);
  const [baseUrl, setBaseUrl] = useState(preset.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function choosePreset(key: string) {
    setPresetKey(key);
    const p = PROVIDER_PRESETS.find((x) => x.key === key);
    if (p) {
      setName(p.name);
      setBaseUrl(p.baseUrl);
      setPicked(new Set());
    }
  }

  async function submit() {
    if (!name.trim() || !baseUrl.trim()) {
      toast({ title: "请填写名称与 BaseURL", type: "warning" });
      return;
    }
    setSubmitting(true);
    const models = [...picked]
      .map((id) => preset.models.find((m) => m.modelId === id))
      .filter((m): m is { modelId: string; name: string } => !!m);
    const res = await addCustomProviderAction({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      models,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: "添加失败", description: res.error, type: "error" });
      return;
    }
    toast({ title: "已添加服务商", description: "可在卡片中继续管理模型" });
    onOpenChange(false);
    setApiKey("");
    setPicked(new Set());
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加自定义服务商</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary">预设</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PROVIDER_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => choosePreset(p.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    presetKey === p.key
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-border-neutral-l2 bg-white text-text-default hover:bg-neutral-50"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary">名称</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary">API Key{preset.requiresKey ? "" : "（可留空）"}</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={preset.requiresKey ? "sk-..." : "本地服务可留空"}
                className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none placeholder:text-text-quaternary focus:border-neutral-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-tertiary">BaseURL（OpenAI 协议）</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none placeholder:text-text-quaternary focus:border-neutral-400"
            />
            {preset.hint && (
              <p className="mt-1.5 text-xs text-text-tertiary">{preset.hint}</p>
            )}
          </div>

          {preset.models.length > 0 && (
            <div>
              <label className="text-xs text-text-tertiary">常用模型（创建后也可再管理）</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {preset.models.map((m) => (
                  <button
                    key={m.modelId}
                    onClick={() =>
                      setPicked((s) => {
                        const next = new Set(s);
                        if (next.has(m.modelId)) next.delete(m.modelId);
                        else next.add(m.modelId);
                        return next;
                      })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      picked.has(m.modelId)
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-border-neutral-l2 bg-white text-text-default hover:bg-neutral-50"
                    )}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-full border border-border-neutral-l2 bg-white px-4 text-sm text-text-default transition-colors hover:bg-neutral-50"
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="h-9 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
            >
              {submitting ? "创建中..." : "创建"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProviderDialog({
  open,
  onOpenChange,
  provider,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  provider: ProviderVM;
  onDone: () => void;
}) {
  const [name, setName] = useState(provider.name);
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim() || !baseUrl.trim()) {
      toast({ title: "请填写名称与 BaseURL", type: "warning" });
      return;
    }
    setSubmitting(true);
    const res = await updateCustomProviderAction({
      providerId: provider.id,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: "保存失败", description: res.error, type: "error" });
      return;
    }
    toast({ title: "已保存" });
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑服务商</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary">BaseURL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary">API Key（留空表示不修改）</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="mt-1 h-9 w-full rounded-lg border border-border-neutral-l2 bg-white px-3 text-sm text-text-default outline-none placeholder:text-text-quaternary focus:border-neutral-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-full border border-border-neutral-l2 bg-white px-4 text-sm text-text-default transition-colors hover:bg-neutral-50"
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="h-9 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
            >
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
