import { NextRequest, NextResponse } from "next/server";
import { getAccountById, updateAccount, deleteAccount, archiveAccount, unarchiveAccount } from "@/server/accounts";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    const account = await getAccountById(id, user.id);
    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 });
    }
    return NextResponse.json(account);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取账户失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const id = Number(params.id);
    const body = await request.json();
    if (body.archived === true) {
      const account = await archiveAccount(id, user.id);
      return NextResponse.json(account);
    }
    if (body.archived === false) {
      const account = await unarchiveAccount(id, user.id);
      return NextResponse.json(account);
    }
    const account = await updateAccount(id, user.id, body);
    return NextResponse.json(account);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "更新账户失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.delete");
    const id = Number(params.id);
    await deleteAccount(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const status = error.message.includes("无法删除") ? 400 : 500;
    return NextResponse.json({ error: error.message || "删除账户失败" }, { status });
  }
}
