import { NextRequest, NextResponse } from "next/server";
import { cloneTransactions } from "@/server/transactions";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.create");
    const body = await request.json();
    const { ids, overrides } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请选择要复制的交易" }, { status: 400 });
    }

    const count = await cloneTransactions(ids, user.id, overrides || {});
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "复制交易失败" }, { status: 500 });
  }
}
