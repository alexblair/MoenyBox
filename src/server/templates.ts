import { prisma } from "@/lib/db";
import type { TransactionTemplate, TransactionType } from "@/types";

function toTemplate(t: any): TransactionTemplate {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    amount: Number(t.amount),
    categoryId: t.categoryId,
    accountId: t.accountId,
    toAccountId: t.toAccountId,
    note: t.note,
    sortOrder: t.sortOrder,
    parentId: t.parentId,
    active: t.active,
    category: t.category ? { ...t.category } : null,
    account: t.account ? { ...t.account, balance: Number(t.account.balance) } : null,
    toAccount: t.toAccount ? { ...t.toAccount, balance: Number(t.toAccount.balance) } : null,
    children: t.children
      ? t.children.map((c: any) => toTemplate(c))
      : undefined,
  };
}

export async function getTemplates(userId: number): Promise<TransactionTemplate[]> {
  const templates = await prisma.transactionTemplate.findMany({
    where: { userId, parentId: null },
    include: {
      category: true,
      account: true,
      toAccount: true,
      children: {
        include: {
          category: true,
          account: true,
          toAccount: true,
          children: {
            include: {
              category: true,
              account: true,
              toAccount: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return templates.map(toTemplate);
}

export async function getActiveTemplates(userId: number): Promise<TransactionTemplate[]> {
  const templates = await prisma.transactionTemplate.findMany({
    where: { userId, active: true, parentId: null },
    include: {
      category: true,
      account: true,
      toAccount: true,
      children: {
        where: { active: true },
        include: {
          category: true,
          account: true,
          toAccount: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return templates.map(toTemplate);
}

export async function getTemplateById(id: number, userId: number): Promise<TransactionTemplate | null> {
  const template = await prisma.transactionTemplate.findFirst({
    where: { id, userId },
    include: {
      category: true,
      account: true,
      toAccount: true,
      children: {
        include: {
          category: true,
          account: true,
          toAccount: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!template) return null;
  return toTemplate(template);
}

export async function createTemplate(userId: number, data: {
  name: string;
  type: string;
  amount: number;
  categoryId?: number | null;
  accountId: number;
  toAccountId?: number | null;
  note?: string | null;
  sortOrder?: number;
  parentId?: number | null;
  active?: boolean;
}): Promise<TransactionTemplate> {
  const template = await prisma.transactionTemplate.create({
    data: {
      name: data.name,
      type: data.type as TransactionType,
      amount: data.amount,
      categoryId: data.categoryId ?? null,
      accountId: data.accountId,
      toAccountId: data.toAccountId ?? null,
      note: data.note ?? null,
      sortOrder: data.sortOrder ?? 0,
      parentId: data.parentId ?? null,
      active: data.active ?? true,
      userId,
    },
    include: { category: true, account: true, toAccount: true },
  });
  return toTemplate(template);
}

export async function updateTemplate(
  id: number,
  userId: number,
  data: {
    name?: string;
    type?: string;
    amount?: number;
    categoryId?: number | null;
    accountId?: number;
    toAccountId?: number | null;
    note?: string | null;
    sortOrder?: number;
    parentId?: number | null;
    active?: boolean;
  }
): Promise<TransactionTemplate> {
  const existing = await prisma.transactionTemplate.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("模板不存在");
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.accountId !== undefined) updateData.accountId = data.accountId;
  if (data.toAccountId !== undefined) updateData.toAccountId = data.toAccountId;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.parentId !== undefined) updateData.parentId = data.parentId;
  if (data.active !== undefined) updateData.active = data.active;

  const template = await prisma.transactionTemplate.update({
    where: { id },
    data: updateData,
    include: { category: true, account: true, toAccount: true },
  });
  return toTemplate(template);
}

export async function deleteTemplate(id: number, userId: number): Promise<void> {
  const existing = await prisma.transactionTemplate.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("模板不存在");
  await prisma.transactionTemplate.delete({ where: { id } });
}

export async function cloneTransactionsAsTemplate(
  userId: number,
  transactionIds: number[],
  name: string,
  parentId?: number | null
): Promise<TransactionTemplate> {
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, userId },
    include: { category: true, account: true, toAccount: true },
  });

  if (transactions.length === 0) {
    throw new Error("未找到交易记录");
  }

  const first = transactions[0];
  const sameForAll = transactions.every(
    (t) => t.type === first.type && t.accountId === first.accountId
  );

  const template = await prisma.transactionTemplate.create({
    data: {
      name,
      type: sameForAll ? first.type : "EXPENSE",
      amount: sameForAll
        ? first.amount
        : transactions.reduce((s, t) => s + Number(t.amount), 0),
      accountId: sameForAll ? first.accountId : first.accountId,
      toAccountId: first.toAccountId,
      categoryId: first.categoryId,
      note: first.note,
      parentId: parentId ?? null,
      active: true,
      userId,
    },
    include: { category: true, account: true, toAccount: true },
  });

  return toTemplate(template);
}
