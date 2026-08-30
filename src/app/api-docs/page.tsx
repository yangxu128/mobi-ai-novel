import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage, Section } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "API 文档 - 墨笔 AI 写作平台",
};

export default function ApiDocsPage() {
  return (
    <SimplePage title="API 文档" description="墨笔开放 API 正在内测中，正式开放前可先了解能力概览。">
      <Section title="能力概览">
        <p>墨笔内部已通过统一的生成网关串联全部 AI 能力，正式开放后预计提供以下接口：</p>
        <p>· <strong>POST /api/ai/generate</strong> —— 流式生成入口（SSE）。按 action 调用灵感卡、世界观、角色卡、大纲、续写、扩写、润色、行内 AI、对话共创、一致性检查等能力；</p>
        <p>· <strong>知识库接口</strong> —— 世界观 / 角色卡 / 大纲的增删改查，与生成上下文自动联动；</p>
        <p>· <strong>用量接口</strong> —— 查询当日 Token 消耗与剩余配额。</p>
      </Section>
      <Section title="内测说明">
        <p>当前 API 仅限平台前端调用（需登录态），暂不对第三方开放。正式开放时会在这里提供鉴权方式、请求/响应示例与错误码表。</p>
        <p>想第一时间接入？发邮件到 <a href="mailto:hello@mobi.ai" className="text-text-brand hover:underline">hello@mobi.ai</a> 加入内测名单。</p>
      </Section>
      <Section title="现在能做什么">
        <p>在平台内你可以立即使用全部 AI 能力：<Link href="/register" className="text-text-brand hover:underline">免费注册</Link>后，从一句灵感开始生成你的第一章。</p>
      </Section>
    </SimplePage>
  );
}
