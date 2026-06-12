"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { TransactionTypeIcon } from "@/components/transaction-amount";
import { createTemplateFromTransactions } from "@/lib/api";
import { toast } from "sonner";
import type { Transaction } from "@/types";

interface CreateTemplateSheetProps {
  tmplSheetOpen: boolean;
  setTmplSheetOpen: (open: boolean) => void;
  tmplName: string;
  setTmplName: (name: string) => void;
  selectedIds: Set<number>;
  transactions: Transaction[];
  creatingTmpl: boolean;
  setCreatingTmpl: (v: boolean) => void;
}

export function CreateTemplateSheet({
  tmplSheetOpen,
  setTmplSheetOpen,
  tmplName,
  setTmplName,
  selectedIds,
  transactions,
  creatingTmpl,
  setCreatingTmpl,
}: CreateTemplateSheetProps) {
  return (
    <Sheet open={tmplSheetOpen} onOpenChange={(open) => { if (!open) { setTmplSheetOpen(false); } }}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader className="shrink-0">
          <SheetTitle>存为模板</SheetTitle>
          <SheetDescription>基于选中的 {selectedIds.size} 条记录创建快速记账模板</SheetDescription>
        </SheetHeader>

        <div className="flex-1 py-4 space-y-4">
          {transactions.filter((t) => selectedIds.has(t.id)).slice(0, 5).map((txn) => (
            <div key={txn.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <TransactionTypeIcon type={txn.type} />
              <span className="truncate">{formatCurrency(Number(txn.amount))} · {txn.category?.name || "未分类"} · {txn.account?.name}</span>
            </div>
          ))}
          {selectedIds.size > 5 && (
            <p className="text-xs text-muted-foreground">...还有 {selectedIds.size - 5} 条</p>
          )}
          <div>
            <Label>模板名称</Label>
            <Input
              className="mt-1"
              placeholder="给模板起个名字..."
              value={tmplName}
              onChange={(e) => setTmplName(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setTmplSheetOpen(false)} className="w-full sm:w-auto">取消</Button>
          <Button onClick={async () => {
            if (!tmplName.trim()) { toast.error("请输入模板名称"); return; }
            setCreatingTmpl(true);
            try {
              await createTemplateFromTransactions(Array.from(selectedIds), tmplName.trim());
              toast.success("模板创建成功");
              setTmplSheetOpen(false);
            } catch (e: any) {
              toast.error(e.message);
            } finally {
              setCreatingTmpl(false);
            }
          }} disabled={creatingTmpl || !tmplName.trim()} className="w-full sm:w-auto">
            {creatingTmpl && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            创建模板
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
