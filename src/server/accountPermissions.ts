import { prisma } from "@/lib/db";
import type { AccountPermission, AccountPermissionId } from "@/types";

export async function getAccountPermissions(params?: {
  accountId?: number;
  groupId?: number;
  permission?: string;
}): Promise<AccountPermission[]> {
  const where: Record<string, unknown> = {};
  if (params?.accountId !== undefined) where.accountId = params.accountId;
  if (params?.groupId !== undefined) where.groupId = params.groupId;
  if (params?.permission) where.permission = params.permission;

  const perms = await prisma.accountPermission.findMany({
    where,
    orderBy: { permission: "asc" },
  });
  return perms.map((p) => ({
    id: p.id,
    accountId: p.accountId,
    groupId: p.groupId,
    permission: p.permission as AccountPermissionId,
    granted: p.granted,
  }));
}

export async function getAccountPermissionById(id: number): Promise<AccountPermission | null> {
  const p = await prisma.accountPermission.findUnique({ where: { id } });
  if (!p) return null;
  return {
    id: p.id,
    accountId: p.accountId,
    groupId: p.groupId,
    permission: p.permission as AccountPermissionId,
    granted: p.granted,
  };
}

export async function createAccountPermission(data: {
  accountId?: number | null;
  groupId?: number | null;
  permission: AccountPermissionId;
  granted?: boolean;
}): Promise<AccountPermission> {
  const existing = await prisma.accountPermission.findUnique({
    where: {
      accountId_groupId_permission: {
        accountId: data.accountId ?? -1,
        groupId: data.groupId ?? -1,
        permission: data.permission,
      },
    },
  });
  if (existing) {
    throw new Error("该权限规则已存在");
  }
  const perm = await prisma.accountPermission.create({
    data: {
      accountId: data.accountId,
      groupId: data.groupId,
      permission: data.permission,
      granted: data.granted ?? true,
    },
  });
  return {
    id: perm.id,
    accountId: perm.accountId,
    groupId: perm.groupId,
    permission: perm.permission as AccountPermissionId,
    granted: perm.granted,
  };
}

export async function updateAccountPermission(
  id: number,
  data: {
    accountId?: number | null;
    groupId?: number | null;
    permission?: AccountPermissionId;
    granted?: boolean;
  }
): Promise<AccountPermission> {
  const perm = await prisma.accountPermission.update({
    where: { id },
    data: {
      ...(data.accountId !== undefined && { accountId: data.accountId }),
      ...(data.groupId !== undefined && { groupId: data.groupId }),
      ...(data.permission !== undefined && { permission: data.permission }),
      ...(data.granted !== undefined && { granted: data.granted }),
    },
  });
  return {
    id: perm.id,
    accountId: perm.accountId,
    groupId: perm.groupId,
    permission: perm.permission as AccountPermissionId,
    granted: perm.granted,
  };
}

export async function deleteAccountPermission(id: number): Promise<void> {
  const perm = await prisma.accountPermission.findUnique({ where: { id } });
  if (!perm) throw new Error("权限规则不存在");
  await prisma.accountPermission.delete({ where: { id } });
}

export async function getEffectivePermissions(accountId: number): Promise<Record<string, boolean>> {
  const perms = await prisma.accountPermission.findMany({
    where: {
      OR: [
        { accountId },
        { accountId: null },
        { groupId: { not: null } },
        { accountId: null, groupId: null },
      ],
    },
  });

  const result: Record<string, boolean> = {};
  for (const perm of perms) {
    if (perm.accountId === null) {
      if (perm.groupId === null) {
        if (!(perm.permission in result)) {
          result[perm.permission] = perm.granted;
        }
      }
    } else if (perm.accountId === accountId) {
      result[perm.permission] = perm.granted;
    }
  }
  return result;
}
