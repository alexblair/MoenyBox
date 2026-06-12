import { NextResponse } from "next/server";
import { getUserGroupById, updateUserGroup, deleteUserGroup } from "@/server/userGroups";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const group = await getUserGroupById(Number(params.id));
    if (!group) return NextResponse.json({ error: "用户组不存在" }, { status: 404 });
    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const data = await req.json();
    const group = await updateUserGroup(Number(params.id), data);
    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await deleteUserGroup(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
