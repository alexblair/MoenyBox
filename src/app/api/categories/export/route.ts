import { NextResponse } from "next/server";
import { getExportCategories } from "@/server/categories";
import { getServerUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const data = await getExportCategories(user.id);
    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="categories_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "导出失败" }, { status: 500 });
  }
}
