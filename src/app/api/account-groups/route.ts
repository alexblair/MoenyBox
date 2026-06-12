import { NextRequest, NextResponse } from "next/server";
import { getAccountGroups, createAccountGroup } from "@/server/accountGroups";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const groups = await getAccountGroups(user.id);
    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取账户组列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account_group.manage");
    const body = await request.json();
    const group = await createAccountGroup(user.id, body);
    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "创建账户组失败" }, { status: 500 });
  }
}
