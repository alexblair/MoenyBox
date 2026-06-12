import { NextRequest, NextResponse } from "next/server";
import { cloneTransactionsAsTemplate } from "@/server/templates";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.create");
    const body = await request.json();
    const { transactionIds, name, parentId } = body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: "请选择交易记录" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "请输入模板名称" }, { status: 400 });
    }

    const template = await cloneTransactionsAsTemplate(user.id, transactionIds, name, parentId);
    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "创建模板失败" }, { status: 500 });
  }
}
