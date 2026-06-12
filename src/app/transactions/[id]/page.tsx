"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCategories, getAccounts, getTransaction, updateTransaction, uploadAttachmentFiles, deleteAttachment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TransactionForm } from "@/components/transaction-form";
import type { Category, Account, TransactionType, Attachment } from "@/types";
import type { SaveData } from "@/components/transaction-form";

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [initialData, setInitialData] = useState<{
    type: TransactionType;
    amount: string;
    categoryId: number | null;
    accountId: number | null;
    toAccountId: number | null;
    dateTime: string;
    note: string;
  } | undefined>(undefined);

  useEffect(() => {
    getTransaction(id)
      .then((txn) =>
        Promise.all([
          txn,
          getCategories().catch(() => [] as Category[]),
          getAccounts().catch(() => [] as Account[]),
        ])
      )
      .then(([txn, cats, accts]) => {
        setInitialData({
          type: txn.type,
          amount: String(Number(txn.amount)),
          categoryId: txn.categoryId,
          accountId: txn.accountId,
          toAccountId: txn.toAccountId,
          dateTime: new Date(txn.dateTime).toISOString().slice(0, 16),
          note: txn.note || "",
        });
        setAttachments(txn.attachments || []);
        setCategories(cats);
        setAccounts(accts);
      })
      .catch((e) => {
        toast.error(e.message);
        router.push("/transactions");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSave = useCallback(
    async (data: SaveData, newFiles: File[]) => {
      setSaving(true);
      try {
        const dataObj: Record<string, unknown> = {
          type: data.type,
          amount: data.amount,
          accountId: data.accountId,
          dateTime: data.dateTime,
          note: data.note,
        };
        if (data.type !== "TRANSFER") {
          dataObj.categoryId = data.categoryId;
        } else {
          dataObj.toAccountId = data.toAccountId;
        }

        await updateTransaction(id, dataObj);

        if (newFiles.length > 0) {
          try {
            const uploaded = await uploadAttachmentFiles(id, newFiles);
            setAttachments((prev) => [...prev, ...uploaded]);
          } catch {
            toast.warning("交易已更新，但部分附件上传失败");
          }
        }

        toast.success("交易已更新");
        router.push("/transactions");
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setSaving(false);
      }
    },
    [id, router]
  );

  const handleDeleteAttachment = useCallback(async (attachmentId: number) => {
    try {
      await deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("附件已删除");
    } catch (e: any) {
      toast.error(e.message || "删除附件失败");
    }
  }, []);

  if (loading) {
    return (
      <div className="pt-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-6 md:pt-0">
      <h2 className="text-lg font-semibold">编辑交易</h2>

      <TransactionForm
        initialData={initialData}
        attachments={attachments}
        onAttachmentsChange={handleDeleteAttachment}
        onSave={handleSave}
        onCancel={() => router.push("/transactions")}
        categories={categories}
        accounts={accounts}
        saving={saving}
      />
    </div>
  );
}
