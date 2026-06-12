import { NextRequest, NextResponse } from "next/server";
import { getCategoryTree, createCategory } from "@/server/categories";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const categories = await getCategoryTree(user.id);
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取分类列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const body = await request.json();
    const category = await createCategory(user.id, body);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "创建分类失败" }, { status: 500 });
  }
}
