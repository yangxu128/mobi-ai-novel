"use client";

/**
 * 精简版知识库侧边栏（只读展示）。
 * 用于工作台右侧面板，不包含增删改功能。
 */

import { memo } from "react";
import type { WorldSettingView, CharacterView } from "@/types/knowledge";
import { categoryLabel, roleLabel } from "@/lib/knowledge/labels";

export const KnowledgeSidebarCompact = memo(function KnowledgeSidebarCompact({
  worldSettings,
  characters,
}: {
  worldSettings: WorldSettingView[];
  characters: CharacterView[];
}) {
  return (
    <div className="p-3 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold mb-3">知识库</h3>
      <div className="space-y-3">
        <div>
          <div className="text-xs font-medium text-text-tertiary mb-1.5">世界观</div>
          {worldSettings.length === 0 ? (
            <p className="text-xs text-text-tertiary">暂无</p>
          ) : (
            worldSettings.map((w) => (
              <div key={w.id} className="mb-2 p-2 rounded-md bg-bg-overlay-l1 border border-border-neutral-l1">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-text-tertiary">
                    {categoryLabel[w.category] || w.category}
                  </span>
                  <span className="text-xs font-medium truncate">{w.title}</span>
                </div>
                <p className="text-xs text-text-tertiary line-clamp-2">
                  {typeof w.content === "string"
                    ? w.content
                    : (w.content as { text?: string })?.text || JSON.stringify(w.content)}
                </p>
              </div>
            ))
          )}
        </div>
        <div>
          <div className="text-xs font-medium text-text-tertiary mb-1.5">角色</div>
          {characters.length === 0 ? (
            <p className="text-xs text-text-tertiary">暂无</p>
          ) : (
            characters.map((c) => (
              <div key={c.id} className="mb-2 p-2 rounded-md bg-bg-overlay-l1 border border-border-neutral-l1">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-text-tertiary">
                    {roleLabel[c.role] || c.role}
                  </span>
                  <span className="text-xs font-medium">{c.name}</span>
                </div>
                {c.personality && (
                  <p className="text-xs text-text-tertiary line-clamp-1">性格：{c.personality}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
