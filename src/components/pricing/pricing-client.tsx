"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { SiteFooter } from "@/components/site-footer";
import { changeMyPlanAction } from "@/actions/subscription";

type Plan = "FREE" | "BASIC" | "PRO";

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
      "流水线前 2 步",
      "对话共创 20 轮/天",
      "AI 续写 500 字/天",
      "3 张角色卡",
    ],
    highlight: false,
  },
  {
    name: "BASIC",
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
    highlight: true,
  },
  {
    name: "PRO",
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
  const [pending, setPending] = useState<Plan | null>(null);

  async function onSwitch(plan: Plan) {
    if (!currentPlan || active === plan || pending) return;
    setPending(plan);
    try {
      const res = await changeMyPlanAction(plan);
      if (res.ok) {
        setActive(plan);
        toast({
          title: plan === "FREE" ? "已切换到免费版" : "订阅成功",
          description:
            plan === "FREE"
              ? "已降级为免费版"
              : `已开通${PLANS.find((p) => p.name === plan)?.cn}，有效期 30 天`,
          type: "success",
        });
      } else {
        toast({ title: "切换失败", description: res.error, type: "error" });
      }
    } catch {
      toast({ title: "网络错误，请重试", type: "error" });
    } finally {
      setPending(null);
    }
  }

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
        <p className="text-text-secondary">免费版永久免费，付费方案按月订阅，可随时取消</p>
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

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
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
                  <Button
                    className={`w-full ${plan.highlight ? "btn-glow" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={pending !== null}
                    onClick={() => onSwitch(plan.name)}
                  >
                    {pending === plan.name ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        切换中…
                      </>
                    ) : plan.name === "FREE" ? (
                      "降级为免费版"
                    ) : (
                      `切换到${plan.cn}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-text-tertiary mt-8">
        内测阶段未接入支付，套餐切换即时生效、无需付费；正式上线后将接入支付流程
      </p>
      </div>
      <SiteFooter />
    </>
  );
}
