import { NextResponse } from "next/server";
import { getGroupPermissionById, updateGroupPermission, deleteGroupPermission } from "@/server/groupPermissions";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const perm = await getGroupPermissionById(Number(params.id));
    if (!perm) return NextResponse.json({ error: "权限规则不存在" }, { status: 404 });
    return NextResponse.json(perm);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const data = await req.json();
    const perm = await updateGroupPermission(Number(params.id), data);
    return NextResponse.json(perm);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await deleteGroupPermission(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
