import type { Metadata } from "next";
import { SimplePage, Section } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "隐私政策 - 墨笔 AI 写作平台",
};

export default function PrivacyPage() {
  return (
    <SimplePage title="隐私政策" description="我们重视你的隐私。本政策说明我们收集哪些信息、如何使用与保护它们。">
      <Section title="一、我们收集的信息">
        <p><strong>账号信息</strong>：注册时提供的昵称、邮箱；使用 GitHub 登录时获取的基础资料（头像、昵称）。</p>
        <p><strong>创作内容</strong>：你在项目中创建的世界观、角色卡、大纲、章节正文等，用于提供编辑、AI 生成与知识库检索服务。</p>
        <p><strong>用量数据</strong>：AI 调用记录（操作类型、模型、Token 数），用于配额统计与滥用防护，不包含你的正文内容本身。</p>
      </Section>
      <Section title="二、信息的使用">
        <p>你的创作内容仅用于：在你的账号内呈现与编辑；作为 AI 生成的上下文（知识库 RAG）以完成你主动发起的生成请求。</p>
        <p>我们不会将你的作品用于训练模型，不会向任何第三方出售你的个人信息或创作内容。</p>
      </Section>
      <Section title="三、第三方服务">
        <p><strong>AI 服务供应商</strong>：你发起生成时，相关提示词与上下文会传输至所选用的大模型服务（如 DeepSeek）以完成生成，受其隐私政策约束。</p>
        <p><strong>GitHub OAuth</strong>：使用 GitHub 登录时，仅获取头像与昵称等基础资料，不获取你的代码仓库等权限。</p>
      </Section>
      <Section title="四、存储与安全">
        <p>数据存储于受保护的数据库中，传输全程使用 HTTPS 加密。密码以不可逆的哈希形式保存，任何人（包括平台管理员）都无法查看明文。</p>
      </Section>
      <Section title="五、你的权利">
        <p>你可以随时在平台内编辑、导出（TXT/Markdown 等，按套餐）或删除自己的作品；删除项目会连带删除其全部数据且不可恢复。</p>
        <p>如需注销账号或导出全部个人信息，请发送邮件至 hello@mobi.ai，我们将在 7 个工作日内处理。</p>
      </Section>
      <Section title="六、政策更新">
        <p>本政策如有重大变更，将在本页面公示并更新「最后更新」日期。继续使用即视为知悉并同意更新内容。</p>
      </Section>
    </SimplePage>
  );
}
