import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CsvFieldMapping } from "@/types";
import { getActiveRuleGroups, matchTransaction, RuleMatchContext } from "@/server/rule-engine";
import type { RowFix } from "@/types";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

interface RowErrors {
  field: string;
  message: string;
}

interface RowPreview {
  rowNumber: number;
  raw: Record<string, string>;
  parsed: {
    type: string | null;
    amount: number | null;
    dateTime: string | null;
    note: string | null;
    categoryName: string | null;
    accountName: string | null;
  };
  resolved: {
    typeDisplay: string | null;
    amount: number | null;
    dateTime: string | null;
    category: { id: number; name: string; path: string } | null;
    account: { id: number; name: string; type: string } | null;
  };
  errors: RowErrors[];
  valid: boolean;
  isDuplicate?: boolean;
  ruleFixes?: RowFix[];
}

interface PreviewResponse {
  total: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  rows: RowPreview[];
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

function parseDateTime(value: string): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const typeDisplayMap: Record<string, string> = {
  INCOME: "收入",
  EXPENSE: "支出",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.view");
    const body = await request.json();
    const { csvContent, mapping, defaultAccountId, rowAccountOverrides, rowFixes } = body;

    if (!csvContent || !mapping) {
      return NextResponse.json(
        { error: "缺少 csvContent 或 mapping" },
        { status: 400 }
      );
    }

    const lines = csvContent.split("\n").filter((l: string) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV 文件内容不足" },
        { status: 400 }
      );
    }

    const headers = lines[0].split(",").map((h: string) => h.trim().replace(/^["']|["']$/g, ""));
    const dataRows = lines.slice(1).filter((l: string) => l.trim());

    const allCategories = await prisma.category.findMany({
      where: { userId: user.id },
      include: { parent: true },
    });
    const allAccounts = await prisma.account.findMany({ where: { userId: user.id } });
    const activeGroups = await getActiveRuleGroups(user.id, "IMPORT");

    function getCategoryPath(cat: { id: number; name: string; parentId: number | null }): string {
      const parts = [cat.name];
      let current = cat;
      while (current.parentId) {
        const parent = allCategories.find((c) => c.id === current.parentId);
        if (!parent) break;
        parts.unshift(parent.name);
        current = parent;
      }
      return parts.join(" / ");
    }

    const rows: RowPreview[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const values = dataRows[i].split(",").map((v: string) => v.trim().replace(/^["']|["']$/g, ""));
      const raw: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => {
        raw[h] = values[idx] || "";
      });

      const errors: RowErrors[] = [];

      const fieldValues: Record<string, string> = {};
      (mapping as CsvFieldMapping[]).forEach((m) => {
        fieldValues[m.systemField] = raw[m.csvColumn] || "";
      });

      const rowNum = i + 2;
      const fix = (rowFixes as Record<string, RowFix> | undefined)?.[rowNum];

      const type = fix?.type || parseType(fieldValues["type"] ?? "");
      const amount = fix?.amount != null ? fix.amount : parseAmount(fieldValues["amount"] ?? "");
      const dateTime = fix?.dateTime || parseDateTime(fieldValues["dateTime"] ?? "");
      const note = fix?.note || fieldValues["note"]?.trim() || null;
      const categoryName = fix?.categoryId ? null : fieldValues["category"];
      const accountName = fix?.accountId ? null : fieldValues["account"];

      if (!type) errors.push({ field: "type", message: "无法识别交易类型，请输入 收入/支出/income/expense" });
      if (amount === null || amount <= 0) errors.push({ field: "amount", message: "无效金额" });
      if (!dateTime) errors.push({ field: "dateTime", message: "无效日期时间" });

      let resolvedCategory: { id: number; name: string; path: string } | null = null;
      if (fix?.categoryId != null) {
        const cat = allCategories.find((c) => c.id === fix.categoryId);
        if (cat) {
          resolvedCategory = { id: cat.id, name: cat.name, path: getCategoryPath(cat) };
        } else {
          errors.push({ field: "category", message: `指定分类 ID ${fix.categoryId} 不存在` });
        }
      } else if (categoryName?.trim()) {
        const trimmed = categoryName.trim();
        const cat = allCategories.find(
          (c) => c.name === trimmed || c.name.includes(trimmed) || trimmed.includes(c.name)
        );
        if (cat) {
          resolvedCategory = { id: cat.id, name: cat.name, path: getCategoryPath(cat) };
        } else {
          errors.push({ field: "category", message: `分类不存在: ${trimmed}` });
        }
      }

      let resolvedAccount: { id: number; name: string; type: string } | null = null;
      if (fix?.accountId != null) {
        const a = allAccounts.find((ac) => ac.id === fix.accountId);
        if (a) resolvedAccount = { id: a.id, name: a.name, type: a.type };
        else errors.push({ field: "account", message: `指定账户 ID ${fix.accountId} 不存在` });
      } else {
        const overrideId = rowAccountOverrides?.[i];
        if (overrideId != null) {
          const a = allAccounts.find((ac) => ac.id === overrideId);
          if (a) resolvedAccount = { id: a.id, name: a.name, type: a.type };
          else errors.push({ field: "account", message: `指定账户 ID ${overrideId} 不存在` });
        } else if (accountName?.trim()) {
          const trimmed = accountName.trim();
          const a = allAccounts.find((ac) => ac.name === trimmed || ac.name.includes(trimmed));
          if (a) resolvedAccount = { id: a.id, name: a.name, type: a.type };
          else errors.push({ field: "account", message: `账户不存在: ${trimmed}` });
        } else if (defaultAccountId) {
          const a = allAccounts.find((ac) => ac.id === defaultAccountId);
          if (a) resolvedAccount = { id: a.id, name: a.name, type: a.type };
          else errors.push({ field: "account", message: `默认账户 ID ${defaultAccountId} 不存在` });
        } else {
          errors.push({ field: "account", message: "未设置账户" });
        }
      }

      const valid = errors.length === 0;
      let isDuplicate = false;

      let ruleFixes: RowFix[] = [];
      if (valid && type && amount != null) {
        const ruleCtx: RuleMatchContext = {
          type,
          amount,
          note,
          categoryId: resolvedCategory?.id ?? null,
          accountId: resolvedAccount?.id ?? 0,
        };
        ruleFixes = matchTransaction(ruleCtx, activeGroups);
      }
      if (valid && type && amount != null && dateTime) {
        const dup = await prisma.transaction.findFirst({
          where: { userId: user.id, type, amount, dateTime },
          select: { id: true },
        });
        isDuplicate = !!dup;
      }

      rows.push({
        rowNumber: rowNum,
        raw,
        parsed: { type, amount, dateTime, note, categoryName, accountName },
        resolved: {
          typeDisplay: type ? typeDisplayMap[type] || type : null,
          amount,
          dateTime,
          category: resolvedCategory,
          account: resolvedAccount,
        },
        errors,
        valid,
        isDuplicate,
        ruleFixes,
      });
    }

    const response: PreviewResponse = {
      total: rows.length,
      validCount: rows.filter((r) => r.valid && !r.isDuplicate).length,
      errorCount: rows.filter((r) => !r.valid).length,
      duplicateCount: rows.filter((r) => r.isDuplicate).length,
      rows,
    };

    return NextResponse.json(response);
  } catch (e: any) {
    if (e.name === "PermissionError") {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: e.message || "预览失败" },
      { status: 500 }
    );
  }
}
