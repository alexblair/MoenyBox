import { NextResponse } from "next/server";
import { getUserEffectivePermissions } from "@/server/groupPermissions";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const url = new URL(_req.url);
    const accountId = url.searchParams.get("accountId")
      ? Number(url.searchParams.get("accountId"))
      : undefined;
    const perms = await getUserEffectivePermissions(Number(params.id), accountId);
    return NextResponse.json(perms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
