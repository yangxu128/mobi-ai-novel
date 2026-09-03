import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage, Section } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "创作指南 - 墨笔 AI 写作平台",
};

export default function GuidePage() {
  return (
    <SimplePage title="创作指南" description="从一句话灵感的长篇创作全流程指南。选对模式、用好 AI，三步生成你的第一章。">
      <Section title="第一步：选一种创作模式">
        <p><strong>刚接触写作？</strong>选「结构化流水线」。系统会用六步引导你：输入一句灵感 → AI 生成 3 张灵感卡 → 构建世界观 → 创建角色卡 → 生成结构化大纲 → 按大纲逐章扩写 → 润色定稿。每一步都是「AI 生成 → 人工编辑 → 确认流转」，你始终拥有修改权。</p>
        <p><strong>有经验的作者？</strong>选「写作工作台」。左侧章节树 + 中间 TipTap 编辑器 + 右侧知识库。选中任意文字按 <strong>Cmd+K</strong>（Windows 为 Ctrl+K）即可唤起行内 AI：续写、扩写、润色、改写、压缩、古文风格。</p>
        <p><strong>只想轻松玩玩？</strong>选「对话共创」。像聊天一样和 AI 接龙，AI 自动从对话里提取世界观与角色卡，随时可以一键转成正式项目。</p>
        <p>三种模式随时切换，数据实时同步——在流水线生成的大纲，到工作台立刻可见。</p>
      </Section>
      <Section title="第二步：把设定喂给知识库">
        <p>长篇最怕设定崩坏。世界观与角色卡在流水线中确认后会自动写入知识库；你也可以在工作台手动补充。</p>
        <p>之后每次 AI 生成都会自动检索相关设定注入上下文（RAG），写到第 100 章也不会忘记第 1 章埋的伏笔。</p>
      </Section>
      <Section title="第三步：让大纲长出正文">
        <p>大纲生成支持「继续生成」——已有大纲不满意就追加更多章节，新章节自动接续编号并衔接剧情。</p>
        <p>进入章节扩写后，AI 会引用前文摘要与本章情节点流式生成正文，<strong>生成完成或中途停止都会自动保存</strong>，不怕丢稿。</p>
      </Section>
      <Section title="提效技巧">
        <p><strong>风格模仿</strong>：项目页顶部「设置写作风格」，粘贴一段喜欢的文本，AI 分析其文风后对该项目所有生成生效。</p>
        <p><strong>项目级模型</strong>：不同任务用不同模型——构思用推理强的模型，扩写用速度快的模型，在头部模型选择器里随时切换。</p>
        <p><strong>深度思考</strong>：默认关闭以保证速度；遇到复杂剧情推演时再打开，让模型先推演再输出（更慢、更耗额度）。</p>
        <p><strong>番茄节奏</strong>：大纲与扩写提示词内置「压-小扬-压-爆」情绪循环与 10 类结尾钩子设计，追读率优先，直接用就行。</p>
      </Section>
      <Section title="常见工作流建议">
        <p>建议的工作流：流水线走完 1-5 步生成初稿 → 工作台精修（行内 AI + 一致性检查）→ 润色定稿 → 导出发布。对话共创产生的灵感，用「转为正式项目」带入严肃创作。</p>
        <p>更多问题见 <Link href="/faq" className="text-text-brand hover:underline">常见问题</Link>。</p>
      </Section>
    </SimplePage>
  );
}
