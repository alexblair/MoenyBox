"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionTypeIcon, TransactionAmount } from "@/components/transaction-amount";
import { TransactionTypeBadge } from "@/components/transaction-type-badge";
import { DUP_FIELD_OPTIONS, DUP_DATE_OPTIONS, DATE_FIELD_VALUES } from "@/lib/constants";
import { detectDuplicates, batchDeleteTransactions } from "@/lib/api";
import { toast } from "sonner";
import type { DuplicateGroup, TransactionSearchParams } from "@/types";

interface DupDetectionSheetProps {
  dupSheetOpen: boolean;
  setDupSheetOpen: (open: boolean) => void;
  dupFields: string[];
  setDupFields: (updater: string[] | ((prev: string[]) => string[])) => void;
  dupDetecting: boolean;
  setDupDetecting: (v: boolean) => void;
  dupDetected: boolean;
  setDupDetected: (v: boolean) => void;
  dupGroups: DuplicateGroup[];
  setDupGroups: (groups: DuplicateGroup[]) => void;
  dupRemovalIds: Set<number>;
  setDupRemovalIds: (updater: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  dupTotalDuplicates: number;
  setDupTotalDuplicates: (n: number) => void;
  filters: TransactionSearchParams;
  load: () => void;
}

function toggleDupField(
  field: string,
  setDupFields: (updater: string[] | ((prev: string[]) => string[])) => void
) {
  if (DATE_FIELD_VALUES.includes(field)) {
    setDupFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => !DATE_FIELD_VALUES.includes(f))
        : [...prev.filter((f) => !DATE_FIELD_VALUES.includes(f)), field]
    );
  } else {
    setDupFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }
}

function describeGroup(group: DuplicateGroup, fields: string[]) {
  const txn = group.transactions[0];
  const parts: string[] = [];
  for (const field of fields) {
    switch (field) {
      case "amount": parts.push(formatCurrency(Number(txn.amount))); break;
      case "categoryId": parts.push(txn.category?.name ?? "未设置"); break;
      case "accountId": parts.push(txn.account?.name ?? "?"); break;
      case "dateDay": parts.push(txn.dateTime?.slice(0, 10) ?? "?"); break;
      case "dateHour": parts.push(txn.dateTime?.slice(0, 13) ?? "?"); break;
      case "dateMinute": parts.push(txn.dateTime?.slice(0, 16) ?? "?"); break;
      case "dateExact": parts.push(txn.dateTime ?? "?"); break;
      case "note": parts.push(`"${txn.note || ""}"`); break;
      case "type": parts.push(txn.type === "EXPENSE" ? "支出" : txn.type === "INCOME" ? "收入" : "转账"); break;
    }
  }
  return parts.join(" · ");
}

export function DupDetectionSheet({
  dupSheetOpen,
  setDupSheetOpen,
  dupFields,
  setDupFields,
  dupDetecting,
  setDupDetecting,
  dupDetected,
  setDupDetected,
  dupGroups,
  setDupGroups,
  dupRemovalIds,
  setDupRemovalIds,
  dupTotalDuplicates,
  setDupTotalDuplicates,
  filters,
  load,
}: DupDetectionSheetProps) {
  const handleDetectDuplicates = async () => {
    if (dupFields.length === 0) { toast.error("至少选择一个比较字段"); return; }
    setDupDetecting(true);
    setDupDetected(false);
    try {
      const result = await detectDuplicates({
        fields: dupFields,
        type: filters.type,
        categoryId: filters.categoryId,
        accountId: filters.accountId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        keyword: filters.keyword,
      });
      setDupGroups(result.groups);
      setDupTotalDuplicates(result.totalDuplicates);
      const allRemove = new Set<number>();
      for (const g of result.groups) {
        for (const id of g.removeIds) allRemove.add(id);
      }
      setDupRemovalIds(allRemove);
      setDupDetected(true);
      if (result.groups.length === 0) toast.success("未发现重复交易");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDupDetecting(false);
    }
  };

  const handleDupDelete = async () => {
    const ids = Array.from(dupRemovalIds);
    if (ids.length === 0) { toast.error("没有选中要删除的重复项"); return; }
    if (!confirm(`确定删除选中的 ${ids.length} 条重复记录？此操作不可撤销。`)) return;
    try {
      const res = await batchDeleteTransactions(ids);
      toast.success(`已删除 ${res.count} 条重复记录`);
      setDupSheetOpen(false);
      setDupDetected(false);
      setDupGroups([]);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Sheet open={dupSheetOpen} onOpenChange={(open) => { if (!open) { setDupSheetOpen(false); setDupDetected(false); setDupGroups([]); } }}>
      <SheetContent className="flex flex-col sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        <SheetHeader className="shrink-0">
          <SheetTitle>重复交易检测</SheetTitle>
          <SheetDescription>选择比较字段，检测重复交易。至少选择一个字段。</SheetDescription>
        </SheetHeader>

        <div className="py-4 shrink-0">
          <label className="text-sm font-medium mb-2 block">比较字段</label>
          <div className="flex flex-wrap gap-3">
            {DUP_FIELD_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <Checkbox
                  checked={dupFields.includes(opt.value)}
                  onCheckedChange={() => toggleDupField(opt.value, setDupFields)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="mt-2 pl-2 border-l-2 border-muted">
            <div className="flex flex-wrap gap-3">
              {DUP_DATE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <Checkbox
                    checked={dupFields.includes(opt.value)}
                    onCheckedChange={() => toggleDupField(opt.value, setDupFields)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {dupFields.filter((f) => DATE_FIELD_VALUES.includes(f)).length > 0 ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                日期精度：{DUP_DATE_OPTIONS.find((o) => dupFields.includes(o.value))?.label}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-0.5">（不按日期比较）</p>
            )}
          </div>
          {dupFields.length === 0 && (
            <p className="text-xs text-destructive mt-1">至少选择一个比较字段</p>
          )}
        </div>

        <div className="shrink-0 pb-4">
          <p className="text-xs text-muted-foreground mb-1">检测范围基于当前筛选条件</p>
          <Button
            onClick={handleDetectDuplicates}
            disabled={dupDetecting || dupFields.length === 0}
            className="w-full"
          >
            {dupDetecting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
            检测重复
          </Button>
        </div>

        {dupDetected && (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            {dupGroups.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                未发现重复交易
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                <p className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2 z-10">
                  找到 <span className="text-primary font-semibold">{dupGroups.length}</span> 组重复，共 <span className="text-destructive font-semibold">{dupTotalDuplicates}</span> 条重复记录
                </p>
                {dupGroups.map((group, gi) => (
                  <div key={gi} className="border border-border/60 rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b flex items-center justify-between">
                      <span>{describeGroup(group, dupFields)}</span>
                      <span className="text-muted-foreground/60">{group.count} 条</span>
                    </div>
                    <div className="divide-y divide-border/40">
                      {group.transactions.map((txn) => {
                        const isRemoval = dupRemovalIds.has(txn.id);
                        return (
                          <div key={txn.id} className="flex items-start gap-2 px-3 py-2">
                            <div className="pt-0.5 shrink-0">
                              <Checkbox
                                checked={isRemoval}
                                onCheckedChange={(v) => {
                                  setDupRemovalIds((prev) => {
                                    const next = new Set(prev);
                                    if (v) next.add(txn.id); else next.delete(txn.id);
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <TransactionTypeIcon type={txn.type} />
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(txn.dateTime, "datetime")}
                                </span>
                                <TransactionTypeBadge type={txn.type} />
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <TransactionAmount type={txn.type} amount={Number(txn.amount)} />
                                <span className="text-xs text-muted-foreground">
                                  {txn.category?.name || "未分类"} · {txn.account?.name}
                                </span>
                              </div>
                              {txn.note && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{txn.note}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {dupDetected && dupGroups.length > 0 && (
          <div className="shrink-0 border-t pt-3 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                已选 <span className="text-destructive font-semibold">{dupRemovalIds.size}</span> 条重复记录
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDupDelete}
                disabled={dupRemovalIds.size === 0}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                删除选中
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
