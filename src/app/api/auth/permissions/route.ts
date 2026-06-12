import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserEffectivePermissions } from "@/server/groupPermissions";
import { ACCOUNT_PERMISSIONS } from "@/types";

const ALL_PERMISSIONS: { permission: string; granted: boolean }[] = ACCOUNT_PERMISSIONS.map((p) => ({
  permission: p.id,
  granted: true,
}));

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const membershipCount = await prisma.userGroupMember.count({ where: { userId: user.id } });
    if (membershipCount === 0) {
      return NextResponse.json(ALL_PERMISSIONS);
    }
    const perms = await getUserEffectivePermissions(user.id);
    return NextResponse.json(perms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
