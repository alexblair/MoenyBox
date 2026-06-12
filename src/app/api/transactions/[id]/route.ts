import { NextRequest, NextResponse } from "next/server";
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from "@/server/transactions";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    const transaction = await getTransactionById(id, user.id);
    if (!transaction) {
      return NextResponse.json({ error: "交易不存在" }, { status: 404 });
    }
    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取交易失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    const txn = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!txn) return NextResponse.json({ error: "交易不存在" }, { status: 404 });
    await requirePermission(user.id, "transaction.edit", txn.accountId);
    const body = await request.json();
    const transaction = await updateTransaction(id, user.id, body);
    return NextResponse.json(transaction);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "更新交易失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    const txn = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!txn) return NextResponse.json({ error: "交易不存在" }, { status: 404 });
    await requirePermission(user.id, "transaction.delete", txn.accountId);
    await deleteTransaction(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "删除交易失败" }, { status: 500 });
  }
}
