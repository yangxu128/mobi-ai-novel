import type { LucideIcon } from "lucide-react";

/**
 * 后台统一页面头部：左侧图标徽章 + 标题/描述，右侧统计元信息。
 * 四个后台页面共用，保证版式一致。
 */
export function AdminPageHeader({
  icon: Icon,
  chipClass,
  title,
  description,
  meta,
}: {
  icon: LucideIcon;
  /** 图标徽章配色类（chip-* 或自定义） */
  chipClass: string;
  title: string;
  description: string;
  /** 右侧元信息，如 "共 12 个用户" */
  meta?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${chipClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-default">{title}</h1>
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      {meta && (
        <div className="rounded-full border border-border-neutral-l1 bg-bg-base-default px-3.5 py-1.5 text-xs text-text-tertiary shadow-[var(--shadow-card)]">
          {meta}
        </div>
      )}
    </div>
  );
}
