import { NextResponse } from "next/server";
import { getDashboardCharts } from "@/server/dashboard";
import { getServerUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const data = await getDashboardCharts(user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取仪表盘数据失败" }, { status: 500 });
  }
}
