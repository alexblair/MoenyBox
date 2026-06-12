import { describe, it, expect, vi, beforeEach } from "vitest";
import { importCsv } from "@/server/import";
import { CsvFieldMapping } from "@/types";

interface MockTx {
  transaction: { create: any };
  account: { update: any };
}

const mockTx: MockTx = {
  transaction: { create: vi.fn() },
  account: { update: vi.fn() },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    category: {
      findFirst: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const { prisma } = await import("@/lib/db");

function mockFindAccount(name: string | null, id: number | null) {
  (prisma.account.findFirst as any).mockResolvedValue(
    id ? { id, name, balance: 1000 } : null
  );
}

function mockFindCategory(name: string | null, id: number | null) {
  (prisma.category.findFirst as any).mockResolvedValue(
    id ? { id, name } : null
  );
}

function mockTransactionSuccess() {
  (prisma.$transaction as any).mockImplementation(async (cb: (tx: MockTx) => any) => {
    return cb(mockTx);
  });
}

describe("importCsv", () => {
  const headerRow = "日期,类型,金额,分类,账户,备注";
  const mapping: CsvFieldMapping[] = [
    { csvColumn: "日期", systemField: "dateTime" },
    { csvColumn: "类型", systemField: "type" },
    { csvColumn: "金额", systemField: "amount" },
    { csvColumn: "分类", systemField: "category" },
    { csvColumn: "账户", systemField: "account" },
    { csvColumn: "备注", systemField: "note" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("成功导入一行支出", async () => {
    mockFindAccount("现金", 1);
    mockFindCategory("餐饮", 10);
    mockTransactionSuccess();

    const csv = `${headerRow}\n2024-06-15,支出,25.5,餐饮,现金,午餐`;
    const result = await importCsv(1, csv, mapping);

    expect(result.total).toBe(1);
    expect(result.success).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("成功导入一行收入", async () => {
    mockFindAccount("工资卡", 2);
    mockFindCategory("工资", 20);
    mockTransactionSuccess();

    const csv = `${headerRow}\n2024-06-01,收入,10000,工资,工资卡,发薪`;
    const result = await importCsv(1, csv, mapping);

    expect(result.success).toBe(1);
  });

  it("跳过无效类型行", async () => {
    const csv = `${headerRow}\n2024-06-01,投资,100,基金,银行,投资`;
    const result = await importCsv(1, csv, mapping);

    expect(result.total).toBe(1);
    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("无法识别交易类型");
  });

  it("跳过无效金额行", async () => {
    const csv = `${headerRow}\n2024-06-01,支出,abc,餐饮,现金,测试`;
    const result = await importCsv(1, csv, mapping);

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("无效金额");
  });

  it("跳过无效日期行", async () => {
    mockFindAccount("现金", 1);
    const csv = `${headerRow}\nnot-a-date,支出,50,餐饮,现金,午餐`;
    const result = await importCsv(1, csv, mapping);

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("无效日期时间");
  });

  it("处理英文类型值", async () => {
    mockFindAccount("现金", 1);
    mockFindCategory("餐饮", 10);
    mockTransactionSuccess();

    const csv = `${headerRow}\n2024-06-15,expense,30,餐饮,现金,`;
    const result = await importCsv(1, csv, mapping);

    expect(result.success).toBe(1);
  });

  it("处理空CSV则报错", async () => {
    await expect(importCsv(1, "", mapping)).rejects.toThrow("CSV 文件内容不足");
  });

  it("批处理多行，部分成功", async () => {
    mockFindAccount("现金", 1);
    mockFindCategory("餐饮", 10);
    mockTransactionSuccess();

    const csv = `${headerRow}\n2024-06-01,支出,30,餐饮,现金,早餐\n2024-06-02,收入,abc,,现金,test\n2024-06-03,支出,20,餐饮,现金,晚餐`;
    const result = await importCsv(1, csv, mapping);

    expect(result.total).toBe(3);
    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(1);
  });
});
