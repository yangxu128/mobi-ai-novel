import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SimplePage } from "@/components/simple-page";

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "免费版能用什么？",
    a: "免费版包含 1 个项目、流水线前 2 步、每日 20 轮对话共创与 500 字 AI 续写额度，永久免费。升级基础版可解锁流水线全部 6 步、1 万字/天 AI 续写、知识库 RAG 与导出功能。",
  },
  {
    q: "三种创作模式有什么区别？",
    a: "结构化流水线：六步引导（灵感 → 世界观 → 角色卡 → 大纲 → 扩写 → 润色），适合新手；写作工作台：TipTap 富文本编辑器 + 选中文字唤起 AI（Cmd+K），适合专业作者；对话共创：像聊天一样和 AI 接龙讲故事，AI 自动提取设定卡，零门槛。",
  },
  {
    q: "AI 会记得我前面写的设定吗？",
    a: "会。世界观、角色卡、大纲与已写章节会自动进入项目知识库，AI 生成时通过 RAG 检索相关设定注入上下文，并有分层上下文管理控制篇幅，长篇创作不串设定。你也可以用一致性引擎扫描全文，自动标记与设定矛盾的段落。",
  },
  {
    q: "AI 生成的内容版权归谁？",
    a: "你在平台创作的与 AI 辅助生成后经你编辑采用的内容，权利归你所有。请对成稿内容自行审校，确保符合法律法规与发表平台的规则。",
  },
  {
    q: "积分用完了怎么办？",
    a: "积分按 AI 实际 token 用量扣减（1 积分 = 4000 tokens）：月度积分每月 1 日重置，签到积分长期有效。积攒的签到积分用完时，可升级套餐获取每月额度——基础版 3000 积分、专业版 8000 积分。内测期套餐切换即时生效、无需付费。",
  },
  {
    q: "写好的小说能导出吗？",
    a: "可以。基础版支持 TXT / Markdown 导出，专业版额外支持 EPUB / PDF 导出。导出入口在工作台与项目列表中。",
  },
  {
    q: "能自定义 AI 的写作风格吗？",
    a: "可以。项目页顶部「设置写作风格」可选预设风格（如简洁冷峻、热血激昂等），也可以粘贴一段你喜欢的文本让 AI 分析模仿其文风，生成后对该项目的所有生成生效。",
  },
];

export default function FaqPage() {
  return (
    <SimplePage title="常见问题" description="关于墨笔的常见疑问与解答。没有找到答案？发邮件到 1419644549@qq.com，我们会尽快回复。">
      <Accordion type="single" collapsible className="mt-2">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-7 text-text-secondary">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SimplePage>
  );
}
