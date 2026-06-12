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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CategorySelect } from "@/components/category-select";
import { SegmentedControl } from "@/components/segmented-control";
import { Loader2 } from "lucide-react";
import { cloneTransactions } from "@/lib/api";
import { toast } from "sonner";
import type { Category } from "@/types";

interface CloneSheetProps {
  cloneSheetOpen: boolean;
  setCloneSheetOpen: (open: boolean) => void;
  cloneMode: "clone" | "partial";
  setCloneMode: (mode: "clone" | "partial") => void;
  cloneOverrides: {
    changeDate: boolean; dateTime: string;
    changeAmount: boolean; amount: string;
    changeNote: boolean; note: string;
    changeCategory: boolean; categoryId: string;
  };
  setCloneOverrides: (updater: any) => void;
  selectedIds: Set<number>;
  categories: Category[];
  cloning: boolean;
  setCloning: (v: boolean) => void;
  clearSelection: () => void;
  load: () => void;
}

export function CloneSheet({
  cloneSheetOpen,
  setCloneSheetOpen,
  cloneMode,
  setCloneMode,
  cloneOverrides,
  setCloneOverrides,
  selectedIds,
  categories,
  cloning,
  setCloning,
  clearSelection,
  load,
}: CloneSheetProps) {
  return (
    <Sheet open={cloneSheetOpen} onOpenChange={(open) => { if (!open) { setCloneSheetOpen(false); } }}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader className="shrink-0">
          <SheetTitle>复制交易记录</SheetTitle>
          <SheetDescription>选择复制方式</SheetDescription>
        </SheetHeader>

        <SegmentedControl
          options={[
            { value: "clone", label: "直接克隆" },
            { value: "partial", label: "部分修改" },
          ]}
          value={cloneMode}
          onChange={(v) => setCloneMode(v as "clone" | "partial")}
          size="sm"
          className="my-4"
        />

        {cloneMode === "clone" ? (
          <div className="flex-1 py-4">
            <p className="text-sm text-muted-foreground">
              将完全复制选中的 <span className="font-semibold text-foreground">{selectedIds.size}</span> 条交易记录，所有参数保持一致。
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              对选中的 <span className="font-semibold text-foreground">{selectedIds.size}</span> 条记录统一修改以下字段后复制：
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="clone-date"
                  checked={cloneOverrides.changeDate}
                  onCheckedChange={(v) => setCloneOverrides((p: any) => ({ ...p, changeDate: !!v }))}
                />
                <Label htmlFor="clone-date" className="text-sm font-medium cursor-pointer">修改日期</Label>
              </div>
              {cloneOverrides.changeDate && (
                <Input
                  type="datetime-local"
                  className="h-9 text-xs ml-6"
                  value={cloneOverrides.dateTime}
                  onChange={(e) => setCloneOverrides((p: any) => ({ ...p, dateTime: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="clone-amount"
                  checked={cloneOverrides.changeAmount}
                  onCheckedChange={(v) => setCloneOverrides((p: any) => ({ ...p, changeAmount: !!v }))}
                />
                <Label htmlFor="clone-amount" className="text-sm font-medium cursor-pointer">修改金额</Label>
              </div>
              {cloneOverrides.changeAmount && (
                <Input
                  type="number"
                  className="h-9 text-xs ml-6"
                  placeholder="新金额"
                  value={cloneOverrides.amount}
                  onChange={(e) => setCloneOverrides((p: any) => ({ ...p, amount: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="clone-category"
                  checked={cloneOverrides.changeCategory}
                  onCheckedChange={(v) => setCloneOverrides((p: any) => ({ ...p, changeCategory: !!v }))}
                />
                <Label htmlFor="clone-category" className="text-sm font-medium cursor-pointer">修改分类</Label>
              </div>
              {cloneOverrides.changeCategory && (
                <CategorySelect
                  value={cloneOverrides.categoryId}
                  onChange={(v) => setCloneOverrides((p: any) => ({ ...p, categoryId: v }))}
                  categories={categories}
                  nullOption="不设置"
                  nullValue="NONE"
                  size="sm"
                  className="ml-6"
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="clone-note"
                  checked={cloneOverrides.changeNote}
                  onCheckedChange={(v) => setCloneOverrides((p: any) => ({ ...p, changeNote: !!v }))}
                />
                <Label htmlFor="clone-note" className="text-sm font-medium cursor-pointer">修改备注</Label>
              </div>
              {cloneOverrides.changeNote && (
                <Input
                  className="h-9 text-xs ml-6"
                  placeholder="新备注"
                  value={cloneOverrides.note}
                  onChange={(e) => setCloneOverrides((p: any) => ({ ...p, note: e.target.value }))}
                />
              )}
            </div>
          </div>
        )}

        <SheetFooter className="shrink-0 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setCloneSheetOpen(false)} className="w-full sm:w-auto">取消</Button>
          <Button onClick={async () => {
            setCloning(true);
            try {
              const overrides: Record<string, unknown> = {};
              if (cloneMode === "partial") {
                if (cloneOverrides.changeDate) overrides.dateTime = new Date(cloneOverrides.dateTime).toISOString();
                if (cloneOverrides.changeAmount) overrides.amount = Number(cloneOverrides.amount);
                if (cloneOverrides.changeCategory) overrides.categoryId = cloneOverrides.categoryId === "NONE" ? null : Number(cloneOverrides.categoryId);
                if (cloneOverrides.changeNote) overrides.note = cloneOverrides.note;
                if (Object.keys(overrides).length === 0) { toast.error("请勾选要修改的字段"); setCloning(false); return; }
              }
              await cloneTransactions(Array.from(selectedIds), overrides);
              toast.success(`已复制 ${selectedIds.size} 条记录`);
              setCloneSheetOpen(false);
              clearSelection();
              load();
            } catch (e: any) {
              toast.error(e.message);
            } finally {
              setCloning(false);
            }
          }} disabled={cloning} className="w-full sm:w-auto">
            {cloning && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            确认复制
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
