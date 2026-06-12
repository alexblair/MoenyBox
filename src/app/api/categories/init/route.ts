import { NextRequest, NextResponse } from "next/server";
import { initCategories, getDefaultInitCategories } from "@/server/categories";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET() {
  try {
    const defaults = getDefaultInitCategories();
    return NextResponse.json(defaults);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取默认数据失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const body = await request.json();
    const data = Array.isArray(body) ? body : body.data;
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "请提供初始化数据" }, { status: 400 });
    }
    const result = await initCategories(user.id, data);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "初始化分类失败" }, { status: 500 });
  }
}
