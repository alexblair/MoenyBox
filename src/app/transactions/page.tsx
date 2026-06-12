"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { getTransactions, deleteTransaction, getCategories, getAccounts, batchUpdateTransactions, batchDeleteTransactions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { flatCategories } from "@/lib/tree-utils";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { BatchSelectionBar } from "@/components/transactions/batch-selection-bar";
import { BatchEditSheet } from "@/components/transactions/batch-edit-sheet";
import { DupDetectionSheet } from "@/components/transactions/dup-detection-sheet";
import { CloneSheet } from "@/components/transactions/clone-sheet";
import { CreateTemplateSheet } from "@/components/transactions/create-template-sheet";
import { RequirePermission } from "@/components/require-permission";
import { TransactionList } from "@/components/transactions/transaction-list";
import type { Transaction, Category, Account, TransactionSearchParams, TransactionType, DuplicateGroup } from "@/types";

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(
    searchParams.toString().length > 0
  );

  const [filters, setFilters] = useState<TransactionSearchParams>({
    type: (searchParams.get("type") as TransactionType) || undefined,
    categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
    accountId: searchParams.get("accountId") ? Number(searchParams.get("accountId")) : undefined,
    keyword: searchParams.get("keyword") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    amountMin: searchParams.get("amountMin") ? Number(searchParams.get("amountMin")) : undefined,
    amountMax: searchParams.get("amountMax") ? Number(searchParams.get("amountMax")) : undefined,
    page: 1,
    pageSize: 20,
    sortBy: "dateTime",
    sortOrder: "desc",
  } as TransactionSearchParams);

  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState("ALL");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [batchStep, setBatchStep] = useState<"edit" | "confirm">("edit");
  const [batchMode, setBatchMode] = useState<"batch" | "perRow">("batch");
  const [batchEdit, setBatchEdit] = useState({
    changeAccount: false, accountId: "",
    changeType: false, type: "",
    changeCategory: false, categoryId: "",
    changeAmount: false, amount: "",
  });
  const [perRowEdits, setPerRowEdits] = useState<Record<number, { type?: string; amount?: number; accountId?: number; categoryId?: number | null }>>({});
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<Record<number, { type: string; amount: number; categoryId: number | null; accountId: number }> | null>(null);

  const [dupSheetOpen, setDupSheetOpen] = useState(false);
  const [dupFields, setDupFields] = useState<string[]>(["amount", "note"]);
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[]>([]);
  const [dupTotalDuplicates, setDupTotalDuplicates] = useState(0);
  const [dupRemovalIds, setDupRemovalIds] = useState<Set<number>>(new Set());
  const [dupDetecting, setDupDetecting] = useState(false);
  const [dupDetected, setDupDetected] = useState(false);

  const [cloneSheetOpen, setCloneSheetOpen] = useState(false);
  const [cloneMode, setCloneMode] = useState<"clone" | "partial">("clone");
  const [cloneOverrides, setCloneOverrides] = useState({
    changeDate: false, dateTime: "",
    changeAmount: false, amount: "",
    changeNote: false, note: "",
    changeCategory: false, categoryId: "",
  });
  const [cloning, setCloning] = useState(false);

  const [tmplSheetOpen, setTmplSheetOpen] = useState(false);
  const [tmplName, setTmplName] = useState("");
  const [creatingTmpl, setCreatingTmpl] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params: TransactionSearchParams = { ...filters };
      if (dateRange === "week") {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        params.dateFrom = new Date(now.getTime() - diff * 86400000).toISOString().slice(0, 10);
        params.dateTo = now.toISOString().slice(0, 10);
      } else if (dateRange === "month") {
        const now = new Date();
        params.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        params.dateTo = now.toISOString().slice(0, 10);
      } else if (dateRange === "quarter") {
        const now = new Date();
        params.dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
        params.dateTo = now.toISOString().slice(0, 10);
      }
      if (!params.type) params.type = undefined;

      const [txnRes, cats, accts] = await Promise.all([
        getTransactions(params),
        getCategories().catch(() => []),
        getAccounts().catch(() => []),
      ]);
      setTransactions(txnRes.data);
      setTotalPages(txnRes.totalPages);
      setTotal(txnRes.total);
      setCategories(cats);
      setAccounts(accts);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, dateRange]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (txn: Transaction) => {
    if (!confirm("确定删除此交易记录吗？")) return;
    try {
      await deleteTransaction(txn.id);
      toast.success("交易已删除");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSheetOpen(false);
    setBatchStep("edit");
    setBatchMode("batch");
    setBatchEdit({
      changeAccount: false, accountId: "",
      changeType: false, type: "",
      changeCategory: false, categoryId: "",
      changeAmount: false, amount: "",
    });
    setPerRowEdits({});
    setCloneSheetOpen(false);
    setTmplSheetOpen(false);
  };

  const handleBatchUpdate = async () => {
    setBatchUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const originals: Record<number, any> = {};
      for (const t of transactions) {
        if (selectedIds.has(t.id)) {
          originals[t.id] = { type: t.type, amount: Number(t.amount), categoryId: t.categoryId, accountId: t.accountId };
        }
      }

      if (batchMode === "batch") {
        const updates: Record<string, unknown> = {};
        if (batchEdit.changeAccount && batchEdit.accountId) updates.accountId = Number(batchEdit.accountId);
        if (batchEdit.changeType && batchEdit.type) updates.type = batchEdit.type;
        if (batchEdit.changeCategory) updates.categoryId = batchEdit.categoryId === "NONE" ? null : Number(batchEdit.categoryId);
        if (batchEdit.changeAmount && batchEdit.amount) updates.amount = Number(batchEdit.amount);
        if (Object.keys(updates).length === 0) { toast.error("请选择要修改的字段并填写值"); setBatchUpdating(false); return; }
        await batchUpdateTransactions(ids, updates);
      } else {
        let changed = 0;
        for (const txn of transactions) {
          if (!selectedIds.has(txn.id)) continue;
          const edits = perRowEdits[txn.id];
          if (!edits) continue;
          const u: Record<string, unknown> = {};
          if (edits.type && edits.type !== txn.type) u.type = edits.type;
          if (edits.amount != null && Number(edits.amount) !== Number(txn.amount)) u.amount = Number(edits.amount);
          if (edits.accountId != null && edits.accountId !== txn.accountId) u.accountId = Number(edits.accountId);
          if (edits.categoryId !== undefined && edits.categoryId !== txn.categoryId) u.categoryId = edits.categoryId === null ? null : Number(edits.categoryId);
          if (Object.keys(u).length > 0) {
            await batchUpdateTransactions([txn.id], u);
            changed++;
          }
        }
        if (changed === 0) { toast.error("没有需要修改的内容"); setBatchUpdating(false); return; }
      }

      setUndoSnapshot(originals);
      toast.success(`已更新 ${Object.keys(originals).length} 条记录`, {
        action: {
          label: "撤销",
          onClick: () => handleUndo(ids, originals),
        },
      });
      clearSelection();
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBatchUpdating(false);
    }
  };

  const handleUndo = async (ids: number[], originals: Record<number, any>) => {
    try {
      for (const id of ids) {
        if (originals[id]) {
          await batchUpdateTransactions([id], {
            type: originals[id].type,
            amount: originals[id].amount,
            categoryId: originals[id].categoryId,
            accountId: originals[id].accountId,
          });
        }
      }
      toast.success("已撤销批量修改");
      load();
    } catch (e: any) {
      toast.error("撤销失败: " + e.message);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条记录？此操作不可撤销。`)) return;
    setBatchUpdating(true);
    try {
      const res = await batchDeleteTransactions(Array.from(selectedIds));
      toast.success(`已删除 ${res.count} 条记录`);
      clearSelection();
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBatchUpdating(false);
    }
  };

  const allFlatCats = flatCategories(categories);

  return (
    <div className="pt-4 space-y-4 md:pt-0 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">交易记录</h2>
        <div className="flex items-center gap-2">
          <RequirePermission permission="transaction.create">
            <Link href="/transactions/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> 新建交易
              </Button>
            </Link>
          </RequirePermission>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDupGroups([]); setDupDetected(false); setDupSheetOpen(true); }}
          >
            <Search className="mr-1 h-4 w-4" />
            查重
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-4 w-4" />
            筛选
            {showFilters ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
          </Button>
        </div>
      </div>

      {showFilters && (
        <TransactionFilters
          filters={filters}
          dateRange={dateRange}
          categories={categories}
          accounts={accounts}
          updateFilter={updateFilter}
          setDateRange={setDateRange}
          setFilters={setFilters}
        />
      )}

      <BatchSelectionBar
        selectedIds={selectedIds}
        batchUpdating={batchUpdating}
        setBatchEdit={setBatchEdit}
        setSheetOpen={setSheetOpen}
        setCloneMode={setCloneMode}
        setCloneOverrides={setCloneOverrides}
        setCloneSheetOpen={setCloneSheetOpen}
        setTmplSheetOpen={setTmplSheetOpen}
        setTmplName={setTmplName}
        handleBatchDelete={handleBatchDelete}
        clearSelection={clearSelection}
      />

      <BatchEditSheet
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        batchStep={batchStep}
        setBatchStep={setBatchStep}
        batchMode={batchMode}
        setBatchMode={setBatchMode}
        batchEdit={batchEdit}
        setBatchEdit={setBatchEdit}
        perRowEdits={perRowEdits}
        setPerRowEdits={setPerRowEdits}
        selectedIds={selectedIds}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        allFlatCats={allFlatCats}
        batchUpdating={batchUpdating}
        handleBatchUpdate={handleBatchUpdate}
        clearSelection={clearSelection}
      />

      <DupDetectionSheet
        dupSheetOpen={dupSheetOpen}
        setDupSheetOpen={setDupSheetOpen}
        dupFields={dupFields}
        setDupFields={setDupFields}
        dupDetecting={dupDetecting}
        setDupDetecting={setDupDetecting}
        dupDetected={dupDetected}
        setDupDetected={setDupDetected}
        dupGroups={dupGroups}
        setDupGroups={setDupGroups}
        dupRemovalIds={dupRemovalIds}
        setDupRemovalIds={setDupRemovalIds}
        dupTotalDuplicates={dupTotalDuplicates}
        setDupTotalDuplicates={setDupTotalDuplicates}
        filters={filters}
        load={load}
      />

      <CloneSheet
        cloneSheetOpen={cloneSheetOpen}
        setCloneSheetOpen={setCloneSheetOpen}
        cloneMode={cloneMode}
        setCloneMode={setCloneMode}
        cloneOverrides={cloneOverrides}
        setCloneOverrides={setCloneOverrides}
        selectedIds={selectedIds}
        categories={categories}
        cloning={cloning}
        setCloning={setCloning}
        clearSelection={clearSelection}
        load={load}
      />

      <CreateTemplateSheet
        tmplSheetOpen={tmplSheetOpen}
        setTmplSheetOpen={setTmplSheetOpen}
        tmplName={tmplName}
        setTmplName={setTmplName}
        selectedIds={selectedIds}
        transactions={transactions}
        creatingTmpl={creatingTmpl}
        setCreatingTmpl={setCreatingTmpl}
      />

      <TransactionList
        loading={loading}
        transactions={transactions}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        selectAll={selectAll}
        handleDelete={handleDelete}
        setSelectedIds={setSelectedIds}
        setCloneMode={setCloneMode}
        setCloneOverrides={setCloneOverrides}
        setCloneSheetOpen={setCloneSheetOpen}
        filters={filters}
        setFilters={setFilters}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="pt-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
