import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.export");
    const { searchParams } = new URL(request.url);

    const where: any = { userId: user.id };

    const type = searchParams.get("type");
    if (type) where.type = type;

    const categoryId = searchParams.get("categoryId");
    if (categoryId) where.categoryId = Number(categoryId);

    const accountId = searchParams.get("accountId");
    if (accountId) {
      where.OR = [{ accountId: Number(accountId) }, { toAccountId: Number(accountId) }];
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = new Date(dateFrom);
      if (dateTo) where.dateTime.lte = new Date(dateTo);
    }

    const amountMin = searchParams.get("amountMin");
    const amountMax = searchParams.get("amountMax");
    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) where.amount.gte = Number(amountMin);
      if (amountMax) where.amount.lte = Number(amountMax);
    }

    const keyword = searchParams.get("keyword");
    if (keyword) {
      where.note = { contains: keyword };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
      },
      orderBy: { dateTime: "desc" },
    });

    const headers = ["类型", "金额", "日期", "分类", "账户", "备注"];
    const lines: string[] = [headers.join(",")];

    for (const txn of transactions) {
      const typeLabel = txn.type === "INCOME" ? "收入" : txn.type === "EXPENSE" ? "支出" : txn.type;
      const amount = Number(txn.amount);
      const dateTime = txn.dateTime instanceof Date ? txn.dateTime : new Date(txn.dateTime);
      const dateStr = `${dateTime.getFullYear()}-${String(dateTime.getMonth() + 1).padStart(2, "0")}-${String(dateTime.getDate()).padStart(2, "0")} ${String(dateTime.getHours()).padStart(2, "0")}:${String(dateTime.getMinutes()).padStart(2, "0")}:${String(dateTime.getSeconds()).padStart(2, "0")}`;
      const categoryName = txn.category?.name || "";
      const accountName = txn.account?.name || "";
      const note = (txn.note || "").replace(/"/g, '""');

      const row = [typeLabel, amount.toString(), dateStr, categoryName, accountName, `"${note}"`];
      lines.push(row.join(","));
    }

    const csv = "\uFEFF" + lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "导出失败" }, { status: 500 });
  }
}
