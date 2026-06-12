import { NextRequest, NextResponse } from "next/server";
import { getTransactions, createTransaction } from "@/server/transactions";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { searchParams } = new URL(request.url);

    const params: any = {};

    const type = searchParams.get("type");
    if (type) params.type = type;

    const categoryId = searchParams.get("categoryId");
    if (categoryId) params.categoryId = Number(categoryId);

    const accountId = searchParams.get("accountId");
    if (accountId) params.accountId = Number(accountId);

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) params.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) params.dateTo = dateTo;

    const amountMin = searchParams.get("amountMin");
    if (amountMin) params.amountMin = Number(amountMin);

    const amountMax = searchParams.get("amountMax");
    if (amountMax) params.amountMax = Number(amountMax);

    const keyword = searchParams.get("keyword");
    if (keyword) params.keyword = keyword;

    const page = searchParams.get("page");
    if (page) params.page = Number(page);

    const pageSize = searchParams.get("pageSize");
    if (pageSize) params.pageSize = Number(pageSize);

    const sortBy = searchParams.get("sortBy");
    if (sortBy) params.sortBy = sortBy;

    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder) params.sortOrder = sortOrder as "asc" | "desc";

    const result = await getTransactions(user.id, params);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取交易列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const body = await request.json();
    await requirePermission(user.id, "transaction.create", body.accountId);
    const transaction = await createTransaction(user.id, body);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "创建交易失败" }, { status: 500 });
  }
}
