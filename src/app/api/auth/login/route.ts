import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "请输入用户名" }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: { name, active: true },
    });
    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }
    if (user.passwordHash) {
      if (!verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
      }
    }
    const res = NextResponse.json({ id: user.id, name: user.name });
    res.headers.set("Set-Cookie", setSessionCookie(user.id));
    return res;
  } catch (error) {
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
