import { prisma } from "@/lib/db";
import type { RowFix } from "@/types";

export type RuleGroupMode = "ALL" | "ANY";
export type Scenario = "IMPORT" | "MANUAL";
export type ConditionOperator =
  | "EQUALS" | "NOT_EQUALS"
  | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH"
  | "GREATER_THAN" | "LESS_THAN";

export interface RuleConditionData {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface RuleActionData {
  field: string;
  value: string;
}

export interface RuleData {
  id: number;
  name: string;
  description: string | null;
  conditionMode: "ALL" | "ANY";
  sortOrder: number;
  active: boolean;
  conditions: RuleConditionData[];
  actions: RuleActionData[];
}

export interface RuleGroupData {
  id: number;
  name: string;
  description: string | null;
  mode: RuleGroupMode;
  sortOrder: number;
  active: boolean;
  scenarios: Scenario[];
  rules: RuleData[];
}

export interface RuleMatchContext {
  type: string;
  amount: number;
  note: string | null;
  categoryId: number | null;
  accountId: number;
}

function getFieldValue(ctx: RuleMatchContext, field: string): string | number | null {
  switch (field) {
    case "type": return ctx.type;
    case "amount": return ctx.amount;
    case "note": return ctx.note ?? "";
    case "categoryId": return ctx.categoryId;
    case "accountId": return ctx.accountId;
    default: return null;
  }
}

function evaluateCondition(
  fieldValue: string | number | null,
  operator: ConditionOperator,
  targetValue: string
): boolean {
  if (fieldValue === null || fieldValue === undefined) return false;

  const strVal = String(fieldValue).toLowerCase();
  const lowerTarget = targetValue.toLowerCase();

  switch (operator) {
    case "EQUALS": return strVal === lowerTarget;
    case "NOT_EQUALS": return strVal !== lowerTarget;
    case "CONTAINS": return strVal.includes(lowerTarget);
    case "STARTS_WITH": return strVal.startsWith(lowerTarget);
    case "ENDS_WITH": return strVal.endsWith(lowerTarget);
    case "GREATER_THAN": return Number(fieldValue) > Number(targetValue);
    case "LESS_THAN": return Number(fieldValue) < Number(targetValue);
    default: return false;
  }
}

function applyActionValue(current: RowFix, action: RuleActionData, originalNote?: string | null): RowFix {
  const field = action.field as keyof RowFix;
  if (field === "type") {
    return { ...current, type: action.value as "INCOME" | "EXPENSE" };
  }
  if (field === "amount") {
    return { ...current, amount: parseFloat(action.value) || 0 };
  }
  if (field === "dateTime") {
    return { ...current, dateTime: action.value };
  }
  if (field === "categoryId") {
    return { ...current, categoryId: parseInt(action.value, 10) || undefined };
  }
  if (field === "accountId") {
    return { ...current, accountId: parseInt(action.value, 10) || undefined };
  }
  if (field === "note") {
    const v = action.value.includes("${原值}")
      ? action.value.replace(/\$\{原值\}/g, originalNote ?? "")
      : action.value;
    return { ...current, note: v };
  }
  return current;
}

export async function getActiveRuleGroups(userId: number, scenario?: Scenario): Promise<RuleGroupData[]> {
  const groups = await prisma.ruleGroup.findMany({
    where: { userId, active: true },
    include: {
      rules: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          conditions: true,
          actions: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return groups
    .filter((g) => {
      if (!scenario) return true;
      try {
        const scenarios: Scenario[] = JSON.parse(g.scenarios);
        return scenarios.includes(scenario);
      } catch {
        return true;
      }
    })
    .map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      mode: g.mode as RuleGroupMode,
      sortOrder: g.sortOrder,
      active: g.active,
      scenarios: (() => { try { return JSON.parse(g.scenarios); } catch { return ["IMPORT", "MANUAL"]; } })(),
      rules: g.rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        conditionMode: r.conditionMode as "ALL" | "ANY",
        sortOrder: r.sortOrder,
        active: r.active,
        conditions: r.conditions.map((c) => ({
          field: c.field,
          operator: c.operator as ConditionOperator,
          value: c.value,
        })),
        actions: r.actions.map((a) => ({
          field: a.field,
          value: a.value,
        })),
      })),
    }));
}

export function matchTransaction(
  ctx: RuleMatchContext,
  groups: RuleGroupData[]
): RowFix[] {
  const fixes: RowFix[] = [];

  for (const group of groups) {
    const matchedRules = group.rules.filter((rule) => {
      if (rule.conditions.length === 0) return false;

      const results = rule.conditions.map((cond) => {
        const fieldValue = getFieldValue(ctx, cond.field);
        return evaluateCondition(fieldValue, cond.operator, cond.value);
      });

      return rule.conditionMode === "ALL"
        ? results.every(Boolean)
        : results.some(Boolean);
    });

    const groupMatched = group.mode === "ALL"
      ? matchedRules.length === group.rules.length
      : matchedRules.length > 0;

    if (groupMatched) {
      for (const rule of matchedRules) {
        let fix: RowFix = {};
        for (const action of rule.actions) {
          fix = applyActionValue(fix, action, ctx.note);
        }
        if (Object.keys(fix).length > 0) {
          fixes.push(fix);
        }
      }
    }
  }

  return fixes;
}

export async function applyRulesToTransaction(
  transactionId: number,
  userId: number,
  scenario?: Scenario
): Promise<RowFix[]> {
  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!txn) return [];

  const groups = await getActiveRuleGroups(userId, scenario);
  const ctx: RuleMatchContext = {
    type: txn.type,
    amount: Number(txn.amount),
    note: txn.note,
    categoryId: txn.categoryId,
    accountId: txn.accountId,
  };

  return matchTransaction(ctx, groups);
}

export interface BatchPreviewDetail {
  id: number;
  note: string | null;
  amount: number;
  type: string;
  dateTime: string | null;
  categoryId: number | null;
  categoryName: string | null;
  accountId: number;
  accountName: string | null;
  fixes: RowFix[];
  changes: { field: string; from: string; to: string }[];
}

function describeChange(field: string, from: unknown, to: unknown): { field: string; from: string; to: string } {
  const labels: Record<string, string> = { type: "类型", amount: "金额", dateTime: "日期", categoryId: "分类", accountId: "账户" };
  const fv = (v: unknown) => v === null || v === undefined ? "-" : String(v);
  return { field: labels[field] || field, from: fv(from), to: fv(to) };
}

export async function applyRulesToBatch(ids: number[], userId: number, scenario?: Scenario): Promise<{
  applied: number;
  fixes: Record<number, RowFix[]>;
  details: BatchPreviewDetail[];
}> {
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: ids }, userId },
    include: { category: { select: { name: true } }, account: { select: { name: true } } },
  });
  if (transactions.length === 0) return { applied: 0, fixes: {}, details: [] };

  const groups = await getActiveRuleGroups(userId, scenario);
  if (groups.length === 0) return { applied: 0, fixes: {}, details: [] };

  const allCats = await prisma.category.findMany({ where: { userId }, select: { id: true, name: true } });
  const allAccts = await prisma.account.findMany({ where: { userId }, select: { id: true, name: true } });
  const catNameMap: Record<number, string> = {};
  for (const c of allCats) catNameMap[c.id] = c.name;
  const acctNameMap: Record<number, string> = {};
  for (const a of allAccts) acctNameMap[a.id] = a.name;

  const fixesMap: Record<number, RowFix[]> = {};
  const details: BatchPreviewDetail[] = [];
  let applied = 0;

  for (const txn of transactions) {
    const ctx: RuleMatchContext = {
      type: txn.type,
      amount: Number(txn.amount),
      note: txn.note,
      categoryId: txn.categoryId,
      accountId: txn.accountId,
    };

    const txnFixes = matchTransaction(ctx, groups);
    if (txnFixes.length > 0) {
      fixesMap[txn.id] = txnFixes;
      applied++;

      const changeList: { field: string; from: string; to: string }[] = [];
      const mergedFix = Object.assign({}, ...txnFixes) as RowFix;
      for (const key of Object.keys(mergedFix) as (keyof RowFix)[]) {
        const rawTo = mergedFix[key as keyof RowFix];
        let fromVal: unknown;
        let toVal: unknown;
        switch (key) {
          case "type": fromVal = txn.type; toVal = rawTo; break;
          case "amount": fromVal = Number(txn.amount); toVal = rawTo; break;
          case "dateTime": fromVal = txn.dateTime?.toISOString() ?? null; toVal = rawTo; break;
          case "categoryId":
            fromVal = txn.category?.name ?? txn.categoryId;
            toVal = catNameMap[(rawTo as number) ?? 0] ?? rawTo;
            break;
          case "accountId":
            fromVal = txn.account?.name ?? txn.accountId;
            toVal = acctNameMap[(rawTo as number) ?? 0] ?? rawTo;
            break;
          default: fromVal = null; toVal = rawTo;
        }
        changeList.push(describeChange(key, fromVal, toVal));
      }

      details.push({
        id: txn.id,
        note: txn.note,
        amount: Number(txn.amount),
        type: txn.type,
        dateTime: txn.dateTime ? txn.dateTime.toISOString() : null,
        categoryId: txn.categoryId,
        categoryName: txn.category?.name ?? null,
        accountId: txn.accountId,
        accountName: txn.account?.name ?? null,
        fixes: txnFixes,
        changes: changeList,
      });
    }
  }

  return { applied, fixes: fixesMap, details };
}

export async function applyFixesToTransaction(
  id: number,
  userId: number,
  fixes: RowFix[]
): Promise<void> {
  const txn = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!txn) throw new Error("交易不存在");
  for (const fix of fixes) {
    await prisma.transaction.update({
      where: { id },
      data: {
        ...(fix.type !== undefined && { type: fix.type }),
        ...(fix.amount !== undefined && { amount: fix.amount }),
        ...(fix.dateTime !== undefined && { dateTime: new Date(fix.dateTime) }),
        ...(fix.categoryId !== undefined && { categoryId: fix.categoryId }),
        ...(fix.accountId !== undefined && { accountId: fix.accountId }),
        ...(fix.note !== undefined && { note: fix.note }),
      },
    });
  }
}

export async function applyFixesToBatch(
  fixesMap: Record<number, RowFix[]>,
  userId: number
): Promise<number> {
  let count = 0;
  for (const [idStr, fixes] of Object.entries(fixesMap)) {
    const id = Number(idStr);
    const txn = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!txn) continue;
    for (const fix of fixes) {
      await prisma.transaction.update({
        where: { id },
        data: {
          ...(fix.type !== undefined && { type: fix.type }),
          ...(fix.amount !== undefined && { amount: fix.amount }),
          ...(fix.dateTime !== undefined && { dateTime: new Date(fix.dateTime) }),
          ...(fix.categoryId !== undefined && { categoryId: fix.categoryId }),
          ...(fix.accountId !== undefined && { accountId: fix.accountId }),
          ...(fix.note !== undefined && { note: fix.note }),
        },
      });
      count++;
    }
  }
  return count;
}

export async function deleteRuleGroup(id: number, userId: number): Promise<void> {
  const existing = await prisma.ruleGroup.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("规则组不存在");
  await prisma.ruleGroup.delete({ where: { id } });
}

export async function deleteRule(id: number, userId: number): Promise<void> {
  const existing = await prisma.rule.findFirst({
    where: { id, group: { userId } },
  });
  if (!existing) throw new Error("规则不存在");
  await prisma.rule.delete({ where: { id } });
}
