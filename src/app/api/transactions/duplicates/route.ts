import { NextRequest, NextResponse } from "next/server";
import { detectDuplicates } from "@/server/transactions";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.view");
    const body = await request.json();
    const { fields, type, categoryId, accountId, dateFrom, dateTo, keyword } = body;

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: "至少选择一个比较字段" }, { status: 400 });
    }

    const result = await detectDuplicates(user.id, {
      fields,
      type: type || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      accountId: accountId ? Number(accountId) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      keyword: keyword || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "重复检测失败" }, { status: 500 });
  }
}
