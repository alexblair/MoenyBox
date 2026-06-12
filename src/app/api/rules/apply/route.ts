import { NextRequest, NextResponse } from "next/server";
import { applyRulesToTransaction } from "@/server/rule-engine";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permission-utils";

const MANUAL_SCENARIO = "MANUAL" as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "请提供交易ID" }, { status: 400 });
    }
    const txn = await prisma.transaction.findFirst({ where: { id: Number(transactionId), userId: user.id } });
    if (!txn) return NextResponse.json({ error: "交易不存在" }, { status: 404 });
    await requirePermission(user.id, "transaction.edit", txn.accountId);

    const fixes = await applyRulesToTransaction(Number(transactionId), user.id, MANUAL_SCENARIO);
    return NextResponse.json({ fixes });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "应用规则失败" }, { status: 500 });
  }
}
