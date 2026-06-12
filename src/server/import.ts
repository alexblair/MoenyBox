import { prisma } from "@/lib/db";
import { CsvFieldMapping, RowFix } from "@/types";

interface ImportRow {
  [key: string]: string;
}

interface ImportResult {
  total: number;
  success: number;
  errors: { row: number; message: string }[];
}

async function resolveCategory(name: string, userId: number): Promise<number | null> {
  if (!name?.trim()) return null;
  const trimmed = name.trim();
  const category = await prisma.category.findFirst({
    where: {
      userId,
      OR: [
        { name: { equals: trimmed } },
        { name: { contains: trimmed } },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });
  return category?.id ?? null;
}

async function resolveAccount(name: string, userId: number): Promise<number | null> {
  if (!name?.trim()) return null;
  const trimmed = name.trim();
  const account = await prisma.account.findFirst({
    where: {
      userId,
      OR: [
        { name: { equals: trimmed } },
        { name: { contains: trimmed } },
      ],
    },
  });
  return account?.id ?? null;
}

function parseType(value: string): "INCOME" | "EXPENSE" | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  if (v === "收入" || v === "income" || v === "+" || v === "in") return "INCOME";
  if (v === "支出" || v === "expense" || v === "-" || v === "exp" || v === "out") return "EXPENSE";
  return null;
}

function parseAmount(value: string): number | null {
  if (!value?.trim()) return null;
  const cleaned = value.trim().replace(/[^0-9.\-+]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

function parseDateTime(value: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d;
}

export async function importCsv(
  userId: number,
  csvContent: string,
  mapping: CsvFieldMapping[],
  defaultAccountId?: number,
  rowAccountOverrides?: Record<number, number>,
  rowFixes?: Record<number, RowFix>
): Promise<ImportResult> {
  const lines = csvContent.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error("CSV 文件内容不足");
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const dataRows = lines.slice(1).filter((l) => l.trim());

  const result: ImportResult = { total: dataRows.length, success: 0, errors: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const values = dataRows[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: ImportRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    try {
      const fieldMap: Record<string, string> = {};
      mapping.forEach((m) => {
        fieldMap[m.systemField] = row[m.csvColumn] || "";
      });

      const rowNum = i + 2;
      const fix = rowFixes?.[rowNum];

      const type = fix?.type || parseType(fieldMap["type"] ?? "");
      const amount = fix?.amount != null ? fix.amount : parseAmount(fieldMap["amount"] ?? "");
      const dateTime = fix?.dateTime ? new Date(fix.dateTime) : parseDateTime(fieldMap["dateTime"] ?? "");
      const note = fieldMap["note"]?.trim() || null;

      if (!type) {
        result.errors.push({ row: rowNum, message: "无法识别交易类型" });
        continue;
      }
      if (amount === null || amount <= 0) {
        result.errors.push({ row: rowNum, message: "无效金额" });
        continue;
      }
      if (!dateTime) {
        result.errors.push({ row: rowNum, message: "无效日期时间" });
        continue;
      }

      let accountId: number | null = null;
      if (fix?.accountId != null) {
        accountId = fix.accountId;
      } else {
        const overrideId = rowAccountOverrides?.[i];
        if (overrideId != null) {
          accountId = overrideId;
        } else if (fieldMap["account"]) {
          accountId = await resolveAccount(fieldMap["account"], userId);
        } else if (defaultAccountId) {
          accountId = defaultAccountId;
        }
      }
      if (!accountId) {
        result.errors.push({ row: rowNum, message: `未找到账户: ${fieldMap["account"] || "(空)"}` });
        continue;
      }

      let categoryId: number | null = null;
      if (fix?.categoryId != null) {
        categoryId = fix.categoryId;
      } else if (fieldMap["category"]) {
        categoryId = await resolveCategory(fieldMap["category"], userId);
      }

      await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            type,
            amount,
            accountId,
            categoryId,
            note,
            dateTime,
            userId,
          },
        });

        if (type === "EXPENSE") {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } },
          });
        } else if (type === "INCOME") {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { increment: amount } },
          });
        }

        return transaction;
      });

      result.success++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, message: e.message || "导入失败" });
    }
  }

  return result;
}
