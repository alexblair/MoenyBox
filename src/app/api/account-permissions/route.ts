import { NextRequest, NextResponse } from "next/server";
import { getAccountPermissions, createAccountPermission } from "@/server/accountPermissions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, unknown> = {};
    const accountId = searchParams.get("accountId");
    const groupId = searchParams.get("groupId");
    const permission = searchParams.get("permission");
    if (accountId) params.accountId = Number(accountId);
    if (groupId) params.groupId = Number(groupId);
    if (permission) params.permission = permission;

    const perms = await getAccountPermissions(params);
    return NextResponse.json(perms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取权限列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const perm = await createAccountPermission(body);
    return NextResponse.json(perm, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "创建权限规则失败" }, { status: 500 });
  }
}
