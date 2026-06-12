import { prisma } from "@/lib/db";
import type { AccountGroup, AccountGroupMember, AccountType } from "@/types";

export async function getAccountGroups(userId: number): Promise<AccountGroup[]> {
  const groups = await prisma.accountGroup.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    include: {
      members: {
        where: { account: { userId } },
        include: { account: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    icon: g.icon,
    color: g.color,
    sortOrder: g.sortOrder,
    archived: g.archived,
    members: g.members.map((m) => ({
      accountId: m.accountId,
      groupId: m.groupId,
      sortOrder: m.sortOrder,
      account: {
        id: m.account.id,
        name: m.account.name,
        type: m.account.type as AccountType,
        balance: Number(m.account.balance),
        currency: m.account.currency,
        icon: m.account.icon,
        archived: m.account.archived,
      },
    })),
  }));
}

export async function getAccountGroupById(id: number, userId: number): Promise<AccountGroup | null> {
  const group = await prisma.accountGroup.findFirst({
    where: { id, userId },
    include: {
      members: {
        include: { account: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!group) return null;
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    color: group.color,
    sortOrder: group.sortOrder,
    archived: group.archived,
    members: group.members.map((m) => ({
      accountId: m.accountId,
      groupId: m.groupId,
      sortOrder: m.sortOrder,
      account: {
        id: m.account.id,
        name: m.account.name,
        type: m.account.type as AccountType,
        balance: Number(m.account.balance),
        currency: m.account.currency,
        icon: m.account.icon,
        archived: m.account.archived,
      },
    })),
  };
}

export async function createAccountGroup(userId: number, data: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  memberIds?: number[];
}): Promise<AccountGroup> {
  const existing = await prisma.accountGroup.findFirst({ where: { name: data.name, userId } });
  if (existing) {
    throw new Error("该名称的账户组已存在");
  }
  const group = await prisma.accountGroup.create({
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color ?? "#6366f1",
      sortOrder: data.sortOrder ?? 0,
      userId,
      members: data.memberIds?.length
        ? {
            create: data.memberIds.map((accountId, i) => ({
              accountId,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: {
      members: {
        include: { account: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    color: group.color,
    sortOrder: group.sortOrder,
    archived: group.archived,
    members: group.members.map((m) => ({
      accountId: m.accountId,
      groupId: m.groupId,
      sortOrder: m.sortOrder,
      account: {
        id: m.account.id,
        name: m.account.name,
        type: m.account.type as AccountType,
        balance: Number(m.account.balance),
        currency: m.account.currency,
        icon: m.account.icon,
        archived: m.account.archived,
      },
    })),
  };
}

export async function updateAccountGroup(
  id: number,
  userId: number,
  data: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string;
    sortOrder?: number;
    archived?: boolean;
    memberIds?: number[];
  }
): Promise<AccountGroup> {
  if (data.name) {
    const existing = await prisma.accountGroup.findFirst({ where: { name: data.name, userId } });
    if (existing && existing.id !== id) {
      throw new Error("该名称的账户组已存在");
    }
  }

  if (data.memberIds !== undefined) {
    await prisma.accountGroupMember.deleteMany({ where: { groupId: id } });
    if (data.memberIds.length > 0) {
      await prisma.accountGroupMember.createMany({
        data: data.memberIds.map((accountId, i) => ({
          accountId,
          groupId: id,
          sortOrder: i,
        })),
      });
    }
  }

  const group = await prisma.accountGroup.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.archived !== undefined && { archived: data.archived }),
    },
    include: {
      members: {
        include: { account: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    color: group.color,
    sortOrder: group.sortOrder,
    archived: group.archived,
    members: group.members.map((m) => ({
      accountId: m.accountId,
      groupId: m.groupId,
      sortOrder: m.sortOrder,
      account: {
        id: m.account.id,
        name: m.account.name,
        type: m.account.type as AccountType,
        balance: Number(m.account.balance),
        currency: m.account.currency,
        icon: m.account.icon,
        archived: m.account.archived,
      },
    })),
  };
}

export async function deleteAccountGroup(id: number, userId: number): Promise<void> {
  const group = await prisma.accountGroup.findFirst({ where: { id, userId } });
  if (!group) throw new Error("账户组不存在");
  await prisma.accountGroup.delete({ where: { id } });
}
