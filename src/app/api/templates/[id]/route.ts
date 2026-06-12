import { NextRequest, NextResponse } from "next/server";
import { getTemplateById, updateTemplate, deleteTemplate } from "@/server/templates";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    const template = await getTemplateById(id, user.id);
    if (!template) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取模板失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.edit");
    const id = Number(params.id);
    const body = await request.json();
    const template = await updateTemplate(id, user.id, body);
    return NextResponse.json(template);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "更新模板失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.delete");
    const id = Number(params.id);
    await deleteTemplate(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "删除模板失败" }, { status: 500 });
  }
}
