import { NextResponse } from "next/server";
import { getGroupPermissions, createGroupPermission } from "@/server/groupPermissions";
import { getServerUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const url = new URL(req.url);
    const params = {
      userGroupId: url.searchParams.get("userGroupId")
        ? Number(url.searchParams.get("userGroupId"))
        : undefined,
      permission: url.searchParams.get("permission") || undefined,
      accountId: url.searchParams.get("accountId")
        ? Number(url.searchParams.get("accountId"))
        : undefined,
    };
    const perms = await getGroupPermissions(params);
    return NextResponse.json(perms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const perm = await createGroupPermission(data);
    return NextResponse.json(perm, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
