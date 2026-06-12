import { NextRequest, NextResponse } from "next/server";
import { uploadFiles, getAttachmentsByTransaction } from "@/server/attachments";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const transactionId = Number(params.id);
    const attachments = await getAttachmentsByTransaction(transactionId, user.id);
    return NextResponse.json(attachments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取附件列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const transactionId = Number(params.id);
    if (!transactionId) {
      return NextResponse.json({ error: "无效的交易ID" }, { status: 400 });
    }
    const txn = await prisma.transaction.findFirst({ where: { id: transactionId, userId: user.id } });
    if (!txn) return NextResponse.json({ error: "交易不存在" }, { status: 404 });
    await requirePermission(user.id, "transaction.edit", txn.accountId);

    const formData = await request.formData();
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const attachments = await uploadFiles(transactionId, user.id, files);
    return NextResponse.json(attachments, { status: 201 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "上传附件失败" }, { status: 500 });
  }
}
