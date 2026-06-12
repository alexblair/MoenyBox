import { prisma } from "@/lib/db";
import type { UserGroup, UserGroupMember, GroupPermission, User } from "@/types";

export async function getUserGroups(): Promise<UserGroup[]> {
  const groups = await prisma.userGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      members: {
        include: { user: true },
      },
      permissions: true,
    },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    icon: g.icon,
    color: g.color,
    sortOrder: g.sortOrder,
    members: g.members.map((m) => ({
      userId: m.userId,
      userGroupId: m.userGroupId,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        active: m.user.active,
      },
    })),
    permissions: g.permissions.map((p) => ({
      id: p.id,
      userGroupId: p.userGroupId,
      permission: p.permission as any,
      accountId: p.accountId,
      granted: p.granted,
    })),
  }));
}

export async function getUserGroupById(id: number): Promise<UserGroup | null> {
  const group = await prisma.userGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true },
      },
      permissions: true,
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
    members: group.members.map((m) => ({
      userId: m.userId,
      userGroupId: m.userGroupId,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        active: m.user.active,
      },
    })),
    permissions: group.permissions.map((p) => ({
      id: p.id,
      userGroupId: p.userGroupId,
      permission: p.permission as any,
      accountId: p.accountId,
      granted: p.granted,
    })),
  };
}

export async function createUserGroup(data: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  memberIds?: number[];
}): Promise<UserGroup> {
  const existing = await prisma.userGroup.findUnique({ where: { name: data.name } });
  if (existing) throw new Error("该名称的用户组已存在");
  const group = await prisma.userGroup.create({
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color ?? "#6366f1",
      sortOrder: data.sortOrder ?? 0,
      members: data.memberIds?.length
        ? { create: data.memberIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: { members: { include: { user: true } }, permissions: true },
  });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    color: group.color,
    sortOrder: group.sortOrder,
    members: group.members.map((m) => ({
      userId: m.userId,
      userGroupId: m.userGroupId,
      user: { id: m.user.id, name: m.user.name, email: m.user.email, avatar: m.user.avatar, active: m.user.active },
    })),
    permissions: [],
  };
}

export async function updateUserGroup(
  id: number,
  data: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string;
    sortOrder?: number;
    memberIds?: number[];
  }
): Promise<UserGroup> {
  if (data.name) {
    const existing = await prisma.userGroup.findUnique({ where: { name: data.name } });
    if (existing && existing.id !== id) throw new Error("该名称的用户组已存在");
  }
  if (data.memberIds !== undefined) {
    await prisma.userGroupMember.deleteMany({ where: { userGroupId: id } });
    if (data.memberIds.length > 0) {
      await prisma.userGroupMember.createMany({
        data: data.memberIds.map((userId) => ({ userId, userGroupId: id })),
      });
    }
  }
  const group = await prisma.userGroup.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
    include: { members: { include: { user: true } }, permissions: true },
  });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    color: group.color,
    sortOrder: group.sortOrder,
    members: group.members.map((m) => ({
      userId: m.userId,
      userGroupId: m.userGroupId,
      user: { id: m.user.id, name: m.user.name, email: m.user.email, avatar: m.user.avatar, active: m.user.active },
    })),
    permissions: group.permissions.map((p) => ({
      id: p.id,
      userGroupId: p.userGroupId,
      permission: p.permission as any,
      accountId: p.accountId,
      granted: p.granted,
    })),
  };
}

export async function deleteUserGroup(id: number): Promise<void> {
  const group = await prisma.userGroup.findUnique({ where: { id } });
  if (!group) throw new Error("用户组不存在");
  await prisma.userGroup.delete({ where: { id } });
}
