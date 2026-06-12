import { NextRequest, NextResponse } from "next/server";
import { importCsv } from "@/server/import";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "transaction.create");
    const body = await request.json();
    const { csvContent, mapping, defaultAccountId, rowAccountOverrides, rowFixes } = body;

    if (!csvContent || !mapping) {
      return NextResponse.json(
        { error: "缺少 csvContent 或 mapping" },
        { status: 400 }
      );
    }

    const result = await importCsv(user.id, csvContent, mapping, defaultAccountId, rowAccountOverrides, rowFixes);
    return NextResponse.json(result);
  } catch (e: any) {
    if (e.name === "PermissionError") {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: e.message || "导入失败" },
      { status: 500 }
    );
  }
}
