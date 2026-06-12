import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTransaction, updateTransaction, deleteTransaction, getTransactions, getTransactionById } from "@/server/transactions";

interface MockTx {
  transaction: { create: any; findFirst: any; update: any; delete: any };
  account: { update: any };
}

function createMockTx(): MockTx {
  return {
    transaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: { update: vi.fn() },
  };
}

vi.mock("@/lib/db", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    attachment: {
      findMany: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const { prisma } = await import("@/lib/db");

describe("createTransaction", () => {
  let mockTx: MockTx;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx = createMockTx();
    mockTx.transaction.create.mockResolvedValue({
      id: 1,
      type: "EXPENSE",
      amount: 50,
      categoryId: 1,
      accountId: 1,
      toAccountId: null,
      note: "午餐",
      dateTime: new Date("2024-06-15"),
      category: { id: 1, name: "餐饮" },
      account: { id: 1, name: "现金", balance: 950 },
      toAccount: null,
    });
    (prisma.$transaction as any).mockImplementation(
      (cb: (tx: MockTx) => any) => cb(mockTx)
    );
  });

  it("创建支出并扣减余额", async () => {
    const result = await createTransaction(1, {
      type: "EXPENSE",
      amount: 50,
      accountId: 1,
      categoryId: 1,
      note: "午餐",
      dateTime: "2024-06-15T12:00:00Z",
    });

    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { decrement: 50 } },
    });
    expect(result.type).toBe("EXPENSE");
    expect(result.amount).toBe(50);
  });

  it("创建收入并增加余额", async () => {
    mockTx.transaction.create.mockResolvedValue({
      id: 2,
      type: "INCOME",
      amount: 1000,
      categoryId: 2,
      accountId: 1,
      toAccountId: null,
      note: "工资",
      dateTime: new Date("2024-06-01"),
      category: { id: 2, name: "工资" },
      account: { id: 1, name: "现金", balance: 2000 },
      toAccount: null,
    });

    const result = await createTransaction(1, {
      type: "INCOME",
      amount: 1000,
      accountId: 1,
      categoryId: 2,
      note: "工资",
    });

    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: 1000 } },
    });
    expect(result.type).toBe("INCOME");
  });

  it("创建转账：源账户扣减，目标账户增加", async () => {
    mockTx.transaction.create.mockResolvedValue({
      id: 3,
      type: "TRANSFER",
      amount: 500,
      categoryId: null,
      accountId: 1,
      toAccountId: 2,
      note: "转账",
      dateTime: new Date("2024-06-10"),
      category: null,
      account: { id: 1, name: "现金", balance: 500 },
      toAccount: { id: 2, name: "储蓄", balance: 1500 },
    });

    const result = await createTransaction(1, {
      type: "TRANSFER",
      amount: 500,
      accountId: 1,
      toAccountId: 2,
      note: "转账",
    });

    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { decrement: 500 } },
    });
    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { balance: { increment: 500 } },
    });
    expect(result.type).toBe("TRANSFER");
  });

  it("转账时 toAccountId 为空抛出错误", async () => {
    (prisma.$transaction as any).mockImplementation(
      async (cb: (tx: MockTx) => any) => {
        try {
          return await cb(mockTx);
        } catch (e) {
          throw e;
        }
      }
    );

    await expect(
      createTransaction(1, { type: "TRANSFER", amount: 500, accountId: 1 })
    ).rejects.toThrow("转账交易需要指定目标账户");
  });
});

describe("updateTransaction", () => {
  let mockTx: MockTx;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx = createMockTx();
    (prisma.$transaction as any).mockImplementation(
      (cb: (tx: MockTx) => any) => cb(mockTx)
    );
  });

  it("更新支出金额：回滚原金额再应用新金额", async () => {
    mockTx.transaction.findFirst.mockResolvedValue({
      id: 1,
      type: "EXPENSE",
      amount: 30,
      accountId: 1,
      toAccountId: null,
    });
    mockTx.transaction.update.mockResolvedValue({
      id: 1,
      type: "EXPENSE",
      amount: 50,
      categoryId: null,
      accountId: 1,
      toAccountId: null,
      note: "更新",
      dateTime: new Date(),
      category: null,
      account: { id: 1, name: "现金", balance: 970 },
      toAccount: null,
    });

    await updateTransaction(1, 1, { amount: 50 });

    // rollback: increment 30
    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: 30 } },
    });
    // apply: decrement 50
    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { decrement: 50 } },
    });
  });

  it("不存在的交易抛出错误", async () => {
    mockTx.transaction.findFirst.mockResolvedValue(null);

    await expect(updateTransaction(999, 1, { amount: 100 })).rejects.toThrow(
      "交易不存在"
    );
  });
});

describe("deleteTransaction", () => {
  let mockTx: MockTx;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx = createMockTx();
    (prisma.$transaction as any).mockImplementation(
      (cb: (tx: MockTx) => any) => cb(mockTx)
    );
  });

  it("删除支出并回滚余额", async () => {
    mockTx.transaction.findFirst.mockResolvedValue({
      id: 1,
      type: "EXPENSE",
      amount: 50,
      accountId: 1,
      toAccountId: null,
    });

    await deleteTransaction(1, 1);

    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: 50 } },
    });
    expect(mockTx.transaction.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("删除收入并回滚余额", async () => {
    mockTx.transaction.findFirst.mockResolvedValue({
      id: 2,
      type: "INCOME",
      amount: 1000,
      accountId: 1,
      toAccountId: null,
    });

    await deleteTransaction(2, 1);

    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { decrement: 1000 } },
    });
  });

  it("删除转账并回滚双方向", async () => {
    mockTx.transaction.findFirst.mockResolvedValue({
      id: 3,
      type: "TRANSFER",
      amount: 500,
      accountId: 1,
      toAccountId: 2,
    });

    await deleteTransaction(3, 1);

    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: 500 } },
    });
    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { balance: { decrement: 500 } },
    });
  });
});

describe("getTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.transaction.findMany as any).mockResolvedValue([]);
    (prisma.transaction.count as any).mockResolvedValue(0);
  });

  it("返回分页结果", async () => {
    const result = await getTransactions(1, { page: 1, pageSize: 20 });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total", 0);
    expect(result).toHaveProperty("page", 1);
    expect(result).toHaveProperty("pageSize", 20);
    expect(result).toHaveProperty("totalPages", 0);
  });

  it("过滤条件传递到 Prisma", async () => {
    await getTransactions(1, { type: "EXPENSE", keyword: "午餐" });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 1,
          type: "EXPENSE",
          note: { contains: "午餐" },
        }),
      })
    );
  });
});

describe("getTransactionById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("返回交易详情含附件", async () => {
    (prisma.transaction.findFirst as any).mockResolvedValue({
      id: 1,
      type: "EXPENSE",
      amount: 50,
      categoryId: 1,
      accountId: 1,
      toAccountId: null,
      note: "午餐",
      dateTime: new Date("2024-06-15"),
      category: { id: 1, name: "餐饮" },
      account: { id: 1, name: "现金", balance: 950 },
      toAccount: null,
      attachments: [{ id: 1, filename: "receipt.jpg" }],
    });

    const result = await getTransactionById(1, 1);
    expect(result).not.toBeNull();
    expect(result!.attachments).toHaveLength(1);
    expect(result!.attachments![0].filename).toBe("receipt.jpg");
  });

  it("id 不存在返回 null", async () => {
    (prisma.transaction.findFirst as any).mockResolvedValue(null);
    const result = await getTransactionById(999, 1);
    expect(result).toBeNull();
  });
});
