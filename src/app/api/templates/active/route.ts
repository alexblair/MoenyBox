import { NextResponse } from "next/server";
import { getActiveTemplates } from "@/server/templates";
import { getServerUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const templates = await getActiveTemplates(user.id);
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取可用模板失败" }, { status: 500 });
  }
}
