import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { User, UserGroupMember } from "@/types";
import { initCategories, getDefaultInitCategories, getDefaultInitAccounts } from "@/server/categories";
import { initAccounts } from "@/server/accounts";
import { importCsv } from "@/server/import";
import fs from "fs";
import path from "path";


export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      groupMemberships: {
        include: { userGroup: true },
      },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    active: u.active,
    groupMemberships: u.groupMemberships.map((m) => ({
      userId: m.userId,
      userGroupId: m.userGroupId,
    })),
  }));
}

export async function getUserById(id: number): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      groupMemberships: {
        include: { userGroup: true },
      },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    active: user.active,
    groupMemberships: user.groupMemberships.map((m) => ({
      userId: m.userId,
      userGroupId: m.userGroupId,
    })),
  };
}

export async function createUser(data: {
  name: string;
  email?: string;
  avatar?: string;
  active?: boolean;
  password?: string;
}): Promise<User> {
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("该邮箱已被使用");
  }
  const passwordHash = data.password ? hashPassword(data.password) : undefined;
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      active: data.active ?? true,
      ...(passwordHash && { passwordHash }),
    },
  });
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatar, active: user.active };
}

export async function updateUser(
  id: number,
  data: { name?: string; email?: string | null; avatar?: string | null; active?: boolean; password?: string | null }
): Promise<User> {
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== id) throw new Error("该邮箱已被使用");
  }
  let passwordHash: string | null | undefined = undefined;
  if (data.password === null) {
    passwordHash = null;
  } else if (data.password) {
    passwordHash = hashPassword(data.password);
  }
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
      ...(data.active !== undefined && { active: data.active }),
      ...(passwordHash !== undefined && { passwordHash }),
    },
  });
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatar, active: user.active };
}

export async function clearUserData(id: number): Promise<void> {
  await prisma.$transaction([
    prisma.transactionAttachment.deleteMany({ where: { transaction: { userId: id } } }),
    prisma.transactionTemplate.deleteMany({ where: { userId: id } }),
    prisma.transaction.deleteMany({ where: { userId: id } }),
    prisma.attachment.deleteMany({ where: { userId: id } }),
    prisma.ruleGroup.deleteMany({ where: { userId: id } }),
    prisma.category.deleteMany({ where: { userId: id } }),
    prisma.account.deleteMany({ where: { userId: id } }),
    prisma.userGroupMember.deleteMany({ where: { userId: id } }),
    prisma.user.update({ where: { id }, data: { passwordHash: null } }),
  ]);
}

export async function importDemoData(id: number): Promise<{ accounts: number; categories: number; transactions: number }> {
  const [accountsResult, categoriesResult] = await Promise.all([
    initAccounts(id, getDefaultInitAccounts() as { name: string; type?: string; balance?: number; currency?: string; icon?: string }[]),
    initCategories(id, getDefaultInitCategories() as { name: string; parentName?: string | null; color?: string; icon?: string; note?: string }[]),
  ]);

  const csvPath = path.join(process.cwd(), "demo-data", "transactions.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  const mapping = [
    { systemField: "type", csvColumn: "类型" },
    { systemField: "amount", csvColumn: "金额" },
    { systemField: "dateTime", csvColumn: "日期" },
    { systemField: "note", csvColumn: "备注" },
    { systemField: "category", csvColumn: "分类" },
    { systemField: "account", csvColumn: "账户" },
  ];

  const txResult = await importCsv(id, csvContent, mapping);

  return {
    accounts: accountsResult.created,
    categories: categoriesResult.created,
    transactions: txResult.success,
  };
}

export async function deleteUser(id: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("用户不存在");
  await prisma.user.delete({ where: { id } });
}
