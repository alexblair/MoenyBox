import { NextRequest, NextResponse } from "next/server";
import { batchDeleteCategories } from "@/server/categories";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请提供要删除的ID列表" }, { status: 400 });
    }
    const result = await batchDeleteCategories(ids, user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "批量删除失败" }, { status: 500 });
  }
}
