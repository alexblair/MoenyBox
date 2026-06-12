import { NextRequest, NextResponse } from "next/server";
import { getAccountPermissionById, updateAccountPermission, deleteAccountPermission } from "@/server/accountPermissions";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    const perm = await getAccountPermissionById(id);
    if (!perm) {
      return NextResponse.json({ error: "权限规则不存在" }, { status: 404 });
    }
    return NextResponse.json(perm);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取权限规则失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    const body = await request.json();
    const perm = await updateAccountPermission(id, body);
    return NextResponse.json(perm);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "更新权限规则失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    await deleteAccountPermission(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "删除权限规则失败" }, { status: 500 });
  }
}
