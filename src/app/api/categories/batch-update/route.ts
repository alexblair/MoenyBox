import { NextRequest, NextResponse } from "next/server";
import { batchUpdateCategories } from "@/server/categories";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const { ids, icon, color } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请提供要更新的ID列表" }, { status: 400 });
    }
    const count = await batchUpdateCategories(ids, user.id, { icon, color });
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "批量更新失败" }, { status: 500 });
  }
}
