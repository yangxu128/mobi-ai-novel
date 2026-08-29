import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PricingClient } from "@/components/pricing/pricing-client";

export default async function PricingPage() {
  const user = await getCurrentUser();

  let currentPlan: "FREE" | "BASIC" | "PRO" | "ADMIN" | null = null;
  let expiresAt: string | null = null;

  if (user) {
    if (user.role === "ADMIN") {
      currentPlan = "ADMIN";
    } else {
      const sub = await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { plan: true, expiresAt: true },
      });
      currentPlan = sub?.plan ?? (user.role as "FREE" | "BASIC" | "PRO");
      expiresAt = sub?.expiresAt ? sub.expiresAt.toISOString() : null;
    }
  }

  return <PricingClient currentPlan={currentPlan} expiresAt={expiresAt} />;
}
