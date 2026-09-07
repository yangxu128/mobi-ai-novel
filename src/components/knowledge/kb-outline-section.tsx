"use client";

/**
 * 知识库管理界面 —— 大纲分区。
 * 按卷分组的行列表（章号 + 场景标题 + 摘要 + 要点数 + POV + 章节关联徽标），
 * 新增/编辑（Dialog）/删除（AlertDialog 确认，明示章节关联解除）。
 * plotPoints 编辑为行文本域（每行一条），读取 Array.isArray 防脏数据（对齐 step4）。
 */

import { useMemo, useState } from "react";
import { Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { saveOutlineItemAction, deleteOutlineItemAction } from "@/actions/knowledge";
import type { CharacterView } from "@/types/knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

const CN_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function volumeLabel(n: number | null | undefined): string {
  if (n == null) return "未分卷";
  if (n <= 0) return `卷${n}`;
  if (n <= 10) return `卷${CN_NUM[n] || n}`;
  if (n < 20) return `卷十${CN_NUM[n - 10] || ""}`;
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `卷${CN_NUM[t]}十${u ? CN_NUM[u] : ""}`;
  }
  return `卷${n}`;
}

export interface OutlineItem {
  id: string;
  volume: number;
  chapter: number;
  sceneTitle: string;
  sceneSummary: string;
  povCharacterId: string | null;
  plotPoints: unknown;
  foreshadowing: string | null;
  order: number;
}

interface OutlineDraft {
  id?: string;
  volume: number;
  chapter: number;
  sceneTitle: string;
  sceneSummary: string;
  povCharacterId: string;
  plotPointsText: string;
  foreshadowing: string;
}

function readPlotPoints(pp: unknown): string[] {
  if (Array.isArray(pp)) return pp.filter((p): p is string => typeof p === "string");
  if (typeof pp === "string") {
    try {
      const parsed = JSON.parse(pp);
      return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function KbOutlineSection({
  projectId,
  outlines,
  characters,
  chapters,
  embedded,
  emptyText,
}: {
  projectId: string;
  outlines: OutlineItem[];
  characters: CharacterView[];
  chapters: Array<{ id: string; title: string; outline?: { id: string } | null }>;
  /** 嵌入工作台右侧栏时隐藏分区大标题（页签已标明分区），按钮改紧凑 */
  embedded?: boolean;
  /** 自定义空态文案（如工作台"当前章节未关联大纲"） */
  emptyText?: string;
}) {
  const [dialog, setDialog] = useState<OutlineDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<OutlineItem | null>(null);

  const charNameById = useMemo(
    () => new Map(characters.map((c) => [c.id, c.name])),
    [characters]
  );
  // 按卷分组（保持 order 排序）
  const groups = useMemo(() => {
    const map = new Map<number, OutlineItem[]>();
    for (const o of outlines) {
      const list = map.get(o.volume) || [];
      list.push(o);
      map.set(o.volume, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [outlines]);

  function openNew() {
    setIsNew(true);
    // 默认接在最后一条之后
    const last = outlines[outlines.length - 1];
    setDialog({
      volume: last?.volume ?? 1,
      chapter: (last?.chapter ?? 0) + 1,
      sceneTitle: "",
      sceneSummary: "",
      povCharacterId: "",
      plotPointsText: "",
      foreshadowing: "",
    });
  }

  function openEdit(o: OutlineItem) {
    setIsNew(false);
    setDialog({
      id: o.id,
      volume: o.volume,
      chapter: o.chapter,
      sceneTitle: o.sceneTitle,
      sceneSummary: o.sceneSummary,
      povCharacterId: o.povCharacterId || "",
      plotPointsText: readPlotPoints(o.plotPoints).join("\n"),
      foreshadowing: o.foreshadowing || "",
    });
  }

  async function onSave() {
    if (!dialog) return;
    if (!dialog.sceneTitle.trim()) {
      toast({ title: "请填写场景标题", type: "warning" });
      return;
    }
    setSaving(true);
    const res = await saveOutlineItemAction({
      projectId,
      id: dialog.id,
      volume: dialog.volume || 1,
      chapter: dialog.chapter || 1,
      sceneTitle: dialog.sceneTitle.trim(),
      sceneSummary: dialog.sceneSummary,
      povCharacterId: dialog.povCharacterId || null,
      plotPoints: dialog.plotPointsText.split("\n").map((s) => s.trim()).filter(Boolean),
      foreshadowing: dialog.foreshadowing || null,
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "保存失败", description: res.error, type: "error" });
      return;
    }
    setDialog(null);
    toast({ title: isNew ? "已添加大纲条目" : "已保存", type: "success" });
  }

  async function onDelete() {
    if (!deleting) return;
    const res = await deleteOutlineItemAction(deleting.id);
    if (!res.ok) {
      toast({ title: "删除失败", description: res.error, type: "error" });
      return;
    }
    setDeleting(null);
    toast({ title: "已删除", type: "success" });
  }

  return (
    <div>
      <div className={embedded ? "flex justify-end" : "flex items-center justify-between"}>
        {!embedded && (
          <div>
            <h2 className="text-base font-semibold text-text-default">情节大纲</h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              结构化大纲，章节扩写的依据；可在流水线「大纲」步骤批量生成章节
            </p>
          </div>
        )}
        <Button
          onClick={openNew}
          className={embedded ? "h-7 rounded-lg px-2.5 text-xs" : "h-8 rounded-xl px-3 text-xs"}
        >
          <Plus className="h-3.5 w-3.5" /> 新增{embedded ? "" : "条目"}
        </Button>
      </div>

      <div className={embedded ? "mt-2 space-y-5" : "mt-4 space-y-5"}>
        {outlines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-neutral-l2 py-14 text-center text-sm text-text-tertiary">
            {emptyText ??
              (embedded
                ? "暂无大纲，点击上方「新增」开始"
                : "暂无大纲条目，点击右上角「新增条目」开始")}
          </div>
        )}
        {groups.map(([volume, items]) => (
          <div key={volume}>
            <div className="mb-2 text-xs font-medium text-text-secondary">{volumeLabel(volume)}</div>
            <div className="space-y-2">
              {items.map((o) => {
                const linked = chapters.some((c) => c.outline?.id === o.id);
                const points = readPlotPoints(o.plotPoints).length;
                return (
                  <div
                    key={o.id}
                    className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-4 transition-colors hover:border-border-brand"
                    onClick={() => openEdit(o)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="num shrink-0 rounded bg-bg-brand-popup px-1.5 py-0.5 text-[10px] text-text-brand">
                          第{o.chapter}章
                        </span>
                        <span className="truncate text-sm font-medium text-text-default">{o.sceneTitle}</span>
                        {o.povCharacterId && charNameById.has(o.povCharacterId) && (
                          <span className="shrink-0 rounded bg-bg-overlay-l1 px-1.5 py-0.5 text-[10px] text-text-tertiary">
                            {charNameById.get(o.povCharacterId)} 视角
                          </span>
                        )}
                        {linked && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded bg-bg-overlay-l1 px-1.5 py-0.5 text-[10px] text-text-tertiary">
                            <Link2 className="h-3 w-3" /> 已关联章节
                          </span>
                        )}
                      </div>
                      {o.sceneSummary && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-tertiary">
                          {o.sceneSummary}
                        </p>
                      )}
                      {(points > 0 || o.foreshadowing) && (
                        <div className="mt-1.5 text-[10px] text-text-tertiary">
                          {points > 0 && <span>{points} 个情节要点</span>}
                          {points > 0 && o.foreshadowing && <span> · </span>}
                          {o.foreshadowing && <span>伏笔：{o.foreshadowing}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-text-tertiary" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); setDeleting(o); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-text-tertiary" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 编辑/新增弹窗 */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader className="p-0 pr-8">
            <DialogTitle>{isNew ? "新增大纲条目" : "编辑大纲条目"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>卷号</Label>
                <Input
                  type="number"
                  min={1}
                  value={dialog?.volume ?? 1}
                  onChange={(e) =>
                    setDialog((d) => (d ? { ...d, volume: Number(e.target.value) || 1 } : d))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>章号</Label>
                <Input
                  type="number"
                  min={1}
                  value={dialog?.chapter ?? 1}
                  onChange={(e) =>
                    setDialog((d) => (d ? { ...d, chapter: Number(e.target.value) || 1 } : d))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>视角角色</Label>
                <Select
                  value={dialog?.povCharacterId || "none"}
                  onValueChange={(v) =>
                    setDialog((d) => (d ? { ...d, povCharacterId: v === "none" ? "" : v } : d))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="未指定" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未指定</SelectItem>
                    {characters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>场景标题</Label>
              <Input
                value={dialog?.sceneTitle ?? ""}
                onChange={(e) => setDialog((d) => (d ? { ...d, sceneTitle: e.target.value } : d))}
                placeholder="如：雨夜追凶"
              />
            </div>
            <div className="space-y-1.5">
              <Label>场景摘要</Label>
              <Textarea
                value={dialog?.sceneSummary ?? ""}
                onChange={(e) => setDialog((d) => (d ? { ...d, sceneSummary: e.target.value } : d))}
                rows={3}
                placeholder="本章情节概要"
              />
            </div>
            <div className="space-y-1.5">
              <Label>情节要点（每行一条）</Label>
              <Textarea
                value={dialog?.plotPointsText ?? ""}
                onChange={(e) =>
                  setDialog((d) => (d ? { ...d, plotPointsText: e.target.value } : d))
                }
                rows={4}
                placeholder={"发现线索\n遭遇伏击\n解开谜团"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>伏笔</Label>
              <Input
                value={dialog?.foreshadowing ?? ""}
                onChange={(e) => setDialog((d) => (d ? { ...d, foreshadowing: e.target.value } : d))}
                placeholder="本章埋设或回收的伏笔（可选）"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialog(null)}>取消</Button>
            <Button className="rounded-xl" onClick={onSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>删除「第{deleting?.chapter}章 {deleting?.sceneTitle}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后若该大纲已关联章节，关联将自动解除（章节内容保留）。此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
              onClick={onDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
