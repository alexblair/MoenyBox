import { prisma } from "@/lib/db";

function getMonthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  const start = new Date(from + "-01");
  const end = new Date(to + "-01");
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    months.push(current.toISOString().slice(0, 7));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

export async function getNetWorthTrend(dateRange: { from: string; to: string }, userId: number): Promise<{ date: string; netWorth: number }[]> {
  const months = getMonthsInRange(dateRange.from, dateRange.to);

  const [accountAgg, transactions] = await Promise.all([
    prisma.account.aggregate({
      where: { userId },
      _sum: { balance: true },
    }),
    prisma.transaction.findMany({
      where: { userId, type: { in: ["INCOME", "EXPENSE"] } },
      select: { type: true, amount: true, dateTime: true },
    }),
  ]);

  const currentBalance = Number(accountAgg._sum.balance || 0);

  const monthEffect = new Map<string, number>();
  for (const t of transactions) {
    const m = t.dateTime.toISOString().slice(0, 7);
    const effect = t.type === "INCOME" ? Number(t.amount) : -Number(t.amount);
    monthEffect.set(m, (monthEffect.get(m) || 0) + effect);
  }

  const totalNetEffect = Array.from(monthEffect.values()).reduce((s, v) => s + v, 0);
  const initialBalance = currentBalance - totalNetEffect;

  const monthSet = new Set(months);
  const resultMap = new Map<string, number>();
  const allMonths = Array.from(new Set([...Array.from(monthEffect.keys()), ...months])).sort();

  let runningBalance = initialBalance;
  for (const m of allMonths) {
    runningBalance += monthEffect.get(m) || 0;
    if (monthSet.has(m)) {
      resultMap.set(m, runningBalance);
    }
  }

  return months.map((month) => ({
    date: month,
    netWorth: resultMap.get(month) ?? initialBalance,
  }));
}

export async function getIncomeExpense(dateRange: { from: string; to: string }, userId: number): Promise<{ month: string; income: number; expense: number }[]> {
  const months = getMonthsInRange(dateRange.from, dateRange.to);
  const startDate = new Date(dateRange.from + "-01");
  const endDate = new Date(dateRange.to + "-01");
  endDate.setMonth(endDate.getMonth() + 1);

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      dateTime: { gte: startDate, lt: endDate },
    },
    select: { type: true, amount: true, dateTime: true },
  });

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const m of months) {
    monthMap.set(m, { income: 0, expense: 0 });
  }

  for (const row of rows) {
    const month = row.dateTime.toISOString().slice(0, 7);
    if (monthMap.has(month)) {
      const entry = monthMap.get(month)!;
      if (row.type === "INCOME") {
        entry.income += Number(row.amount);
      } else if (row.type === "EXPENSE") {
        entry.expense += Number(row.amount);
      }
    }
  }

  return months.map((month) => ({
    month,
    ...monthMap.get(month)!,
  }));
}

export async function getCategoryBreakdown(dateRange: { from: string; to: string }, userId: number): Promise<{ categoryName: string; color: string; amount: number; percentage: number }[]> {
  const startDate = new Date(dateRange.from + "-01");
  const endDate = new Date(dateRange.to + "-01");
  endDate.setMonth(endDate.getMonth() + 1);

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      categoryId: { not: null },
      dateTime: { gte: startDate, lt: endDate },
    },
    include: { category: { select: { name: true, color: true } } },
  });

  const catMap = new Map<string, { amount: number; color: string }>();
  for (const row of rows) {
    const name = row.category?.name || "未分类";
    const color = row.category?.color || "#6b7280";
    const existing = catMap.get(name) || { amount: 0, color };
    existing.amount += Number(row.amount);
    catMap.set(name, existing);
  }

  const totalExpense = Array.from(catMap.values()).reduce((s, c) => s + c.amount, 0);

  return Array.from(catMap.entries())
    .map(([categoryName, { amount, color }]) => ({
      categoryName,
      color,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getMonthlySummary(year: number, userId: number): Promise<{ month: string; income: number; expense: number; netDelta: number }[]> {
  const months: string[] = [];
  for (let m = 0; m < 12; m++) {
    months.push(`${year}-${String(m + 1).padStart(2, "0")}`);
  }

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      dateTime: { gte: startDate, lt: endDate },
    },
    select: { type: true, amount: true, dateTime: true },
  });

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const m of months) {
    monthMap.set(m, { income: 0, expense: 0 });
  }

  for (const row of rows) {
    const month = row.dateTime.toISOString().slice(0, 7);
    if (monthMap.has(month)) {
      const entry = monthMap.get(month)!;
      if (row.type === "INCOME") {
        entry.income += Number(row.amount);
      } else if (row.type === "EXPENSE") {
        entry.expense += Number(row.amount);
      }
    }
  }

  return months.map((month) => {
    const { income, expense } = monthMap.get(month)!;
    return { month, income, expense, netDelta: income - expense };
  });
}
