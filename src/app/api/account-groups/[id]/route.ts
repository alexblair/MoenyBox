import { NextRequest, NextResponse } from "next/server";
import { getAccountGroupById, updateAccountGroup, deleteAccountGroup } from "@/server/accountGroups";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    const group = await getAccountGroupById(id, user.id);
    if (!group) {
      return NextResponse.json({ error: "账户组不存在" }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取账户组失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account_group.manage");
    const id = Number(params.id);
    const body = await request.json();
    const group = await updateAccountGroup(id, user.id, body);
    return NextResponse.json(group);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "更新账户组失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account_group.manage");
    const id = Number(params.id);
    await deleteAccountGroup(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "删除账户组失败" }, { status: 500 });
  }
}
