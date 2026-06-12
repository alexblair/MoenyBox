import { NextRequest, NextResponse } from "next/server";
import { getMonthlySummary } from "@/server/reports";
import { getServerUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get("year") || "";
    const year = parseInt(yearStr, 10);
    if (!yearStr || isNaN(year)) {
      return NextResponse.json({ error: "缺少有效的 year 参数" }, { status: 400 });
    }
    const data = await getMonthlySummary(year, user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取月度汇总失败" }, { status: 500 });
  }
}
