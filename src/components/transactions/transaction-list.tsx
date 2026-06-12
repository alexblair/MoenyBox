"use client";

import { Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/components/require-permission";
import { EmptyState } from "@/components/empty-state";
import { TransactionTypeIcon } from "@/components/transaction-amount";
import { TransactionTypeBadge } from "@/components/transaction-type-badge";
import { TransactionAmount } from "@/components/transaction-amount";
import { Pagination } from "@/components/pagination";
import { formatDate } from "@/lib/utils";
import type { Transaction, TransactionSearchParams } from "@/types";

interface TransactionListProps {
  loading: boolean;
  transactions: Transaction[];
  selectedIds: Set<number>;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  handleDelete: (txn: Transaction) => void;
  setSelectedIds: (updater: any) => void;
  setCloneMode: (mode: "clone" | "partial") => void;
  setCloneOverrides: (updater: any) => void;
  setCloneSheetOpen: (open: boolean) => void;
  filters: TransactionSearchParams;
  setFilters: React.Dispatch<React.SetStateAction<TransactionSearchParams>>;
  totalPages: number;
  total: number;
}

export function TransactionList({
  loading,
  transactions,
  selectedIds,
  toggleSelect,
  selectAll,
  handleDelete,
  setSelectedIds,
  setCloneMode,
  setCloneOverrides,
  setCloneSheetOpen,
  filters,
  setFilters,
  totalPages,
  total,
}: TransactionListProps) {
  return (
    <>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          message="暂无交易记录"
          action={<Link href="/transactions/new"><Button variant="link" className="mt-2">去记账</Button></Link>}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={transactions.length > 0 && selectedIds.size === transactions.length}
              onCheckedChange={selectAll}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `已选 ${selectedIds.size} / ${transactions.length}`
                : "全选"}
            </span>
          </div>
          {transactions.map((txn) => (
            <div key={txn.id} className="flex items-start gap-2 min-w-0">
              <div className="pt-3 pl-1 shrink-0">
                <Checkbox
                  checked={selectedIds.has(txn.id)}
                  onCheckedChange={() => toggleSelect(txn.id)}
                />
              </div>
              <RequirePermission permission="transaction.edit">
                <Link href={`/transactions/${txn.id}`} className="flex-1">
                  <Card className={`transition-colors ${selectedIds.has(txn.id) ? "ring-1 ring-primary/40" : "hover:bg-accent/50"}`}>
                    <CardContent className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 items-center">
                      <TransactionTypeIcon type={txn.type} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {txn.category?.name || (txn.type === "TRANSFER" ? `转账: ${txn.account?.name}→${txn.toAccount?.name}` : "未分类")}
                          </p>
                          <TransactionTypeBadge type={txn.type} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDate(txn.dateTime, "datetime")}
                          {txn.note && ` · ${txn.note}`}
                          {txn.account && ` · ${txn.account.name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <TransactionAmount type={txn.type} amount={Number(txn.amount)} />
                        <RequirePermission permission="transaction.create">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedIds(new Set([txn.id]));
                              setCloneMode("clone");
                              setCloneOverrides({ changeDate: false, dateTime: "", changeAmount: false, amount: "", changeNote: false, note: "", changeCategory: false, categoryId: "" });
                              setCloneSheetOpen(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-primary"
                            title="复制此记录"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </RequirePermission>
                        <RequirePermission permission="transaction.delete">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(txn);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </RequirePermission>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </RequirePermission>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={filters.page || 1}
        pageSize={filters.pageSize || 20}
        totalPages={totalPages}
        total={total}
        onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
        onPageSizeChange={(pageSize) => setFilters((p) => ({ ...p, pageSize, page: 1 }))}
      />
    </>
  );
}
