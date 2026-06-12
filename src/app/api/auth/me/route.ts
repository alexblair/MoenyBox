import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "验证失败" }, { status: 500 });
  }
}
