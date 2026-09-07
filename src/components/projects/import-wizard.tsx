"use client";

/**
 * 导入作品向导（4 步）：
 * 1 输入内容（设定资料 / 章节正文，粘贴或上传 txt/docx）
 * 2 章节切分（本地正则，可编辑预览；无正文时跳过）
 * 3 AI 智能解析（一次调用提取标题/题材/简介/世界观/角色/章节摘要，可跳过）
 * 4 确认导入（项目信息 + 选项 → 单事务落库）
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Trash2,
  Plus,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  FileText,
  BookOpen,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAIStream } from "@/hooks/use-ai-stream";
import { importProjectAction } from "@/actions/import";
import { splitChapters, splitBySize } from "@/lib/import/split-chapters";
import { buildSampleText, summaryChapterOrders } from "@/lib/import/sample-text";
import { parseJsonLoose } from "@/lib/json-tolerant";
import { modeInfo } from "./mode-meta";
import { StylePicker } from "@/components/style/style-picker";
import type { StyleProfile } from "@/lib/ai/style";
import type {
  ImportChapterDraft,
  ImportWorldSetting,
  ImportWorldCategory,
  ImportCharacter,
  ImportCharacterRole,
  ImportAIResult,
} from "@/types/import";

const GENRES = ["玄幻", "都市", "言情", "科幻", "悬疑", "历史", "武侠", "末世", "同人", "其他"];

const WORLD_CATEGORIES: Array<{ value: ImportWorldCategory; label: string }> = [
  { value: "BACKGROUND", label: "时代背景" },
  { value: "GEOGRAPHY", label: "地理地点" },
  { value: "RULE", label: "世界规则" },
  { value: "SYSTEM", label: "组织体系" },
  { value: "OTHER", label: "其他" },
];

const CHARACTER_ROLES: Array<{ value: ImportCharacterRole; label: string }> = [
  { value: "PROTAGONIST", label: "主角" },
  { value: "SUPPORTING", label: "配角" },
  { value: "ANTAGONIST", label: "反派" },
  { value: "EXTRA", label: "路人" },
];

const MAX_TEXT_LEN = 200000;
const MAX_CHAPTERS = 300;
const FILE_SIZE_LIMIT = 2 * 1024 * 1024;

const STEP_LABELS = ["输入内容", "章节切分", "智能解析", "确认导入"];

/** 文件 → 纯文本（txt: UTF-8 优先 + GBK 回退；docx: mammoth 前端解析） */
async function readFileAsText(file: File): Promise<string> {
  if (file.size > FILE_SIZE_LIMIT) {
    throw new Error("文件超过 2MB，请精简后重试");
  }
  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return res.value;
  }
  // txt：UTF-8 解码，替换字符占比过高时用 GBK 重读（中文 txt 常见编码）
  const utf8 = new TextDecoder("utf-8").decode(buf);
  const badCount = (utf8.match(/\uFFFD/g) || []).length;
  if (badCount / Math.max(1, utf8.length) > 0.01) {
    try {
      return new TextDecoder("gbk").decode(buf);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

/** AI 输出清洗：过滤非法项、非法枚举回退默认、超长截断 */
function sanitizeAIResult(obj: Record<string, unknown>): ImportAIResult {
  const genreRaw = typeof obj.genre === "string" ? obj.genre.trim() : "";
  const worldSettings: ImportWorldSetting[] = (
    Array.isArray(obj.worldSettings) ? obj.worldSettings : []
  )
    .filter(
      (w): w is Record<string, unknown> =>
        !!w && typeof (w as Record<string, unknown>).title === "string" && !!(w as Record<string, unknown>).title
    )
    .slice(0, 30)
    .map((w) => {
      const cat = typeof w.category === "string" ? w.category : "OTHER";
      return {
        title: String(w.title).trim().slice(0, 50),
        category: WORLD_CATEGORIES.some((c) => c.value === cat)
          ? (cat as ImportWorldCategory)
          : "OTHER",
        content:
          typeof w.content === "string" ? w.content.trim().slice(0, 2000) : "",
      };
    });

  const characters: ImportCharacter[] = (
    Array.isArray(obj.characters) ? obj.characters : []
  )
    .filter(
      (c): c is Record<string, unknown> =>
        !!c && typeof (c as Record<string, unknown>).name === "string" && !!(c as Record<string, unknown>).name
    )
    .slice(0, 50)
    .map((c) => {
      const role = typeof c.role === "string" ? c.role : "SUPPORTING";
      const str = (k: string) =>
        typeof c[k] === "string" ? (c[k] as string).trim().slice(0, 500) : "";
      return {
        name: String(c.name).trim().slice(0, 30),
        role: CHARACTER_ROLES.some((r) => r.value === role)
          ? (role as ImportCharacterRole)
          : "SUPPORTING",
        appearance: str("appearance"),
        personality: str("personality"),
        background: str("background"),
        motivation: str("motivation"),
      };
    });

  const chapterSummaries: Record<number, string> = {};
  if (Array.isArray(obj.chapterSummaries)) {
    for (const s of obj.chapterSummaries as unknown[]) {
      const rec = s as Record<string, unknown>;
      if (
        rec &&
        typeof rec.order === "number" &&
        Number.isInteger(rec.order) &&
        typeof rec.summary === "string" &&
        rec.summary.trim()
      ) {
        chapterSummaries[rec.order] = rec.summary.trim().slice(0, 60);
      }
    }
  }

  return {
    title: typeof obj.title === "string" ? obj.title.trim().slice(0, 80) : "",
    genre: GENRES.includes(genreRaw) ? genreRaw : "",
    synopsis:
      typeof obj.synopsis === "string" ? obj.synopsis.trim().slice(0, 300) : "",
    worldSettings,
    characters,
    chapterSummaries,
  };
}

function formatChars(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)} 万字` : `${n} 字`;
}

export function ImportWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();

  // 步骤与内容
  const [step, setStep] = useState(1);
  const [settingsText, setSettingsText] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [chapters, setChapters] = useState<ImportChapterDraft[]>([]);
  const [splitMatched, setSplitMatched] = useState(false);
  const [splitHint, setSplitHint] = useState("");
  const [fallbackSize, setFallbackSize] = useState("4000");
  const [readingFile, setReadingFile] = useState<"settings" | "chapters" | null>(null);

  // AI 解析
  const [aiPhase, setAiPhase] = useState<"idle" | "parsing" | "done" | "failed">("idle");
  const [aiResult, setAiResult] = useState<ImportAIResult | null>(null);
  const [aiError, setAiError] = useState("");
  /** 解析时的章节签名：章节被改动后作废旧解析结果 */
  const parsedSignature = useRef("");

  // Step4 表单
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("都市");
  const [mode, setMode] = useState<"PIPELINE" | "WORKBENCH" | "CHAT">("PIPELINE");
  const [synopsis, setSynopsis] = useState("");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [targetChapters, setTargetChapters] = useState("");
  const [chapterWords, setChapterWords] = useState("");
  const [genOutline, setGenOutline] = useState(true);
  const [finalStatus, setFinalStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const hasChapterText = chapterText.trim().length > 0;

  function chaptersSignature(cs: ImportChapterDraft[]): string {
    return cs.map((c) => `${c.title}:${c.content.length}`).join("|");
  }

  // ---------- 文件读取 ----------
  async function onFile(
    target: "settings" | "chapters",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选择同一文件
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".docx")) {
      toast({ title: "仅支持 .txt 或 .docx 文件", type: "warning" });
      return;
    }
    setReadingFile(target);
    try {
      const text = await readFileAsText(file);
      if (!text.trim()) {
        toast({ title: "文件内容为空", type: "warning" });
        return;
      }
      if (text.length > MAX_TEXT_LEN) {
        toast({
          title: `内容过长（${formatChars(text.length)}），最多 20 万字，请分批导入`,
          type: "warning",
        });
        return;
      }
      if (target === "settings") setSettingsText(text);
      else setChapterText(text);
      toast({ title: `已读取 ${file.name}`, type: "success" });
    } catch (err) {
      toast({
        title: "文件读取失败",
        description:
          err instanceof Error && err.message
            ? err.message
            : "docx 解析失败，请另存为 .txt 后重试",
        type: "error",
      });
    } finally {
      setReadingFile(null);
    }
  }

  // ---------- 步骤流转 ----------
  function nextFromStep1() {
    if (!settingsText.trim() && !chapterText.trim()) {
      toast({ title: "请先粘贴设定资料或章节正文（至少一项）", type: "warning" });
      return;
    }
    if (chapterText.trim()) {
      const res = splitChapters(chapterText);
      let cs = res.chapters;
      if (cs.length > MAX_CHAPTERS) {
        cs = cs.slice(0, MAX_CHAPTERS);
        toast({ title: `章节数超过 ${MAX_CHAPTERS}，本次仅导入前 ${MAX_CHAPTERS} 章`, type: "warning" });
      }
      setChapters(cs);
      setSplitMatched(res.matched);
      setSplitHint(res.patternHint);
      setStep(2);
    } else {
      setChapters([]);
      setSplitMatched(false);
      setSplitHint("");
      setStep(3);
    }
  }

  function resplitBySize() {
    const size = Math.max(1000, Math.min(20000, parseInt(fallbackSize, 10) || 4000));
    const cs = splitBySize(chapterText, size).slice(0, MAX_CHAPTERS);
    setChapters(cs);
    setSplitHint(`已按每章约 ${size} 字切分，共 ${cs.length} 章`);
  }

  function nextFromStep2() {
    const cs = chapters
      .map((c, i) => ({ ...c, order: i })) // 重排 order，保证摘要 key 与数组下标一致
      .filter((c) => c.title.trim() && c.content.trim());
    if (cs.length === 0) {
      toast({ title: "请至少保留一个章节", type: "warning" });
      return;
    }
    setChapters(cs);
    // 章节改动 → 作废旧解析结果
    if (aiResult && parsedSignature.current !== chaptersSignature(cs)) {
      setAiResult(null);
      setAiPhase("idle");
    }
    setStep(3);
  }

  // 跳过 AI：设定资料整体作为一条世界观条目入库
  function skipAI() {
    const fallback: ImportAIResult = {
      title: "",
      genre: "",
      synopsis: "",
      worldSettings: settingsText.trim()
        ? [
            {
              title: "设定资料",
              category: "OTHER" as ImportWorldCategory,
              content: settingsText.trim().slice(0, 2000),
            },
          ]
        : [],
      characters: [],
      chapterSummaries: {},
    };
    applyAIResult(fallback);
    setStep(4);
  }

  function applyAIResult(r: ImportAIResult) {
    setAiResult(r);
    setAiPhase("done");
    parsedSignature.current = chaptersSignature(chapters);
    if (r.title && !title) setTitle(r.title);
    if (r.genre) setGenre(r.genre);
    if (r.synopsis && !synopsis) setSynopsis(r.synopsis);
  }

  // ---------- AI 解析 ----------
  const aiStream = useAIStream({
    onDone: (fullText) => {
      const obj = parseJsonLoose(fullText);
      if (!obj) {
        setAiError("AI 返回内容无法解析，请重试");
        setAiPhase("failed");
        return;
      }
      applyAIResult(sanitizeAIResult(obj));
      toast({ title: "解析完成，请检查并编辑结果", type: "success" });
    },
    onError: (err) => {
      setAiError(err);
      setAiPhase("failed");
    },
    onAbort: () => {
      setAiPhase("idle");
    },
  });

  function startParse() {
    const sample = buildSampleText(settingsText, chapters);
    if (!sample.trim()) {
      toast({ title: "没有可解析的内容", type: "warning" });
      return;
    }
    setAiError("");
    setAiPhase("parsing");
    aiStream.generate({
      action: "importParse",
      payload: {
        sampleText: sample,
        chapterOrders: summaryChapterOrders(chapters),
      },
    });
  }

  // ---------- 提交 ----------
  async function submitImport() {
    if (!title.trim()) {
      toast({ title: "请填写小说标题", type: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await importProjectAction({
        project: {
          title: title.trim(),
          genre,
          mode,
          synopsis: synopsis.trim() || undefined,
          styleProfile: styleProfile ?? undefined,
          targetChapters: targetChapters ? parseInt(targetChapters, 10) : undefined,
          chapterWords: chapterWords ? parseInt(chapterWords, 10) : undefined,
        },
        worldSettings: (aiResult?.worldSettings ?? []).filter((w) => w.title.trim()),
        characters: (aiResult?.characters ?? []).filter((c) => c.name.trim()),
        chapters: chapters.map((c) => ({
          volume: c.volume,
          chapter: c.chapter,
          title: c.title.trim(),
          content: c.content,
          final: finalStatus,
        })),
        outlineSummaries:
          genOutline && aiResult ? aiResult.chapterSummaries : {},
      });
      if (!res.ok) {
        toast({ title: "导入失败", description: res.error, type: "error" });
        return;
      }
      toast({ title: "导入成功", type: "success" });
      resetAll();
      onOpenChange(false);
      router.push(`/project/${res.projectId}?view=${modeInfo[mode].query}`);
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setStep(1);
    setSettingsText("");
    setChapterText("");
    setChapters([]);
    setSplitMatched(false);
    setSplitHint("");
    setAiPhase("idle");
    setAiResult(null);
    setAiError("");
    setTitle("");
    setGenre("都市");
    setMode("PIPELINE");
    setSynopsis("");
    setStyleProfile(null);
    setTargetChapters("");
    setChapterWords("");
    setGenOutline(true);
    setFinalStatus(true);
    aiStream.reset();
  }

  const summaryCount = aiResult
    ? Object.keys(aiResult.chapterSummaries).length
    : 0;

  // ---------- 渲染 ----------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl !p-0">
        <div className="px-8 pt-7 pb-2">
          <DialogHeader>
            <DialogTitle>导入作品</DialogTitle>
            <DialogDescription>
              导入已有的设定与章节，继续用 AI 创作后续内容
            </DialogDescription>
          </DialogHeader>
          {/* 步骤指示条 */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const skipped = n === 2 && !hasChapterText && step > 2;
              const active = n === step;
              const done = n < step;
              return (
                <div key={label} className="flex flex-1 items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                      active && "bg-bg-brand text-text-onbrand",
                      done && !skipped && "bg-bg-brand-popup text-text-brand",
                      skipped && "bg-bg-overlay-l2 text-text-tertiary",
                      !active && !done && "bg-bg-overlay-l2 text-text-tertiary"
                    )}
                  >
                    {skipped ? "—" : n}
                  </div>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      active ? "text-text-default font-medium" : "text-text-tertiary"
                    )}
                  >
                    {label}
                  </span>
                  {n < 4 && <div className="h-px flex-1 bg-border-neutral-l1" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-8 pb-2">
          {/* ======== Step 1 输入内容 ======== */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="import-settings">设定资料（可选）</Label>
                  <span className="text-xs text-text-tertiary">
                    {settingsText.length > 0 ? formatChars(settingsText.length) : ""}
                  </span>
                </div>
                <Textarea
                  id="import-settings"
                  value={settingsText}
                  onChange={(e) => setSettingsText(e.target.value)}
                  placeholder="粘贴世界观、角色卡、大纲等设定文档。AI 将在下一步智能提取为结构化知识卡"
                  rows={6}
                  maxLength={MAX_TEXT_LEN}
                />
                <div className="flex items-center justify-between">
                  <label className="cursor-pointer text-xs text-text-brand hover:underline">
                    <input
                      type="file"
                      accept=".txt,.docx"
                      className="hidden"
                      onChange={(e) => onFile("settings", e)}
                    />
                    {readingFile === "settings" ? (
                      <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1 inline h-3 w-3" />
                    )}
                    上传设定文件（.txt / .docx）
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="import-chapters">章节正文（可选）</Label>
                  <span className="text-xs text-text-tertiary">
                    {chapterText.length > 0 ? formatChars(chapterText.length) : ""}
                  </span>
                </div>
                <Textarea
                  id="import-chapters"
                  value={chapterText}
                  onChange={(e) => setChapterText(e.target.value)}
                  placeholder="粘贴已写的章节正文。系统将按「第X章 / Chapter N / 序章」等标记自动切分"
                  rows={10}
                  maxLength={MAX_TEXT_LEN}
                />
                <label className="cursor-pointer text-xs text-text-brand hover:underline">
                  <input
                    type="file"
                    accept=".txt,.docx"
                    className="hidden"
                    onChange={(e) => onFile("chapters", e)}
                  />
                  {readingFile === "chapters" ? (
                    <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="mr-1 inline h-3 w-3" />
                  )}
                  上传正文文件（.txt / .docx）
                </label>
              </div>

              <p className="text-xs leading-relaxed text-text-tertiary">
                两项至少填写一项；设定与正文可只导入其一。内容最多 20 万字、300 章。
              </p>
            </div>
          )}

          {/* ======== Step 2 章节切分 ======== */}
          {step === 2 && (
            <div className="space-y-4">
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-xs",
                  splitMatched
                    ? "border-border-neutral-l1 bg-bg-base-default text-text-secondary"
                    : "border-status-warning/30 bg-status-warning/5 text-status-warning"
                )}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{splitHint || "切分完成"}</span>
                {!splitMatched && (
                  <span className="ml-auto flex items-center gap-2">
                    <Select value={fallbackSize} onValueChange={setFallbackSize}>
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["2000", "3000", "4000", "6000", "8000"].map((n) => (
                          <SelectItem key={n} value={n}>
                            每章约 {n} 字
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={resplitBySize}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      重新切分
                    </Button>
                  </span>
                )}
              </div>

              <ScrollArea className="h-[46vh] rounded-xl border border-border-neutral-l1">
                <div className="divide-y divide-border-neutral-l1">
                  {chapters.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="num w-9 shrink-0 text-right text-xs text-text-tertiary">
                        {c.chapter === 0 ? "前言" : c.chapter >= 900 ? "番外" : c.chapter}
                      </span>
                      <span className="w-10 shrink-0 text-xs text-text-tertiary">
                        第{c.volume}卷
                      </span>
                      <Input
                        value={c.title}
                        onChange={(e) =>
                          setChapters((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, title: e.target.value } : p))
                          )
                        }
                        className="h-8 flex-1 text-sm"
                        maxLength={100}
                      />
                      <span className="num w-16 shrink-0 text-right text-xs text-text-tertiary">
                        {formatChars(c.content.replace(/\s/g, "").length)}
                      </span>
                      <button
                        type="button"
                        aria-label="删除章节"
                        onClick={() =>
                          setChapters((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="shrink-0 text-text-tertiary transition-colors hover:text-status-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-text-tertiary">
                共 {chapters.length} 章。标题可直接编辑，不需要的章节可删除。
              </p>
            </div>
          )}

          {/* ======== Step 3 AI 智能解析 ======== */}
          {step === 3 && (
            <div className="space-y-4">
              {aiPhase === "idle" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border-neutral-l1 bg-bg-base-default px-5 py-5">
                    <div className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-icon-brand" />
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-text-default">
                          AI 智能解析设定与角色
                        </p>
                        <p className="text-xs leading-relaxed text-text-tertiary">
                          从设定资料与章节采样中提取：作品标题、题材、简介、世界观条目、角色卡、章节摘要（用于生成大纲关联）。
                          按现有积分计费，也可以跳过直接导入。
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={startParse} className="flex-1">
                      <Sparkles className="mr-1 h-4 w-4" />
                      开始智能解析
                    </Button>
                    <Button type="button" variant="outline" onClick={skipAI} className="flex-1">
                      跳过，直接导入
                    </Button>
                  </div>
                </div>
              )}

              {aiPhase === "parsing" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border-neutral-l1 bg-bg-base-default px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-icon-brand" />
                      <span className="text-sm text-text-secondary">
                        AI 正在解析
                        {aiStream.thinking > 0 && `（思考 ${aiStream.thinking} 字）`}
                        ...
                      </span>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={aiStream.stop}>
                      停止
                    </Button>
                  </div>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-bg-overlay-l1 px-4 py-3 font-mono text-[11px] leading-relaxed text-text-tertiary">
                    {aiStream.text || "等待 AI 输出..."}
                  </pre>
                </div>
              )}

              {aiPhase === "failed" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-status-error/30 bg-status-error/5 px-5 py-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
                    <div>
                      <p className="text-sm font-medium text-text-default">解析失败</p>
                      <p className="mt-1 text-xs text-text-tertiary">{aiError}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={startParse} className="flex-1">
                      <RefreshCw className="mr-1 h-4 w-4" />
                      重试解析
                    </Button>
                    <Button type="button" variant="outline" onClick={skipAI} className="flex-1">
                      跳过 AI，直接导入
                    </Button>
                  </div>
                </div>
              )}

              {aiPhase === "done" && aiResult && (
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="basic">简介</TabsTrigger>
                    <TabsTrigger value="world">
                      世界观 {aiResult.worldSettings.length}
                    </TabsTrigger>
                    <TabsTrigger value="chars">
                      角色 {aiResult.characters.length}
                    </TabsTrigger>
                    {chapters.length > 0 && (
                      <TabsTrigger value="summaries">
                        章节摘要 {summaryCount}
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* 简介 */}
                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label>作品标题（AI 推断，可修改）</Label>
                      <Input
                        value={aiResult.title}
                        onChange={(e) =>
                          setAiResult((prev) =>
                            prev ? { ...prev, title: e.target.value } : prev
                          )
                        }
                        placeholder="推断不出时请手动填写"
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>题材（AI 判断，可修改）</Label>
                      <Select
                        value={aiResult.genre || "其他"}
                        onValueChange={(v) =>
                          setAiResult((prev) => (prev ? { ...prev, genre: v } : prev))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GENRES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>简介</Label>
                      <Textarea
                        value={aiResult.synopsis}
                        onChange={(e) =>
                          setAiResult((prev) =>
                            prev ? { ...prev, synopsis: e.target.value } : prev
                          )
                        }
                        rows={5}
                        maxLength={300}
                        placeholder="AI 生成的故事简介，可修改"
                      />
                    </div>
                  </TabsContent>

                  {/* 世界观 */}
                  <TabsContent value="world" className="space-y-3 pt-4">
                    {aiResult.worldSettings.length === 0 && (
                      <p className="py-6 text-center text-xs text-text-tertiary">
                        未提取到世界观条目
                      </p>
                    )}
                    {aiResult.worldSettings.map((w, i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-xl border border-border-neutral-l1 bg-bg-base-default p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={w.title}
                            onChange={(e) =>
                              setAiResult((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      worldSettings: prev.worldSettings.map((p, j) =>
                                        j === i ? { ...p, title: e.target.value } : p
                                      ),
                                    }
                                  : prev
                              )
                            }
                            className="h-8 flex-1 text-sm"
                            maxLength={50}
                            placeholder="设定标题"
                          />
                          <Select
                            value={w.category}
                            onValueChange={(v) =>
                              setAiResult((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      worldSettings: prev.worldSettings.map((p, j) =>
                                        j === i
                                          ? { ...p, category: v as ImportWorldCategory }
                                          : p
                                      ),
                                    }
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WORLD_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            aria-label="删除条目"
                            onClick={() =>
                              setAiResult((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      worldSettings: prev.worldSettings.filter((_, j) => j !== i),
                                    }
                                  : prev
                              )
                            }
                            className="shrink-0 text-text-tertiary transition-colors hover:text-status-error"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Textarea
                          value={w.content}
                          onChange={(e) =>
                            setAiResult((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    worldSettings: prev.worldSettings.map((p, j) =>
                                      j === i ? { ...p, content: e.target.value } : p
                                    ),
                                  }
                                : prev
                            )
                          }
                          rows={3}
                          maxLength={2000}
                          className="text-xs"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setAiResult((prev) =>
                          prev
                            ? {
                                ...prev,
                                worldSettings: [
                                  ...prev.worldSettings,
                                  { title: "", category: "OTHER", content: "" },
                                ],
                              }
                            : prev
                        )
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      添加一条
                    </Button>
                  </TabsContent>

                  {/* 角色 */}
                  <TabsContent value="chars" className="space-y-3 pt-4">
                    {aiResult.characters.length === 0 && (
                      <p className="py-6 text-center text-xs text-text-tertiary">
                        未提取到角色
                      </p>
                    )}
                    {aiResult.characters.map((c, i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-xl border border-border-neutral-l1 bg-bg-base-default p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={c.name}
                            onChange={(e) =>
                              setAiResult((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      characters: prev.characters.map((p, j) =>
                                        j === i ? { ...p, name: e.target.value } : p
                                      ),
                                    }
                                  : prev
                              )
                            }
                            className="h-8 flex-1 text-sm font-medium"
                            maxLength={30}
                            placeholder="姓名"
                          />
                          <Select
                            value={c.role}
                            onValueChange={(v) =>
                              setAiResult((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      characters: prev.characters.map((p, j) =>
                                        j === i ? { ...p, role: v as ImportCharacterRole } : p
                                      ),
                                    }
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHARACTER_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            aria-label="删除角色"
                            onClick={() =>
                              setAiResult((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      characters: prev.characters.filter((_, j) => j !== i),
                                    }
                                  : prev
                              )
                            }
                            className="shrink-0 text-text-tertiary transition-colors hover:text-status-error"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {(
                            [
                              ["personality", "性格"],
                              ["appearance", "外貌"],
                              ["background", "背景"],
                              ["motivation", "动机"],
                            ] as const
                          ).map(([key, label]) => (
                            <div key={key} className="space-y-1">
                              <Label className="text-[11px] text-text-tertiary">{label}</Label>
                              <Textarea
                                value={c[key]}
                                onChange={(e) =>
                                  setAiResult((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          characters: prev.characters.map((p, j) =>
                                            j === i ? { ...p, [key]: e.target.value } : p
                                          ),
                                        }
                                      : prev
                                  )
                                }
                                rows={2}
                                maxLength={500}
                                className="text-xs"
                                placeholder="可留空"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setAiResult((prev) =>
                          prev
                            ? {
                                ...prev,
                                characters: [
                                  ...prev.characters,
                                  {
                                    name: "",
                                    role: "SUPPORTING",
                                    appearance: "",
                                    personality: "",
                                    background: "",
                                    motivation: "",
                                  },
                                ],
                              }
                            : prev
                        )
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      添加角色
                    </Button>
                  </TabsContent>

                  {/* 章节摘要 */}
                  <TabsContent value="summaries" className="space-y-3 pt-4">
                    <p className="text-xs text-text-tertiary">
                      章节摘要将生成大纲条目并与对应章节关联，供 AI 扩写后续章节时参考。留空的章节不生成大纲。
                    </p>
                    {chapters.map((c) => (
                      <div
                        key={c.order}
                        className="flex items-start gap-3 rounded-xl border border-border-neutral-l1 bg-bg-base-default px-4 py-3"
                      >
                        <span className="mt-1 flex shrink-0 items-center gap-1 text-xs font-medium text-text-default">
                          <BookOpen className="h-3 w-3 text-text-tertiary" />
                          {c.title}
                        </span>
                        <Textarea
                          value={aiResult.chapterSummaries[c.order] ?? ""}
                          onChange={(e) =>
                            setAiResult((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    chapterSummaries: {
                                      ...prev.chapterSummaries,
                                      [c.order]: e.target.value,
                                    },
                                  }
                                : prev
                            )
                          }
                          rows={2}
                          maxLength={60}
                          className="min-h-0 flex-1 text-xs"
                          placeholder="40 字内剧情摘要（留空则不生成大纲）"
                        />
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}

          {/* ======== Step 4 确认导入 ======== */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>创作模式</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["PIPELINE", "WORKBENCH", "CHAT"] as const).map((m) => {
                    const Icon = modeInfo[m].icon;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm transition-colors ${
                          mode === m
                            ? "border-border-neutral-l3 bg-bg-overlay-l1 text-text-default font-medium"
                            : "border-border-neutral-l1 hover:bg-bg-overlay-l1 text-text-default"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{modeInfo[m].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="import-title">小说标题</Label>
                  <Input
                    id="import-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="必填"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>题材</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>全书规模（可选，留空则按导入内容自动推算）</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={targetChapters}
                    onChange={(e) => setTargetChapters(e.target.value)}
                    placeholder={chapters.length > 0 ? `目标章节数，默认 ${chapters.length}` : "目标章节数"}
                  />
                  <Select value={chapterWords} onValueChange={setChapterWords}>
                    <SelectTrigger>
                      <SelectValue placeholder="每章字数（默认取平均）" />
                    </SelectTrigger>
                    <SelectContent>
                      {["1500", "2000", "3000", "4000"].map((n) => (
                        <SelectItem key={n} value={n}>
                          每章约 {n} 字
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-synopsis">简介（可选）</Label>
                <Textarea
                  id="import-synopsis"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label>写作风格（可选）</Label>
                <StylePicker value={styleProfile} onChange={setStyleProfile} />
              </div>

              {chapters.length > 0 && (
                <div className="space-y-3 rounded-xl border border-border-neutral-l1 bg-bg-base-default px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-default">生成大纲关联</p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        为 {summaryCount > 0 ? `${summaryCount} 个有摘要的` : ""}
                        章节创建大纲条目并关联（{summaryCount === 0 ? "当前无章节摘要，可返回上一步解析" : "见上一步章节摘要"}）
                      </p>
                    </div>
                    <Switch
                      checked={genOutline && summaryCount > 0}
                      disabled={summaryCount === 0}
                      onCheckedChange={setGenOutline}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-border-neutral-l1 pt-3">
                    <div>
                      <p className="text-sm font-medium text-text-default">章节标记为定稿</p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        关闭则全部保留为草稿状态
                      </p>
                    </div>
                    <Switch checked={finalStatus} onCheckedChange={setFinalStatus} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-bg-overlay-l1 px-4 py-3 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  将导入：
                </span>
                <span>{aiResult?.worldSettings.length ?? 0} 条世界观</span>
                <span>{aiResult?.characters.length ?? 0} 个角色</span>
                <span>{chapters.length} 章</span>
                {chapters.length > 0 && (
                  <span>
                    （共{" "}
                    {formatChars(
                      chapters.reduce((s, c) => s + c.content.replace(/\s/g, "").length, 0)
                    )}
                    ）
                  </span>
                )}
                {genOutline && summaryCount > 0 && <span>{summaryCount} 条大纲</span>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 px-8 pb-7 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (step === 1) {
                onOpenChange(false);
              } else if (step === 3 && !hasChapterText) {
                setStep(1);
              } else {
                setStep(step - 1);
              }
            }}
            disabled={aiPhase === "parsing" || submitting}
          >
            {step === 1 ? "取消" : "上一步"}
          </Button>

          {step === 1 && (
            <Button type="button" onClick={nextFromStep1}>
              下一步
            </Button>
          )}
          {step === 2 && (
            <Button type="button" onClick={nextFromStep2}>
              下一步
            </Button>
          )}
          {step === 3 && (
            <Button
              type="button"
              onClick={() => {
                if (aiResult) {
                  setStep(4);
                } else {
                  skipAI(); // 未解析时兜底：设定资料整体作为世界观条目
                }
              }}
              disabled={aiPhase === "parsing"}
            >
              {aiPhase === "done" ? "下一步" : "跳过解析"}
            </Button>
          )}
          {step === 4 && (
            <Button type="button" onClick={submitImport} disabled={submitting}>
              {submitting ? "导入中..." : "开始导入"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
