import { NextRequest, NextResponse } from "next/server";
import { getNetWorthTrend } from "@/server/reports";
import { getServerUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    if (!from || !to) {
      return NextResponse.json({ error: "缺少 from 或 to 参数" }, { status: 400 });
    }
    const data = await getNetWorthTrend({ from, to }, user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取净资产趋势失败" }, { status: 500 });
  }
}
