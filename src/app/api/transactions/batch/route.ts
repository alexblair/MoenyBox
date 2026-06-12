import { NextRequest, NextResponse } from "next/server";
import { batchUpdateTransactions, batchDeleteTransactions } from "@/server/transactions";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.delete");
    const body = await request.json();
    const { action, ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请选择要操作的交易" }, { status: 400 });
    }

    if (action === "delete") {
      const count = await batchDeleteTransactions(ids, user.id);
      return NextResponse.json({ success: true, count });
    } else if (action === "update") {
      if (!updates || Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "请指定要更新的字段" }, { status: 400 });
      }
      const count = await batchUpdateTransactions(ids, user.id, updates);
      return NextResponse.json({ success: true, count });
    } else {
      return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "批量操作失败" }, { status: 500 });
  }
}
