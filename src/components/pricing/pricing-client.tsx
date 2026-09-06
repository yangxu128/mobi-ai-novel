"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/site-footer";

type Plan = "FREE" | "BASIC" | "STANDARD" | "PRO" | "ULTIMATE";

interface PlanDef {
  name: Plan;
  cn: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  highlight: boolean;
}

const PLANS: PlanDef[] = [
  {
    name: "FREE",
    cn: "免费版",
    price: "¥0",
    period: "/月",
    desc: "适合初次尝试",
    features: [
      "1 个项目",
      "每日签到领 50 积分（≈20 万 tokens）",
      "三种创作模式全开放",
      "知识库（世界观 / 角色 / 大纲）",
    ],
    highlight: false,
  },
  {
    name: "BASIC",
    cn: "基础版",
    price: "¥39",
    period: "/月",
    desc: "适合轻度创作者",
    features: [
      "5 个项目",
      "每月 1000 积分（≈400 万 tokens）",
      "每日签到再领 50 积分",
      "流水线全 6 步 + 写作工作台",
      "TXT/Markdown 导出",
    ],
    highlight: false,
  },
  {
    name: "STANDARD",
    cn: "标准版",
    price: "¥99",
    period: "/月",
    desc: "适合深度创作者",
    features: [
      "10 个项目",
      "每月 2000 积分（≈800 万 tokens）",
      "每日签到再领 50 积分",
      "知识库 RAG + 一致性检查",
      "TXT/Markdown 导出",
    ],
    highlight: false,
  },
  {
    name: "PRO",
    cn: "专业版",
    price: "¥189",
    period: "/月",
    desc: "适合专业网文作者",
    features: [
      "无限项目",
      "每月 4000 积分（≈1600 万 tokens）",
      "每日签到再领 50 积分",
      "高级模型可选（LongCat / GLM / Qwen）",
      "一致性检查 + 作家风格模仿",
      "无限角色卡",
    ],
    highlight: true,
  },
  {
    name: "ULTIMATE",
    cn: "旗舰版",
    price: "¥299",
    period: "/月",
    desc: "适合高强度连载作者",
    features: [
      "无限项目",
      "每月 7000 积分（≈2800 万 tokens）",
      "每日签到再领 50 积分",
      "高级模型 + 作家风格模仿",
      "全功能解锁",
      "优先体验新功能",
    ],
    highlight: false,
  },
];

interface Props {
  /** 当前生效套餐；未登录为 null，管理员为 "ADMIN" */
  currentPlan: Plan | "ADMIN" | null;
  /** 付费套餐到期时间（ISO 字符串） */
  expiresAt?: string | null;
}

export function PricingClient({ currentPlan, expiresAt }: Props) {
  const [active, setActive] = useState<Plan | "ADMIN" | null>(currentPlan);

  const isAdmin = active === "ADMIN";

  return (
    <>
      <div className="container py-12 page-wash">
      <div className="text-center max-w-2xl mx-auto mb-4">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-bg-brand-popup px-3 py-1 text-xs font-medium text-text-brand">
          <Sparkles className="h-3.5 w-3.5" />
          内测期全部功能免费体验
        </div>
        <h1 className="text-4xl font-bold mb-3 text-text-default">选择适合你的方案</h1>
        <p className="text-text-secondary">
          免费版永久免费，付费方案按月订阅，可随时取消。积分制计费：1 积分 = 4000 tokens
          （50 积分 ≈ 20 万 tokens），按后台实际 token 用量扣减。月度积分每月 1 日重置，签到积分长期有效。
        </p>
      </div>
      {currentPlan && (
        <p className="text-center text-sm text-text-tertiary mb-10">
          当前方案：
          <span className="text-text-default font-medium">
            {isAdmin ? "管理员（不限量）" : PLANS.find((p) => p.name === active)?.cn}
          </span>
          {expiresAt && !isAdmin && active !== "FREE" && (
            <>，有效期至 {new Date(expiresAt).toLocaleDateString("zh-CN")}</>
          )}
        </p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto items-stretch">
        {PLANS.map((plan) => {
          const isCurrent = !isAdmin && active === plan.name;
          return (
            <Card
              key={plan.name}
              className={`relative overflow-hidden rounded-2xl card-lift ${
                plan.highlight
                  ? "border-[1.5px] border-[var(--bg-brand)] shadow-[var(--shadow-card-hover)]"
                  : "border-border-neutral-l1 shadow-[var(--shadow-card)]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute inset-x-0 top-0 h-1 brand-gradient" aria-hidden />
              )}
              <CardHeader className={plan.highlight ? "pt-7" : ""}>
                <div className="flex items-center gap-2">
                  <CardTitle>{plan.cn}</CardTitle>
                  {plan.highlight && !isCurrent && (
                    <span className="inline-flex items-center rounded-full brand-gradient px-2.5 py-0.5 text-xs font-medium text-text-onbrand shadow-[var(--shadow-glow)]">
                      推荐
                    </span>
                  )}
                  {isCurrent && (
                    <Badge className="bg-bg-brand-popup text-text-brand">当前方案</Badge>
                  )}
                </div>
                <CardDescription>{plan.desc}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold tracking-tight text-text-default">{plan.price}</span>
                  <span className="text-text-tertiary">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2.5 text-sm mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-text-default">
                      {plan.highlight ? (
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bg-brand-popup">
                          <Check className="h-3 w-3 text-text-brand" strokeWidth={3} />
                        </span>
                      ) : (
                        <Check className="h-4 w-4 mt-0.5 text-status-success shrink-0" />
                      )}
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {!currentPlan ? (
                  <Button
                    asChild
                    className={`w-full ${plan.highlight ? "btn-glow" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    <Link href={plan.name === "FREE" ? "/register" : "/login"}>
                      {plan.name === "FREE" ? "免费开始" : "登录后订阅"}
                    </Link>
                  </Button>
                ) : isAdmin ? (
                  <Button className="w-full" variant="outline" disabled>
                    管理员不限量
                  </Button>
                ) : isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    当前方案
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    联系管理员开通
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-text-tertiary mt-8">
        套餐调整请联系管理员开通；正式上线后将接入支付流程，支持自助订阅
      </p>
      </div>
      <SiteFooter />
    </>
  );
}
