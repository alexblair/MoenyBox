import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRulesToBatch, applyFixesToBatch } from "@/server/rule-engine";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

const MANUAL_SCENARIO = "MANUAL" as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.edit");
    const body = await request.json();
    const { action, ids, dateFrom, dateTo } = body;

    let targetIds = ids;
    const { allHistory } = body;
    if ((!Array.isArray(targetIds) || targetIds.length === 0) && (allHistory || dateFrom)) {
      const where: any = { userId: user.id };
      if (!allHistory && dateFrom) {
        where.dateTime = { gte: new Date(dateFrom) };
        if (dateTo) where.dateTime.lte = new Date(dateTo);
      }
      const txns = await prisma.transaction.findMany({ where, select: { id: true } });
      targetIds = txns.map((t) => t.id);
    }

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      return NextResponse.json({ error: "请选择要操作的数据" }, { status: 400 });
    }

    if (action === "preview") {
      const result = await applyRulesToBatch(targetIds, user.id, MANUAL_SCENARIO);
      return NextResponse.json(result);
    }

    if (action === "apply") {
      const { fixes } = body;
      if (!fixes || Object.keys(fixes).length === 0) {
        return NextResponse.json({ error: "没有要应用的修复" }, { status: 400 });
      }
      const count = await applyFixesToBatch(fixes, user.id);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "批量操作失败" }, { status: 500 });
  }
}
