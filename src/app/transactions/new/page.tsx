"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  FileText as FileTextIcon,
  ChevronRight,
} from "lucide-react";
import { getCategories, getAccounts, createTransaction, uploadAttachmentFiles, getActiveTemplates } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TransactionForm } from "@/components/transaction-form";
import type { Category, Account, TransactionType, TransactionTemplate } from "@/types";
import type { SaveData, TransactionFormHandle } from "@/components/transaction-form";

function NewTransactionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<TransactionFormHandle>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyTemplate = useCallback((tmpl: TransactionTemplate) => {
    formRef.current?.applyTemplate({
      type: tmpl.type,
      amount: String(tmpl.amount),
      categoryId: tmpl.categoryId,
      accountId: tmpl.accountId,
      toAccountId: tmpl.toAccountId,
      note: tmpl.note || "",
    });
    setTemplateSheetOpen(false);
    toast.success(`已应用模板"${tmpl.name}"`);
  }, []);

  const load = useCallback(async () => {
    try {
      const [cats, accts, tmpls] = await Promise.all([
        getCategories().catch(() => []),
        getAccounts().catch(() => []),
        getActiveTemplates().catch(() => []),
      ]);
      setCategories(cats);
      setAccounts(accts);
      setTemplates(tmpls);

      const templateId = searchParams.get("templateId");
      if (templateId) {
        const tmpl = tmpls.find((t) => t.id === Number(templateId));
        if (tmpl) {
          applyTemplate(tmpl);
          return;
        }
      }
    } catch {}
  }, [searchParams, applyTemplate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: SaveData, newFiles: File[]) => {
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

      const transaction = await createTransaction(dataObj);

      if (newFiles.length > 0) {
        try {
          await uploadAttachmentFiles(transaction.id, newFiles);
        } catch {
          toast.warning("交易已创建，但部分附件上传失败");
        }
      }

      toast.success("交易已创建");
      router.push("/transactions");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderTemplateTree = (items: TransactionTemplate[], depth = 0) => {
    return items.map((tmpl) => {
      const hasChildren = tmpl.children && tmpl.children.length > 0;
      return (
        <div key={tmpl.id}>
          <button
            onClick={() => applyTemplate(tmpl)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <div className="shrink-0">
              {tmpl.type === "EXPENSE" ? (
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
              ) : tmpl.type === "INCOME" ? (
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowLeftRight className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{tmpl.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {tmpl.type === "EXPENSE" ? "支出" : tmpl.type === "INCOME" ? "收入" : "转账"} · {formatCurrency(tmpl.amount)}
                {tmpl.category && ` · ${tmpl.category.name}`}
              </div>
            </div>
            {hasChildren && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          </button>
          {hasChildren && renderTemplateTree(tmpl.children!, depth + 1)}
        </div>
      );
    });
  };

  const defaultType = (searchParams.get("type") as TransactionType) || undefined;

  return (
    <div className="pt-4 space-y-6 md:pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">新增交易</h2>
        {templates.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setTemplateSheetOpen(true)}>
            <FileTextIcon className="mr-1 h-4 w-4" />
            选择模板
          </Button>
        )}
      </div>

      <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>快速记账模板</SheetTitle>
            <SheetDescription>选择一个模板快速填充交易信息</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-1">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">暂无可用模板</p>
            ) : (
              renderTemplateTree(templates)
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TransactionForm
        ref={formRef}
        defaultType={defaultType}
        onSave={handleSave}
        categories={categories}
        accounts={accounts}
        saving={saving}
        showQuickAmounts={true}
      />
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<div className="pt-4 space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-16 w-full" /></div>}>
      <NewTransactionContent />
    </Suspense>
  );
}
