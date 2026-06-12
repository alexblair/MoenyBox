import { NextRequest, NextResponse } from "next/server";
import { deleteAttachment, unlinkAttachmentFromTransaction } from "@/server/attachments";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permission-utils";

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ error: "无效的附件ID" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get("transactionId");

    let permAccountId: number | undefined;
    if (transactionId) {
      const txn = await prisma.transaction.findFirst({ where: { id: Number(transactionId), userId: user.id } });
      if (!txn) return NextResponse.json({ error: "交易不存在" }, { status: 404 });
      permAccountId = txn.accountId;
    } else {
      const link = await prisma.transactionAttachment.findFirst({
        where: { attachmentId: id, transaction: { userId: user.id } },
        include: { transaction: { select: { accountId: true } } },
      });
      if (link) permAccountId = link.transaction.accountId;
    }
    await requirePermission(user.id, "transaction.edit", permAccountId);

    if (transactionId) {
      await unlinkAttachmentFromTransaction(id, Number(transactionId), user.id);
    } else {
      await deleteAttachment(id, user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "删除附件失败" }, { status: 500 });
  }
}
