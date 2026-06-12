import { prisma } from "@/lib/db";
import type { Account, AccountType } from "@/types";
import defaultAccountsData from "@demo-data/accounts.json";

export async function getAccounts(userId: number): Promise<Account[]> {
  const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { id: "asc" } });
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as AccountType,
    balance: Number(a.balance),
    currency: a.currency,
    icon: a.icon,
    archived: a.archived,
  }));
}

export async function getAccountById(id: number, userId: number): Promise<Account | null> {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    type: account.type as AccountType,
    balance: Number(account.balance),
    currency: account.currency,
    icon: account.icon,
    archived: account.archived,
  };
}

export async function createAccount(userId: number, data: {
  name: string;
  type: string;
  balance?: number;
  currency?: string;
  icon?: string;
}): Promise<Account> {
  const existing = await prisma.account.findFirst({ where: { name: data.name, userId } });
  if (existing) {
    throw new Error("该名称的账户已存在");
  }
  const account = await prisma.account.create({
    data: {
      name: data.name,
      type: data.type as AccountType,
      balance: data.balance ?? 0,
      currency: data.currency ?? "CNY",
      icon: data.icon,
      userId,
    },
  });
  return {
    id: account.id,
    name: account.name,
    type: account.type as AccountType,
    balance: Number(account.balance),
    currency: account.currency,
    icon: account.icon,
    archived: account.archived,
  };
}

export async function updateAccount(
  id: number,
  userId: number,
  data: {
    name?: string;
    type?: string;
    balance?: number;
    icon?: string;
  }
): Promise<Account> {
  if (data.name) {
    const existing = await prisma.account.findFirst({ where: { name: data.name, userId } });
    if (existing && existing.id !== id) {
      throw new Error("该名称的账户已存在");
    }
  }
  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type as AccountType }),
      ...(data.balance !== undefined && { balance: data.balance }),
      ...(data.icon !== undefined && { icon: data.icon }),
    },
  });
  return {
    id: account.id,
    name: account.name,
    type: account.type as AccountType,
    balance: Number(account.balance),
    currency: account.currency,
    icon: account.icon,
    archived: account.archived,
  };
}

export async function deleteAccount(id: number, userId: number): Promise<void> {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw new Error("账户不存在");

  const [txCount, tmplCount] = await Promise.all([
    prisma.transaction.count({
      where: { OR: [{ accountId: id }, { toAccountId: id }] },
    }),
    prisma.transactionTemplate.count({
      where: { OR: [{ accountId: id }, { toAccountId: id }] },
    }),
  ]);

  if (txCount > 0) {
    throw new Error("该账户下存在交易记录，无法删除");
  }

  if (tmplCount > 0) {
    throw new Error("该账户下存在关联的模板，无法删除");
  }

  await prisma.account.delete({ where: { id } });
}

export async function archiveAccount(id: number, userId: number): Promise<Account> {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw new Error("账户不存在");
  const updated = await prisma.account.update({
    where: { id },
    data: { archived: true },
  });
  return {
    id: updated.id,
    name: updated.name,
    type: updated.type as AccountType,
    balance: Number(updated.balance),
    currency: updated.currency,
    icon: updated.icon,
    archived: updated.archived,
  };
}

export async function unarchiveAccount(id: number, userId: number): Promise<Account> {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw new Error("账户不存在");
  const updated = await prisma.account.update({
    where: { id },
    data: { archived: false },
  });
  return {
    id: updated.id,
    name: updated.name,
    type: updated.type as AccountType,
    balance: Number(updated.balance),
    currency: updated.currency,
    icon: updated.icon,
    archived: updated.archived,
  };
}

export async function batchDeleteAccounts(ids: number[], userId: number): Promise<{ deleted: number[]; failed: { id: number; reason: string }[] }> {
  const deleted: number[] = [];
  const failed: { id: number; reason: string }[] = [];

  for (const id of ids) {
    const account = await prisma.account.findFirst({ where: { id, userId } });
    if (!account) {
      failed.push({ id, reason: "账户不存在" });
      continue;
    }

    const [txCount, tmplCount] = await Promise.all([
      prisma.transaction.count({
        where: { OR: [{ accountId: id }, { toAccountId: id }] },
      }),
      prisma.transactionTemplate.count({
        where: { OR: [{ accountId: id }, { toAccountId: id }] },
      }),
    ]);

    if (txCount > 0) {
      failed.push({ id, reason: `账户"${account.name}"下存在交易记录，无法删除` });
      continue;
    }
    if (tmplCount > 0) {
      failed.push({ id, reason: `账户"${account.name}"下存在关联的模板，无法删除` });
      continue;
    }

    await prisma.account.delete({ where: { id } });
    deleted.push(id);
  }

  return { deleted, failed };
}

export async function initAccounts(
  userId: number,
  data: { name: string; type?: string; balance?: number; currency?: string; icon?: string }[]
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const item of data) {
    if (!item.name?.trim()) continue;
    const existing = await prisma.account.findFirst({ where: { name: item.name.trim(), userId } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.account.create({
      data: {
        name: item.name.trim(),
        type: (item.type as AccountType) ?? "VIRTUAL",
        balance: item.balance ?? 0,
        currency: item.currency ?? "CNY",
        icon: item.icon,
        userId,
      },
    });
    created++;
  }

  return { created, skipped };
}

export function getDefaultInitAccounts(): { name: string; type: string; balance: number; currency: string; icon?: string }[] {
  return defaultAccountsData as { name: string; type: string; balance: number; currency: string; icon?: string }[];
}

export async function getExportAccounts(userId: number): Promise<{ name: string; type: string; balance: number; currency: string }[]> {
  const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { id: "asc" } });
  return accounts.map((a) => ({
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
    currency: a.currency,
  }));
}
