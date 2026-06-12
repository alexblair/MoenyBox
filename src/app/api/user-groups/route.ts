import { NextResponse } from "next/server";
import { getUserGroups, createUserGroup } from "@/server/userGroups";
import { getServerUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const groups = await getUserGroups();
    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const group = await createUserGroup(data);
    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
