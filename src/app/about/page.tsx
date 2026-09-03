import type { Metadata } from "next";
import { SimplePage, Section } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "关于我们 - 墨笔 AI 写作平台",
};

export default function AboutPage() {
  return (
    <SimplePage title="关于我们" description="墨笔相信：讲好一个故事，不该被工具卡住。">
      <Section title="我们在做什么">
        <p>墨笔是一个 AI 全流程协作的小说创作平台。我们把长篇创作中最耗心力的部分——世界观管理、角色一致性、大纲结构、上下文记忆——交给 AI 与工程系统，让作者把精力留给真正的 storytelling。</p>
        <p>从一句灵感，到世界观、角色、大纲与成稿：结构化流水线引导新手入门，写作工作台服务专业作者，对话共创让爱好者零门槛开始。三种模式，一个知识库，数据实时同步。</p>
      </Section>
      <Section title="我们的坚持">
        <p><strong>作者拥有作品</strong>——AI 只做辅助，所有内容的权利归创作者；</p>
        <p><strong>长篇一致性</strong>——知识库 RAG + 分层上下文 + 一致性引擎，写到 100 章不串设定；</p>
        <p><strong>节奏科学</strong>——内置番茄网文节奏体系与结尾钩子设计，让「写完」走向「有人追读」。</p>
      </Section>
      <Section title="联系我们">
        <p>产品建议、合作洽谈或任何问题，欢迎来信：<a href="mailto:hello@mobi.ai" className="text-text-brand hover:underline">hello@mobi.ai</a>。我们认真阅读每一封邮件。</p>
      </Section>
      <Section title="加入我们">
        <p id="join">我们在寻找同样热爱故事的伙伴：</p>
        <p>· 前端工程师（React / Next.js，热爱打磨交互细节）</p>
        <p>· AI 应用工程师（Prompt 工程 / RAG / Agent）</p>
        <p>· 网文产品运营（深度网文阅读者优先）</p>
        <p>以上职位长期有效，简历发送至 <a href="mailto:join@mobi.ai" className="text-text-brand hover:underline">join@mobi.ai</a>，附上你最想改进的一个写作工具痛点更佳。</p>
      </Section>
    </SimplePage>
  );
}
