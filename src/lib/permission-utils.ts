import { prisma } from "@/lib/db";
import { hasPermission, getUserEffectivePermissions } from "@/server/groupPermissions";
import type { AccountPermissionId } from "@/types";

export class PermissionError extends Error {
  constructor(
    message: string,
    public permission: AccountPermissionId,
    public accountId?: number
  ) {
    super(message);
    this.name = "PermissionError";
  }
}

async function hasNoGroupMemberships(userId: number): Promise<boolean> {
  const count = await prisma.userGroupMember.count({ where: { userId } });
  return count === 0;
}

export async function requirePermission(
  userId: number,
  permission: AccountPermissionId,
  accountId?: number,
): Promise<void> {
  const isGod = await hasNoGroupMemberships(userId);
  if (isGod) return;
  const granted = await hasPermission(userId, permission, accountId);
  if (!granted) {
    const ctx = accountId ? ` (accountId: ${accountId})` : "";
    throw new PermissionError(
      `权限不足: 需要 ${permission}${ctx}`,
      permission,
      accountId,
    );
  }
}

export async function checkAnyAccountPermission(
  userId: number,
  permission: AccountPermissionId,
): Promise<boolean> {
  const isGod = await hasNoGroupMemberships(userId);
  if (isGod) return true;
  const perms = await getUserEffectivePermissions(userId);
  return perms.some((p) => p.permission === permission && p.granted);
}
