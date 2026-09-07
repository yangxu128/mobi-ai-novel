"use client";

/**
 * 知识库管理界面 —— 角色分区。
 * 卡片列表（首字头像 + 姓名 + 角色徽标 + 预览），新增/编辑（Dialog 全字段）/删除（AlertDialog 确认）。
 * 字段对齐 saveCharacterAction：name/role/appearance/personality/background/motivation/arc。
 */

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { CharacterView } from "@/types/knowledge";
import { saveCharacterAction, deleteCharacterAction } from "@/actions/knowledge";
import { roleLabel } from "@/lib/knowledge/labels";
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
import { cn } from "@/lib/utils";

const ROLES = ["PROTAGONIST", "SUPPORTING", "ANTAGONIST", "EXTRA"] as const;
type Role = (typeof ROLES)[number];

interface CharDraft {
  id?: string;
  name: string;
  role: Role;
  appearance: string;
  personality: string;
  background: string;
  motivation: string;
  arc: string;
}

const TEXTAREA_FIELDS: Array<{ key: keyof Pick<CharDraft, "appearance" | "personality" | "background" | "motivation" | "arc">; label: string; placeholder: string; rows: number }> = [
  { key: "appearance", label: "外貌", placeholder: "容貌、衣着、体态特征", rows: 2 },
  { key: "personality", label: "性格", placeholder: "性格特质、行事风格", rows: 2 },
  { key: "background", label: "背景", placeholder: "出身、经历", rows: 3 },
  { key: "motivation", label: "动机", placeholder: "核心追求与行为动机", rows: 2 },
  { key: "arc", label: "成长弧光", placeholder: "角色在故事中的成长轨迹", rows: 2 },
];

export function KbCharacterSection({
  projectId,
  characters,
}: {
  projectId: string;
  characters: CharacterView[];
}) {
  const [dialog, setDialog] = useState<CharDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CharacterView | null>(null);

  function openNew() {
    setIsNew(true);
    setDialog({ name: "", role: "SUPPORTING", appearance: "", personality: "", background: "", motivation: "", arc: "" });
  }

  function openEdit(c: CharacterView) {
    setIsNew(false);
    setDialog({
      id: c.id,
      name: c.name,
      role: (ROLES.includes(c.role as Role) ? c.role : "SUPPORTING") as Role,
      appearance: c.appearance || "",
      personality: c.personality || "",
      background: c.background || "",
      motivation: c.motivation || "",
      arc: c.arc || "",
    });
  }

  async function onSave() {
    if (!dialog) return;
    if (!dialog.name.trim()) {
      toast({ title: "请填写角色姓名", type: "warning" });
      return;
    }
    setSaving(true);
    const res = await saveCharacterAction({ projectId, ...dialog, name: dialog.name.trim() });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "保存失败", description: res.error, type: "error" });
      return;
    }
    setDialog(null);
    toast({ title: isNew ? "已添加角色" : "已保存", type: "success" });
  }

  async function onDelete() {
    if (!deleting) return;
    const res = await deleteCharacterAction(deleting.id);
    if (!res.ok) {
      toast({ title: "删除失败", description: res.error, type: "error" });
      return;
    }
    setDeleting(null);
    toast({ title: "已删除", type: "success" });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-default">角色</h2>
          <p className="mt-0.5 text-xs text-text-tertiary">角色卡设定，AI 扩写时自动注入上下文</p>
        </div>
        <Button onClick={openNew} className="h-8 rounded-xl px-3 text-xs">
          <Plus className="h-3.5 w-3.5" /> 新增角色
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {characters.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-neutral-l2 py-14 text-center text-sm text-text-tertiary md:col-span-2">
            暂无角色，点击右上角「新增角色」开始
          </div>
        )}
        {characters.map((c) => (
          <div
            key={c.id}
            className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-4 transition-colors hover:border-border-brand"
            onClick={() => openEdit(c)}
          >
            <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-text-onbrand">
              {c.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-text-default">{c.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                    c.role === "PROTAGONIST" && "bg-bg-brand-popup text-text-brand",
                    c.role === "ANTAGONIST" && "bg-red-50 text-red-600",
                    (c.role === "SUPPORTING" || c.role === "EXTRA") && "bg-bg-overlay-l1 text-text-tertiary"
                  )}
                >
                  {roleLabel[c.role] || c.role}
                </span>
              </div>
              {c.personality && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-tertiary">{c.personality}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); openEdit(c); }}
              >
                <Pencil className="h-3.5 w-3.5 text-text-tertiary" />
              </Button>
              <Button
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); setDeleting(c); }}
              >
                <Trash2 className="h-3.5 w-3.5 text-text-tertiary" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 编辑/新增弹窗 */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader className="p-0 pr-8">
            <DialogTitle>{isNew ? "新增角色" : "编辑角色"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>姓名</Label>
                <Input
                  value={dialog?.name ?? ""}
                  onChange={(e) => setDialog((d) => (d ? { ...d, name: e.target.value } : d))}
                  placeholder="角色姓名"
                />
              </div>
              <div className="space-y-1.5">
                <Label>角色定位</Label>
                <Select
                  value={dialog?.role}
                  onValueChange={(v) => setDialog((d) => (d ? { ...d, role: v as Role } : d))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {TEXTAREA_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Textarea
                  value={dialog?.[f.key] ?? ""}
                  onChange={(e) =>
                    setDialog((d) => (d ? { ...d, [f.key]: e.target.value } : d))
                  }
                  rows={f.rows}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
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
            <AlertDialogTitle>删除角色「{deleting?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后该角色卡将从知识库与 AI 生成上下文中移除，已生成章节的正文不受影响。
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
