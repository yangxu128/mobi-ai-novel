import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Free",
    cn: "免费版",
    price: "¥0",
    period: "/月",
    desc: "适合初次尝试",
    features: [
      "1 个项目",
      "流水线前 2 步",
      "对话共创 20 轮/天",
      "AI 续写 500 字/天",
      "3 张角色卡",
    ],
    cta: "免费开始",
    href: "/register",
    highlight: false,
  },
  {
    name: "Basic",
    cn: "基础版",
    price: "¥29",
    period: "/月",
    desc: "适合深度创作者",
    features: [
      "10 个项目",
      "流水线全 6 步",
      "对话共创无限",
      "AI 续写 1 万字/天",
      "工作台 + 知识库 RAG",
      "50 张角色卡",
      "TXT/Markdown 导出",
      "7 天版本历史",
    ],
    cta: "订阅基础版",
    href: "#",
    highlight: true,
  },
  {
    name: "Pro",
    cn: "专业版",
    price: "¥79",
    period: "/月",
    desc: "适合专业网文作者",
    features: [
      "无限项目",
      "AI 续写 5 万字/天",
      "Claude / 豆包 Pro 高级模型",
      "一致性检查",
      "无限角色卡",
      "TXT/Markdown/EPUB/PDF 导出",
      "30 天版本历史",
      "优先客服",
    ],
    cta: "订阅专业版",
    href: "#",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="container py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-bold mb-3">选择适合你的方案</h1>
        <p className="text-muted-foreground">免费版永久免费，付费方案按月订阅，可随时取消</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`rounded-2xl shadow-sm bg-white ${
              plan.highlight ? "border-neutral-900 shadow-md" : "border-neutral-100"
            }`}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{plan.cn}</CardTitle>
                {plan.highlight && <Badge className="bg-neutral-900 text-white hover:bg-neutral-800">推荐</Badge>}
              </div>
              <CardDescription>{plan.desc}</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`w-full ${
                  plan.highlight
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
                variant={plan.highlight ? "default" : "outline"}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        MVP 版本暂未接入支付，订阅升级请联系管理员手动调整用户角色
      </p>
    </div>
  );
}
