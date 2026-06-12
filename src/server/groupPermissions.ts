import { prisma } from "@/lib/db";
import type { GroupPermission, AccountPermissionId } from "@/types";

export async function getGroupPermissions(params?: {
  userGroupId?: number;
  permission?: string;
  accountId?: number;
}): Promise<GroupPermission[]> {
  const where: Record<string, unknown> = {};
  if (params?.userGroupId !== undefined) where.userGroupId = params.userGroupId;
  if (params?.permission) where.permission = params.permission;
  if (params?.accountId !== undefined) where.accountId = params.accountId;

  const perms = await prisma.groupPermission.findMany({
    where,
    orderBy: { permission: "asc" },
  });
  return perms.map((p) => ({
    id: p.id,
    userGroupId: p.userGroupId,
    permission: p.permission as AccountPermissionId,
    accountId: p.accountId,
    granted: p.granted,
  }));
}

export async function getGroupPermissionById(id: number): Promise<GroupPermission | null> {
  const p = await prisma.groupPermission.findUnique({ where: { id } });
  if (!p) return null;
  return {
    id: p.id,
    userGroupId: p.userGroupId,
    permission: p.permission as AccountPermissionId,
    accountId: p.accountId,
    granted: p.granted,
  };
}

export async function createGroupPermission(data: {
  userGroupId: number;
  permission: AccountPermissionId;
  accountId?: number | null;
  granted?: boolean;
}): Promise<GroupPermission> {
  const existing = await prisma.groupPermission.findUnique({
    where: {
      userGroupId_permission_accountId: {
        userGroupId: data.userGroupId,
        permission: data.permission,
        accountId: data.accountId ?? -1,
      },
    },
  });
  if (existing) throw new Error("该权限规则已存在");
  const perm = await prisma.groupPermission.create({
    data: {
      userGroupId: data.userGroupId,
      permission: data.permission,
      accountId: data.accountId,
      granted: data.granted ?? true,
    },
  });
  return {
    id: perm.id,
    userGroupId: perm.userGroupId,
    permission: perm.permission as AccountPermissionId,
    accountId: perm.accountId,
    granted: perm.granted,
  };
}

export async function updateGroupPermission(
  id: number,
  data: { permission?: AccountPermissionId; accountId?: number | null; granted?: boolean }
): Promise<GroupPermission> {
  const perm = await prisma.groupPermission.update({
    where: { id },
    data: {
      ...(data.permission !== undefined && { permission: data.permission }),
      ...(data.accountId !== undefined && { accountId: data.accountId }),
      ...(data.granted !== undefined && { granted: data.granted }),
    },
  });
  return {
    id: perm.id,
    userGroupId: perm.userGroupId,
    permission: perm.permission as AccountPermissionId,
    accountId: perm.accountId,
    granted: perm.granted,
  };
}

export async function deleteGroupPermission(id: number): Promise<void> {
  const perm = await prisma.groupPermission.findUnique({ where: { id } });
  if (!perm) throw new Error("权限规则不存在");
  await prisma.groupPermission.delete({ where: { id } });
}

export async function getUserEffectivePermissions(
  userId: number,
  accountId?: number
): Promise<{ permission: AccountPermissionId; granted: boolean }[]> {
  const memberships = await prisma.userGroupMember.findMany({
    where: { userId },
    include: {
      userGroup: {
        include: { permissions: true },
      },
    },
  });

  const permissionMap = new Map<string, boolean>();

  for (const membership of memberships) {
    for (const perm of membership.userGroup.permissions) {
      if (accountId !== undefined && perm.accountId !== null && perm.accountId !== accountId) {
        continue;
      }
      const key = `${perm.permission}:${perm.accountId ?? "global"}`;
      if (perm.granted) {
        permissionMap.set(key, true);
      } else if (!permissionMap.has(key)) {
        permissionMap.set(key, false);
      }
    }
  }

  const result: { permission: AccountPermissionId; granted: boolean }[] = [];
  for (const [key, granted] of permissionMap) {
    const permission = key.split(":")[0] as AccountPermissionId;
    result.push({ permission, granted });
  }
  return result;
}

export async function hasPermission(
  userId: number,
  permission: AccountPermissionId,
  accountId?: number
): Promise<boolean> {
  const perms = await getUserEffectivePermissions(userId, accountId);
  return perms.some((p) => p.permission === permission && p.granted);
}
