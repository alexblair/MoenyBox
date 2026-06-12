import { prisma } from "@/lib/db";
import { Transaction, TransactionSearchParams, PaginatedResult, TransactionType, DuplicateGroup } from "@/types";

function toTransaction(t: any): Transaction {
  return {
    id: t.id,
    type: t.type as TransactionType,
    amount: Number(t.amount),
    categoryId: t.categoryId,
    accountId: t.accountId,
    toAccountId: t.toAccountId,
    note: t.note,
    dateTime: t.dateTime instanceof Date ? t.dateTime.toISOString() : String(t.dateTime),
    category: t.category ? { ...t.category } : null,
    account: t.account
      ? { ...t.account, balance: Number(t.account.balance) }
      : null,
    toAccount: t.toAccount
      ? { ...t.toAccount, balance: Number(t.toAccount.balance) }
      : null,
    attachments: t.attachments
      ? t.attachments.map((ta: any) => {
          const a = ta.attachment || ta;
          const { transactionId, ...rest } = a;
          return rest;
        })
      : undefined,
  };
}

async function rollbackBalance(tx: any, old: any): Promise<void> {
  const amount = Number(old.amount);
  if (old.type === "EXPENSE") {
    await tx.account.update({
      where: { id: old.accountId },
      data: { balance: { increment: amount } },
    });
  } else if (old.type === "INCOME") {
    await tx.account.update({
      where: { id: old.accountId },
      data: { balance: { decrement: amount } },
    });
  } else if (old.type === "TRANSFER") {
    await tx.account.update({
      where: { id: old.accountId },
      data: { balance: { increment: amount } },
    });
    if (old.toAccountId) {
      await tx.account.update({
        where: { id: old.toAccountId },
        data: { balance: { decrement: amount } },
      });
    }
  }
}

async function applyBalance(
  tx: any,
  data: { type: string; amount: number; accountId: number; toAccountId?: number | null }
): Promise<void> {
  if (data.type === "EXPENSE") {
    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: { decrement: data.amount } },
    });
  } else if (data.type === "INCOME") {
    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: { increment: data.amount } },
    });
  } else if (data.type === "TRANSFER") {
    if (!data.toAccountId) throw new Error("转账交易需要指定目标账户");
    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: { decrement: data.amount } },
    });
    await tx.account.update({
      where: { id: data.toAccountId },
      data: { balance: { increment: data.amount } },
    });
  }
}

export async function getTransactions(
  userId: number,
  params: TransactionSearchParams
): Promise<PaginatedResult<Transaction>> {
  const ALL = params.pageSize === -1;
  const page = Math.max(1, params.page || 1);
  const pageSize = ALL ? -1 : Math.max(1, Math.min(100, params.pageSize || 20));
  const skip = ALL ? 0 : (page - 1) * pageSize;

  const where: any = { userId };

  if (params.type) where.type = params.type;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.accountId) {
    where.OR = [{ accountId: params.accountId }, { toAccountId: params.accountId }];
  }
  if (params.dateFrom || params.dateTo) {
    where.dateTime = {};
    if (params.dateFrom) where.dateTime.gte = new Date(params.dateFrom);
    if (params.dateTo) where.dateTime.lte = new Date(params.dateTo);
  }
  if (params.amountMin !== undefined || params.amountMax !== undefined) {
    where.amount = {};
    if (params.amountMin !== undefined) where.amount.gte = params.amountMin;
    if (params.amountMax !== undefined) where.amount.lte = params.amountMax;
  }
  if (params.keyword) {
    where.note = { contains: params.keyword };
  }

  const allowedSortFields = ["dateTime", "amount", "createdAt", "updatedAt"];
  const sortBy =
    params.sortBy && allowedSortFields.includes(params.sortBy)
      ? params.sortBy
      : "dateTime";
  const sortOrder = params.sortOrder || "desc";

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, account: true, toAccount: true },
      orderBy: { [sortBy]: sortOrder },
      ...(ALL ? {} : { skip, take: pageSize }),
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions.map(toTransaction),
    total,
    page: ALL ? 1 : page,
    pageSize: ALL ? total || 0 : pageSize,
    totalPages: ALL ? 1 : Math.ceil(total / pageSize),
  };
}

export async function getTransactionById(id: number, userId: number): Promise<Transaction | null> {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: {
      category: true,
      account: true,
      toAccount: true,
      attachments: { include: { attachment: true } },
    },
  });
  if (!transaction) return null;
  return toTransaction(transaction);
}

export async function createTransaction(userId: number, data: {
  type: string;
  amount: number;
  categoryId?: number | null;
  accountId: number;
  toAccountId?: number | null;
  note?: string | null;
  dateTime?: string;
}): Promise<Transaction> {
  const result = await prisma.$transaction(async (tx) => {
    await applyBalance(tx, {
      type: data.type,
      amount: data.amount,
      accountId: data.accountId,
      toAccountId: data.toAccountId,
    });

    const transaction = await tx.transaction.create({
      data: {
        type: data.type as TransactionType,
        amount: data.amount,
        categoryId: data.categoryId ?? null,
        accountId: data.accountId,
        toAccountId: data.toAccountId ?? null,
        note: data.note ?? null,
        dateTime: data.dateTime ? new Date(data.dateTime) : undefined,
        userId,
      },
      include: { category: true, account: true, toAccount: true },
    });

    return transaction;
  });

  return toTransaction(result);
}

export async function updateTransaction(
  id: number,
  userId: number,
  data: {
    type?: string;
    amount?: number;
    categoryId?: number | null;
    accountId?: number;
    toAccountId?: number | null;
    note?: string | null;
    dateTime?: string;
  }
): Promise<Transaction> {
  const result = await prisma.$transaction(async (tx) => {
    const old = await tx.transaction.findFirst({ where: { id, userId } });
    if (!old) throw new Error("交易不存在");

    await rollbackBalance(tx, old);

    const newType = data.type ?? old.type;
    const newAmount = data.amount ?? Number(old.amount);
    const newAccountId = data.accountId ?? old.accountId;
    const newToAccountId =
      data.toAccountId !== undefined ? data.toAccountId : old.toAccountId;

    await applyBalance(tx, {
      type: newType,
      amount: newAmount,
      accountId: newAccountId,
      toAccountId: newToAccountId,
    });

    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.toAccountId !== undefined) updateData.toAccountId = data.toAccountId;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.dateTime !== undefined) updateData.dateTime = new Date(data.dateTime);

    const transaction = await tx.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true, account: true, toAccount: true },
    });

    return transaction;
  });

  return toTransaction(result);
}

import { cleanupOrphanAttachments } from "@/server/attachments";

export async function deleteTransaction(id: number, userId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const old = await tx.transaction.findFirst({ where: { id, userId } });
    if (!old) throw new Error("交易不存在");

    await rollbackBalance(tx, old);
    await tx.transaction.delete({ where: { id } });
  });

  await cleanupOrphanAttachments();
}

export async function batchUpdateTransactions(
  ids: number[],
  userId: number,
  data: {
    type?: string;
    amount?: number;
    categoryId?: number | null;
    accountId?: number;
  }
): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const id of ids) {
      const old = await tx.transaction.findFirst({ where: { id, userId } });
      if (!old) continue;

      await rollbackBalance(tx, old);

      const newType = data.type ?? old.type;
      const newAmount = data.amount ?? Number(old.amount);
      const newAccountId = data.accountId ?? old.accountId;

      await applyBalance(tx, {
        type: newType,
        amount: newAmount,
        accountId: newAccountId,
      });

      const updateData: any = {};
      if (data.type !== undefined) updateData.type = data.type;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.accountId !== undefined) updateData.accountId = data.accountId;

      await tx.transaction.update({ where: { id }, data: updateData });
      count++;
    }
    return count;
  });
}

export async function batchDeleteTransactions(ids: number[], userId: number): Promise<number> {
  const count = await prisma.$transaction(async (tx) => {
    let c = 0;
    for (const id of ids) {
      const old = await tx.transaction.findFirst({ where: { id, userId } });
      if (!old) continue;

      await rollbackBalance(tx, old);
      await tx.transaction.delete({ where: { id } });
      c++;
    }
    return c;
  });

  await cleanupOrphanAttachments();
  return count;
}

export async function cloneTransactions(
  ids: number[],
  userId: number,
  overrides: {
    dateTime?: string;
    amount?: number;
    note?: string | null;
    categoryId?: number | null;
    type?: string;
  } = {}
): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const id of ids) {
      const original = await tx.transaction.findFirst({ where: { id, userId } });
      if (!original) continue;

      const newData: any = {
        type: overrides.type ?? original.type,
        amount: overrides.amount ?? Number(original.amount),
        categoryId:
          overrides.categoryId !== undefined
            ? overrides.categoryId
            : original.categoryId,
        accountId: original.accountId,
        toAccountId: original.toAccountId,
        note: overrides.note !== undefined ? overrides.note : original.note,
        dateTime: overrides.dateTime
          ? new Date(overrides.dateTime)
          : new Date(),
        userId,
      };

      const transaction = await tx.transaction.create({ data: newData });

      await applyBalance(tx, {
        type: newData.type,
        amount: newData.amount,
        accountId: newData.accountId,
        toAccountId: newData.toAccountId,
      });

      count++;
    }
    return count;
  });
}

export async function detectDuplicates(userId: number, params: {
  fields: string[];
  type?: TransactionType;
  categoryId?: number;
  accountId?: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
}): Promise<{ groups: DuplicateGroup[]; totalDuplicates: number }> {
  if (!params.fields || params.fields.length === 0) {
    throw new Error("至少选择一个比较字段");
  }

  const where: any = { userId };
  if (params.type) where.type = params.type;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.accountId) {
    where.OR = [{ accountId: params.accountId }, { toAccountId: params.accountId }];
  }
  if (params.dateFrom || params.dateTo) {
    where.dateTime = {};
    if (params.dateFrom) where.dateTime.gte = new Date(params.dateFrom);
    if (params.dateTo) where.dateTime.lte = new Date(params.dateTo);
  }
  if (params.keyword) {
    where.note = { contains: params.keyword };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, account: true, toAccount: true },
    orderBy: { id: "asc" },
  });

  const mapped = transactions.map(toTransaction);
  const groups = new Map<string, Transaction[]>();

  for (const txn of mapped) {
    const keyParts: string[] = [];
    for (const field of params.fields) {
      switch (field) {
        case "type":
          keyParts.push(txn.type);
          break;
        case "amount":
          keyParts.push(String(txn.amount));
          break;
        case "categoryId":
          keyParts.push(String(txn.categoryId ?? "__null__"));
          break;
        case "accountId":
          keyParts.push(String(txn.accountId));
          break;
        case "note":
          keyParts.push(txn.note ?? "__null__");
          break;
        case "dateDay":
          keyParts.push(txn.dateTime?.slice(0, 10) ?? "__null__");
          break;
        case "dateHour":
          keyParts.push(txn.dateTime?.slice(0, 13) ?? "__null__");
          break;
        case "dateMinute":
          keyParts.push(txn.dateTime?.slice(0, 16) ?? "__null__");
          break;
        case "dateExact":
          keyParts.push(txn.dateTime ?? "__null__");
          break;
      }
    }
    const key = keyParts.join("||");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(txn);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  let totalDuplicates = 0;

  for (const [, txns] of groups) {
    if (txns.length <= 1) continue;
    const sorted = txns.sort((a, b) => a.id - b.id);
    duplicateGroups.push({
      count: sorted.length,
      transactions: sorted,
      keepId: sorted[0].id,
      removeIds: sorted.slice(1).map((t) => t.id),
    });
    totalDuplicates += sorted.length - 1;
  }

  duplicateGroups.sort(
    (a, b) =>
      Math.max(...b.transactions.map((t) => t.id)) -
      Math.max(...a.transactions.map((t) => t.id))
  );

  return { groups: duplicateGroups, totalDuplicates };
}
