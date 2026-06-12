"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/components/require-permission";
import { X, Copy, FilePlus, Trash2, Loader2 } from "lucide-react";

interface BatchSelectionBarProps {
  selectedIds: Set<number>;
  batchUpdating: boolean;
  setBatchEdit: (updater: any) => void;
  setSheetOpen: (open: boolean) => void;
  setCloneMode: (mode: "clone" | "partial") => void;
  setCloneOverrides: (updater: any) => void;
  setCloneSheetOpen: (open: boolean) => void;
  setTmplSheetOpen: (open: boolean) => void;
  setTmplName: (name: string) => void;
  handleBatchDelete: () => void;
  clearSelection: () => void;
}

export function BatchSelectionBar({
  selectedIds,
  batchUpdating,
  setBatchEdit,
  setSheetOpen,
  setCloneMode,
  setCloneOverrides,
  setCloneSheetOpen,
  setTmplSheetOpen,
  setTmplName,
  handleBatchDelete,
  clearSelection,
}: BatchSelectionBarProps) {
  if (selectedIds.size === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-primary">
            已选择 {selectedIds.size} 条
          </span>
          <div className="h-4 w-px bg-border" />
          <RequirePermission permission="transaction.edit">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setBatchEdit({ changeAccount: false, accountId: "", changeType: false, type: "", changeCategory: false, categoryId: "", changeAmount: false, amount: "" }); setSheetOpen(true); }}>
              批量修改
            </Button>
          </RequirePermission>
          <div className="h-4 w-px bg-border" />
          <RequirePermission permission="transaction.create">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setCloneMode("clone"); setCloneOverrides({ changeDate: false, dateTime: "", changeAmount: false, amount: "", changeNote: false, note: "", changeCategory: false, categoryId: "" }); setCloneSheetOpen(true); }}>
              <Copy className="h-3 w-3 mr-1" />
              复制
            </Button>
          </RequirePermission>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setTmplSheetOpen(true); setTmplName(""); }}>
            <FilePlus className="h-3 w-3 mr-1" />
            存为模板
          </Button>
          <div className="h-4 w-px bg-border" />
          <RequirePermission permission="transaction.delete">
            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleBatchDelete} disabled={batchUpdating}>
              {batchUpdating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
              批量删除
            </Button>
          </RequirePermission>
          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearSelection}>
            <X className="h-3 w-3 mr-1" />
            取消选择
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
