import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate } from "@/server/templates";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const templates = await getTemplates(user.id);
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取模板列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.create");
    const body = await request.json();
    const template = await createTemplate(user.id, body);
    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "创建模板失败" }, { status: 500 });
  }
}
