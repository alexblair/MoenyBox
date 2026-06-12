import { prisma } from "@/lib/db";

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface DashboardCharts {
  monthlySummary: MonthlySummary[];
  categoryBreakdown: CategoryBreakdown[];
}

export async function getDashboardCharts(userId: number): Promise<DashboardCharts> {
  const now = new Date();
  const monthlySummary: MonthlySummary[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = d.toISOString().slice(0, 7);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const rows = await prisma.transaction.findMany({
      where: {
        userId,
        dateTime: { gte: startOfMonth, lt: endOfMonth },
      },
      select: { type: true, amount: true },
    });

    const income = rows
      .filter((r) => r.type === "INCOME")
      .reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows
      .filter((r) => r.type === "EXPENSE")
      .reduce((s, r) => s + Number(r.amount), 0);

    monthlySummary.push({ month: yearMonth, income, expense });
  }

  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const expenseRows = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      dateTime: { gte: startOfCurrentMonth, lt: endOfCurrentMonth },
      categoryId: { not: null },
    },
    include: { category: { select: { name: true, color: true } } },
  });

  const catMap = new Map<string, { amount: number; color: string }>();
  for (const row of expenseRows) {
    const name = row.category?.name || "未分类";
    const color = row.category?.color || "#6b7280";
    const existing = catMap.get(name) || { amount: 0, color };
    existing.amount += Number(row.amount);
    catMap.set(name, existing);
  }

  const totalExpense = Array.from(catMap.values()).reduce((s, c) => s + c.amount, 0);
  const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([categoryName, { amount, color }]) => ({
      categoryName,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      color,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { monthlySummary, categoryBreakdown };
}
