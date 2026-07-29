"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Pencil, Globe, User } from "lucide-react";
import { saveWorldSettingAction, saveCharacterAction, deleteWorldSettingAction, deleteCharacterAction } from "@/actions/knowledge";
import { toast } from "@/components/ui/toast";

interface WorldSetting {
  id: string;
  category: string;
  title: string;
  content: unknown;
}

interface Character {
  id: string;
  name: string;
  role: string;
  appearance?: string | null;
  personality?: string | null;
  background?: string | null;
  motivation?: string | null;
  arc?: string | null;
}

const categoryLabel: Record<string, string> = {
  BACKGROUND: "时代背景",
  GEOGRAPHY: "地理",
  RULE: "社会规则",
  SYSTEM: "力量体系",
  OTHER: "其他",
};

const roleLabel: Record<string, string> = {
  PROTAGONIST: "主角",
  SUPPORTING: "配角",
  ANTAGONIST: "反派",
  EXTRA: "路人",
};

export function KnowledgeSidebar({
  projectId,
  worldSettings,
  characters,
}: {
  projectId: string;
  worldSettings: WorldSetting[];
  characters: Character[];
}) {
  return (
    <div className="h-full flex flex-col border-l bg-background">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold">知识库</h3>
        <p className="text-xs text-muted-foreground mt-0.5">世界观与角色卡，AI 写作时自动检索</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* 世界观 */}
          <Accordion type="multiple" defaultValue={["world", "char"]}>
            <AccordionItem value="world">
              <div className="flex items-center justify-between pr-2">
                <AccordionTrigger className="text-sm font-medium py-2">
                  <span className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" />
                    世界观 ({worldSettings.length})
                  </span>
                </AccordionTrigger>
                <AddWorldDialog projectId={projectId} />
              </div>
              <AccordionContent className="space-y-2">
                {worldSettings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无世界观</p>
                ) : (
                  worldSettings.map((w) => (
                    <WorldCard key={w.id} projectId={projectId} ws={w} />
                  ))
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="char">
              <div className="flex items-center justify-between pr-2">
                <AccordionTrigger className="text-sm font-medium py-2">
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    角色卡 ({characters.length})
                  </span>
                </AccordionTrigger>
                <AddCharDialog projectId={projectId} />
              </div>
              <AccordionContent className="space-y-2">
                {characters.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无角色</p>
                ) : (
                  characters.map((c) => (
                    <CharCard key={c.id} projectId={projectId} c={c} />
                  ))
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

function WorldCard({ projectId, ws }: { projectId: string; ws: WorldSetting }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(ws.title);
  const [category, setCategory] = useState(ws.category);
  const contentText =
    typeof ws.content === "string"
      ? ws.content
      : (ws.content as { text?: string })?.text || JSON.stringify(ws.content);
  const [content, setContent] = useState(contentText);

  async function save() {
    const res = await saveWorldSettingAction({
      projectId,
      id: ws.id,
      title,
      category: category as "BACKGROUND" | "GEOGRAPHY" | "RULE" | "SYSTEM" | "OTHER",
      content: { text: content },
    });
    if (res.ok) {
      toast({ title: "已保存", type: "success" });
      setEditing(false);
    } else {
      toast({ title: "保存失败", description: res.error, type: "error" });
    }
  }

  async function del() {
    await deleteWorldSettingAction(ws.id);
    toast({ title: "已删除", type: "success" });
  }

  return (
    <div className="rounded-md border p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{ws.title}</span>
        <div className="flex">
          <button onClick={() => setEditing(!editing)} className="p-1 hover:bg-accent rounded">
            <Pencil className="h-3 w-3" />
          </button>
          <button onClick={del} className="p-1 hover:bg-accent rounded text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">{categoryLabel[ws.category] || ws.category}</span>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-7 text-xs"
          />
          <select
            className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(categoryLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="text-xs"
          />
          <Button size="sm" className="w-full h-7" onClick={save}>保存</Button>
        </div>
      ) : (
        <p className="text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">{contentText}</p>
      )}
    </div>
  );
}

function CharCard({ projectId, c }: { projectId: string; c: Character }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: c.name,
    role: c.role,
    appearance: c.appearance || "",
    personality: c.personality || "",
    background: c.background || "",
    motivation: c.motivation || "",
    arc: c.arc || "",
  });

  async function save() {
    const res = await saveCharacterAction({
      projectId,
      id: c.id,
      name: form.name,
      role: form.role as "PROTAGONIST" | "SUPPORTING" | "ANTAGONIST" | "EXTRA",
      appearance: form.appearance,
      personality: form.personality,
      background: form.background,
      motivation: form.motivation,
      arc: form.arc,
    });
    if (res.ok) {
      toast({ title: "已保存", type: "success" });
      setEditing(false);
    } else {
      toast({ title: "保存失败", description: res.error, type: "error" });
    }
  }

  async function del() {
    await deleteCharacterAction(c.id);
    toast({ title: "已删除", type: "success" });
  }

  return (
    <div className="rounded-md border p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{c.name}</span>
        <div className="flex">
          <button onClick={() => setEditing(!editing)} className="p-1 hover:bg-accent rounded">
            <Pencil className="h-3 w-3" />
          </button>
          <button onClick={del} className="p-1 hover:bg-accent rounded text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">{roleLabel[c.role] || c.role}</span>
      {editing ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-1">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-7 text-xs"
              placeholder="姓名"
            />
            <select
              className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {Object.entries(roleLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Textarea
            value={form.appearance}
            onChange={(e) => setForm({ ...form, appearance: e.target.value })}
            rows={2}
            placeholder="外貌"
            className="text-xs"
          />
          <Textarea
            value={form.personality}
            onChange={(e) => setForm({ ...form, personality: e.target.value })}
            rows={2}
            placeholder="性格"
            className="text-xs"
          />
          <Textarea
            value={form.background}
            onChange={(e) => setForm({ ...form, background: e.target.value })}
            rows={2}
            placeholder="背景"
            className="text-xs"
          />
          <Textarea
            value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            rows={2}
            placeholder="动机"
            className="text-xs"
          />
          <Button size="sm" className="w-full h-7" onClick={save}>保存</Button>
        </div>
      ) : (
        <div className="mt-1 space-y-0.5 text-muted-foreground">
          {c.personality && <p>性格：{c.personality}</p>}
          {c.motivation && <p>动机：{c.motivation}</p>}
        </div>
      )}
    </div>
  );
}

function AddWorldDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("BACKGROUND");
  const [content, setContent] = useState("");

  async function save() {
    const res = await saveWorldSettingAction({
      projectId,
      title,
      category: category as "BACKGROUND" | "GEOGRAPHY" | "RULE" | "SYSTEM" | "OTHER",
      content: { text: content },
    });
    if (res.ok) {
      toast({ title: "已添加", type: "success" });
      setOpen(false);
      setTitle("");
      setContent("");
    } else {
      toast({ title: "添加失败", description: res.error, type: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1 hover:bg-accent rounded">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增世界观设定</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>分类</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {Object.entries(categoryLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：货币体系" />
          </div>
          <div className="space-y-1">
            <Label>内容</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={save} disabled={!title}>添加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCharDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "SUPPORTING",
    appearance: "",
    personality: "",
    background: "",
    motivation: "",
    arc: "",
  });

  async function save() {
    const res = await saveCharacterAction({
      projectId,
      name: form.name,
      role: form.role as "PROTAGONIST" | "SUPPORTING" | "ANTAGONIST" | "EXTRA",
      appearance: form.appearance,
      personality: form.personality,
      background: form.background,
      motivation: form.motivation,
      arc: form.arc,
    });
    if (res.ok) {
      toast({ title: "已添加", type: "success" });
      setOpen(false);
      setForm({ name: "", role: "SUPPORTING", appearance: "", personality: "", background: "", motivation: "", arc: "" });
    } else {
      toast({ title: "添加失败", description: res.error, type: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1 hover:bg-accent rounded">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增角色</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>姓名</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>定位</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {Object.entries(roleLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>外貌</Label>
            <Textarea value={form.appearance} onChange={(e) => setForm({ ...form, appearance: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>性格</Label>
            <Textarea value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>背景</Label>
            <Textarea value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>动机</Label>
            <Textarea value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={save} disabled={!form.name}>添加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
