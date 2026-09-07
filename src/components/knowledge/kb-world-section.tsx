"use client";

/**
 * 知识库管理界面 —— 世界观分区。
 * 卡片列表（分类徽标 + 标题 + 内容预览），新增/编辑（Dialog）/删除（AlertDialog 确认）。
 * content 历史数据存在 {text} 包装与纯 string 两种形状，读取兼容、保存统一 {text}。
 */

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { WorldSettingView } from "@/types/knowledge";
import { saveWorldSettingAction, deleteWorldSettingAction } from "@/actions/knowledge";
import { getCategoryLabel } from "@/lib/knowledge/labels";
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

const CATEGORIES = ["BACKGROUND", "GEOGRAPHY", "RULE", "SYSTEM", "OTHER"] as const;
type Category = (typeof CATEGORIES)[number];

/** 从 Json content 中提取纯文本（兼容 {text} 包装与纯 string） */
function readContent(content: unknown): string {
  if (typeof content === "string") return content;
  return (content as { text?: string })?.text || "";
}

export function KbWorldSection({
  projectId,
  genre,
  worldSettings,
  embedded,
}: {
  projectId: string;
  genre?: string | null;
  worldSettings: WorldSettingView[];
  /** 嵌入工作台右侧栏时隐藏分区大标题（页签已标明分区），按钮改紧凑 */
  embedded?: boolean;
}) {
  const [dialog, setDialog] = useState<{ id?: string; category: Category; title: string; content: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<WorldSettingView | null>(null);

  function openNew() {
    setIsNew(true);
    setDialog({ category: "OTHER", title: "", content: "" });
  }

  function openEdit(w: WorldSettingView) {
    setIsNew(false);
    setDialog({
      id: w.id,
      category: (CATEGORIES.includes(w.category as Category) ? w.category : "OTHER") as Category,
      title: w.title,
      content: readContent(w.content),
    });
  }

  async function onSave() {
    if (!dialog) return;
    if (!dialog.title.trim()) {
      toast({ title: "请填写标题", type: "warning" });
      return;
    }
    setSaving(true);
    const res = await saveWorldSettingAction({
      projectId,
      id: dialog.id,
      title: dialog.title.trim(),
      category: dialog.category,
      content: { text: dialog.content },
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "保存失败", description: res.error, type: "error" });
      return;
    }
    setDialog(null);
    toast({ title: isNew ? "已添加世界观条目" : "已保存", type: "success" });
  }

  async function onDelete() {
    if (!deleting) return;
    const res = await deleteWorldSettingAction(deleting.id);
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
            <h2 className="text-base font-semibold text-text-default">世界观</h2>
            <p className="mt-0.5 text-xs text-text-tertiary">设定资料与背景条目，AI 扩写时自动注入上下文</p>
          </div>
        )}
        <Button
          onClick={openNew}
          className={embedded ? "h-7 rounded-lg px-2.5 text-xs" : "h-8 rounded-xl px-3 text-xs"}
        >
          <Plus className="h-3.5 w-3.5" /> 新增{embedded ? "" : "条目"}
        </Button>
      </div>

      <div className={embedded ? "mt-2 space-y-2" : "mt-4 space-y-2"}>
        {worldSettings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-neutral-l2 py-14 text-center text-sm text-text-tertiary">
            {embedded ? "暂无条目，点击上方「新增」开始" : "暂无世界观条目，点击右上角「新增条目」开始"}
          </div>
        )}
        {worldSettings.map((w) => (
          <div
            key={w.id}
            className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-4 transition-colors hover:border-border-brand"
            onClick={() => openEdit(w)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded bg-bg-overlay-l1 px-1.5 py-0.5 text-[10px] text-text-tertiary">
                  {getCategoryLabel(w.category, genre, `${w.title} ${readContent(w.content)}`)}
                </span>
                <span className="truncate text-sm font-medium text-text-default">{w.title}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-tertiary">
                {readContent(w.content) || "(无内容)"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); openEdit(w); }}
              >
                <Pencil className="h-3.5 w-3.5 text-text-tertiary" />
              </Button>
              <Button
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); setDeleting(w); }}
              >
                <Trash2 className="h-3.5 w-3.5 text-text-tertiary" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 编辑/新增弹窗 */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader className="p-0 pr-8">
            <DialogTitle>{isNew ? "新增世界观条目" : "编辑世界观条目"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>标题</Label>
              <Input
                value={dialog?.title ?? ""}
                onChange={(e) => setDialog((d) => (d ? { ...d, title: e.target.value } : d))}
                placeholder="如：修炼体系、宗门势力"
              />
            </div>
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select
                value={dialog?.category}
                onValueChange={(v) => setDialog((d) => (d ? { ...d, category: v as Category } : d))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {getCategoryLabel(c, genre)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>内容</Label>
              <Textarea
                value={dialog?.content ?? ""}
                onChange={(e) => setDialog((d) => (d ? { ...d, content: e.target.value } : d))}
                rows={8}
                placeholder="设定的具体描述"
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
            <AlertDialogTitle>删除「{deleting?.title}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后该条目将从知识库与 AI 生成上下文中移除，此操作不可恢复。
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
