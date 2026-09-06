import { getCurrentUser } from "@/lib/session";
import { checkIn } from "@/lib/ai/credits";
import { NextResponse } from "next/server";

/** 每日签到：+50 积分（每北京时间天一次） */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const r = await checkIn(user.id, user.role);
  return NextResponse.json(r);
}
