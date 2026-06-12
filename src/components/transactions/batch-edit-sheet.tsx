"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AccountSelect } from "@/components/account-select";
import { CategorySelect } from "@/components/category-select";
import { SegmentedControl } from "@/components/segmented-control";
import { ArrowRight, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Transaction, Category, Account, TransactionType } from "@/types";

interface BatchEditSheetProps {
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  batchStep: "edit" | "confirm";
  setBatchStep: (step: "edit" | "confirm") => void;
  batchMode: "batch" | "perRow";
  setBatchMode: (mode: "batch" | "perRow") => void;
  batchEdit: {
    changeAccount: boolean; accountId: string;
    changeType: boolean; type: string;
    changeCategory: boolean; categoryId: string;
    changeAmount: boolean; amount: string;
  };
  setBatchEdit: (updater: any) => void;
  perRowEdits: Record<number, { type?: string; amount?: number; accountId?: number; categoryId?: number | null }>;
  setPerRowEdits: (updater: any) => void;
  selectedIds: Set<number>;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  allFlatCats: Category[];
  batchUpdating: boolean;
  handleBatchUpdate: () => void;
  clearSelection: () => void;
}

export function BatchEditSheet({
  sheetOpen,
  setSheetOpen,
  batchStep,
  setBatchStep,
  batchMode,
  setBatchMode,
  batchEdit,
  setBatchEdit,
  perRowEdits,
  setPerRowEdits,
  selectedIds,
  transactions,
  accounts,
  categories,
  allFlatCats,
  batchUpdating,
  handleBatchUpdate,
  clearSelection,
}: BatchEditSheetProps) {
  return (
    <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) { clearSelection(); setSheetOpen(false); } }}>
      <SheetContent className="flex flex-col sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        {batchStep === "edit" ? (
          <>
            <SheetHeader className="shrink-0">
              <SheetTitle>批量操作 {selectedIds.size} 条记录</SheetTitle>
              <SheetDescription>选择修改模式，编辑字段后点击预览</SheetDescription>
            </SheetHeader>

            <SegmentedControl
              options={[{ value: "batch", label: "统一修改" }, { value: "perRow", label: "逐行修改" }]}
              value={batchMode}
              onChange={(v) => { setBatchMode(v as "batch" | "perRow"); setBatchStep("edit"); }}
              size="sm"
              className="my-4"
            />

            <div className="flex-1 min-h-0 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            {batchMode === "batch" ? (
              <div className="space-y-3 sm:space-y-5 py-4">
                <div className="space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Checkbox
                          id="change-account"
                          checked={batchEdit.changeAccount}
                          onCheckedChange={(v) => setBatchEdit((p: any) => ({ ...p, changeAccount: !!v }))}
                        />
                        <Label htmlFor="change-account" className="text-sm font-medium cursor-pointer">修改账户</Label>
                      </div>
                  {batchEdit.changeAccount && (
                    <AccountSelect
                      value={batchEdit.accountId}
                      onValueChange={(v) => setBatchEdit((p: any) => ({ ...p, accountId: v }))}
                      accounts={accounts}
                      placeholder="选择新账户"
                      size="sm"
                      className="ml-0 sm:ml-7"
                      showBalance={false}
                    />
                  )}
                </div>
                <div className="space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Checkbox
                          id="change-type"
                          checked={batchEdit.changeType}
                          onCheckedChange={(v) => setBatchEdit((p: any) => ({ ...p, changeType: !!v }))}
                        />
                        <Label htmlFor="change-type" className="text-sm font-medium cursor-pointer">修改类型</Label>
                      </div>
                  {batchEdit.changeType && (
                    <Select
                      value={batchEdit.type}
                      onValueChange={(v) => setBatchEdit((p: any) => ({ ...p, type: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs ml-0 sm:ml-7">
                        <SelectValue placeholder="选择新类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPENSE">支出</SelectItem>
                        <SelectItem value="INCOME">收入</SelectItem>
                        <SelectItem value="TRANSFER">转账</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Checkbox
                          id="change-category"
                          checked={batchEdit.changeCategory}
                          onCheckedChange={(v) => setBatchEdit((p: any) => ({ ...p, changeCategory: !!v }))}
                        />
                        <Label htmlFor="change-category" className="text-sm font-medium cursor-pointer">修改分类</Label>
                      </div>
                  {batchEdit.changeCategory && (
                    <CategorySelect
                      value={batchEdit.categoryId}
                      onChange={(v) => setBatchEdit((p: any) => ({ ...p, categoryId: v }))}
                      categories={categories}
                      nullOption="不设置"
                      nullValue="NONE"
                      size="sm"
                      className="ml-0 sm:ml-7"
                    />
                  )}
                </div>
                <div className="space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Checkbox
                          id="change-amount"
                          checked={batchEdit.changeAmount}
                          onCheckedChange={(v) => setBatchEdit((p: any) => ({ ...p, changeAmount: !!v }))}
                        />
                        <Label htmlFor="change-amount" className="text-sm font-medium cursor-pointer">修改金额</Label>
                      </div>
                  {batchEdit.changeAmount && (
                    <Input
                      type="number"
                      className="h-9 text-xs ml-0 sm:ml-7"
                      placeholder="输入新金额"
                      value={batchEdit.amount}
                      onChange={(e) => setBatchEdit((p: any) => ({ ...p, amount: e.target.value }))}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {transactions.filter((t) => selectedIds.has(t.id)).map((txn) => (
                  <Card key={txn.id} className="border-border/60">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">
                          #{txn.id} · {formatDate(txn.dateTime, "datetime")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            txn.type === "EXPENSE"
                              ? "border-red-200 text-red-600"
                              : txn.type === "INCOME"
                                ? "border-green-200 text-green-600"
                                : "border-blue-200 text-blue-600"
                          }`}
                        >
                          {txn.type === "EXPENSE" ? "支出" : txn.type === "INCOME" ? "收入" : "转账"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">类型</label>
                          <Select
                            value={perRowEdits[txn.id]?.type || txn.type}
                            onValueChange={(v) => setPerRowEdits((prev: any) => ({ ...prev, [txn.id]: { ...prev[txn.id], type: v as TransactionType } }))}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EXPENSE">支出</SelectItem>
                              <SelectItem value="INCOME">收入</SelectItem>
                              <SelectItem value="TRANSFER">转账</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">金额</label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={perRowEdits[txn.id]?.amount ?? Number(txn.amount)}
                            onChange={(e) => setPerRowEdits((prev: any) => ({ ...prev, [txn.id]: { ...prev[txn.id], amount: Number(e.target.value) } }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">账户</label>
                          <AccountSelect
                            value={String(perRowEdits[txn.id]?.accountId || txn.accountId)}
                            onValueChange={(v) => setPerRowEdits((prev: any) => ({ ...prev, [txn.id]: { ...prev[txn.id], accountId: Number(v) } }))}
                            accounts={accounts}
                            size="sm"
                            showBalance={false}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">分类</label>
                          <CategorySelect
                            value={String(perRowEdits[txn.id]?.categoryId ?? txn.categoryId ?? "NONE")}
                            onChange={(v) => setPerRowEdits((prev: any) => ({ ...prev, [txn.id]: { ...prev[txn.id], categoryId: v === "NONE" ? null : Number(v) } }))}
                            categories={categories}
                            nullOption="不设置"
                            nullValue="NONE"
                            size="sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </div>

            <SheetFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
              <SheetClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">取消</Button>
              </SheetClose>
              <Button
                onClick={() => {
                  if (batchMode === "batch") {
                    const hasChanges = batchEdit.changeAccount || batchEdit.changeType || batchEdit.changeCategory || batchEdit.changeAmount;
                    if (!hasChanges) { toast.error("请勾选要修改的字段"); return; }
                  }
                  setBatchStep("confirm");
                }}
                disabled={batchUpdating}
                className="w-full sm:w-auto"
              >
                {batchUpdating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                预览修改
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader className="shrink-0">
              <SheetTitle>确认修改</SheetTitle>
              <SheetDescription>请确认以下修改内容</SheetDescription>
            </SheetHeader>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            {batchMode === "batch" ? (
              <div className="py-4 space-y-3">
                <p className="text-sm font-medium">
                  将以下修改应用到 <span className="text-primary">{selectedIds.size}</span> 条记录：
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {batchEdit.changeAccount && batchEdit.accountId && (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">
                      账户: {accounts.find((a) => a.id === Number(batchEdit.accountId))?.name || batchEdit.accountId}
                    </Badge>
                  )}
                  {batchEdit.changeType && batchEdit.type && (
                    <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs">
                      类型: {batchEdit.type === "EXPENSE" ? "支出" : batchEdit.type === "INCOME" ? "收入" : "转账"}
                    </Badge>
                  )}
                  {batchEdit.changeCategory && (
                    <Badge variant="outline" className="border-purple-200 text-purple-700 text-xs">
                      分类: {batchEdit.categoryId === "NONE" ? "不设置" : allFlatCats.find((c) => c.id === Number(batchEdit.categoryId))?.name || batchEdit.categoryId}
                    </Badge>
                  )}
                  {batchEdit.changeAmount && batchEdit.amount && (
                    <Badge variant="outline" className="border-green-200 text-green-700 text-xs">
                      金额: {formatCurrency(Number(batchEdit.amount))}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {transactions.filter((t) => selectedIds.has(t.id)).slice(0, 30).map((txn) => (
                    <div key={txn.id} className="text-xs p-1.5 bg-muted/40 rounded border border-border/40">
                      <div className="text-muted-foreground mb-1">{formatDate(txn.dateTime, "datetime")}</div>
                      <div className="space-y-0.5">
                        {batchEdit.changeAccount && batchEdit.accountId && Number(batchEdit.accountId) !== txn.accountId && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-muted-foreground shrink-0">账户:</span>
                            <span className="line-through text-destructive/50">{accounts.find((a) => a.id === txn.accountId)?.name || "?"}</span>
                            <ArrowRight className="h-3 w-3 mx-0.5 inline text-muted-foreground shrink-0" />
                            <span className="text-blue-600">{accounts.find((a) => a.id === Number(batchEdit.accountId))?.name}</span>
                          </div>
                        )}
                        {batchEdit.changeType && batchEdit.type && batchEdit.type !== txn.type && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-muted-foreground shrink-0">类型:</span>
                            <span className="line-through text-destructive/50">{txn.type === "EXPENSE" ? "支出" : "收入"}</span>
                            <ArrowRight className="h-3 w-3 mx-0.5 inline text-muted-foreground shrink-0" />
                            <span className="text-orange-600">{batchEdit.type === "EXPENSE" ? "支出" : "收入"}</span>
                          </div>
                        )}
                        {batchEdit.changeAmount && batchEdit.amount && Number(batchEdit.amount) !== Number(txn.amount) && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-muted-foreground shrink-0">金额:</span>
                            <span className="line-through text-destructive/50">{formatCurrency(Number(txn.amount))}</span>
                            <ArrowRight className="h-3 w-3 mx-0.5 inline text-muted-foreground shrink-0" />
                            <span className="text-green-600">{formatCurrency(Number(batchEdit.amount))}</span>
                          </div>
                        )}
                        {batchEdit.changeCategory && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-muted-foreground shrink-0">分类:</span>
                            <span className="line-through text-destructive/50">{txn.category?.name || "未设置"}</span>
                            <ArrowRight className="h-3 w-3 mx-0.5 inline text-muted-foreground shrink-0" />
                            <span className="text-purple-600">{batchEdit.categoryId === "NONE" ? "不设置" : allFlatCats.find((c) => c.id === Number(batchEdit.categoryId))?.name || "?"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedIds.size > 30 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">...还有 {selectedIds.size - 30} 条</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-2">
                {transactions.filter((t) => selectedIds.has(t.id)).map((txn) => {
                  const edits = perRowEdits[txn.id];
                  if (!edits) return null;
                  const changes: { field: string; oldVal: string; newVal: string; color: string }[] = [];
                  if (edits.type && edits.type !== txn.type) changes.push({ field: "类型", oldVal: txn.type === "EXPENSE" ? "支出" : "收入", newVal: edits.type === "EXPENSE" ? "支出" : "收入", color: "text-orange-600" });
                  if (edits.amount != null && Number(edits.amount) !== Number(txn.amount)) changes.push({ field: "金额", oldVal: formatCurrency(Number(txn.amount)), newVal: formatCurrency(Number(edits.amount)), color: "text-green-600" });
                  if (edits.accountId != null && edits.accountId !== txn.accountId) changes.push({ field: "账户", oldVal: accounts.find((a) => a.id === txn.accountId)?.name || "?", newVal: accounts.find((a) => a.id === edits.accountId)?.name || "?", color: "text-blue-600" });
                  if (edits.categoryId !== undefined && edits.categoryId !== txn.categoryId) changes.push({ field: "分类", oldVal: txn.category?.name || "未设置", newVal: edits.categoryId ? allFlatCats.find((c) => c.id === Number(edits.categoryId))?.name || "?" : "不设置", color: "text-purple-600" });
                  if (changes.length === 0) return null;
                  return (
                    <Card key={txn.id} className="border-border/40">
                      <CardContent className="p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">#{txn.id} · {formatDate(txn.dateTime, "datetime")}</span>
                          <Badge variant="outline" className={`text-xs ${txn.type === "EXPENSE" ? "border-red-200 text-red-600" : "border-green-200 text-green-600"}`}>
                            {txn.type === "EXPENSE" ? "支出" : "收入"}
                          </Badge>
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            {changes.map((c) => (
                              <tr key={c.field} className="border-t border-border/20">
                                <td className="text-muted-foreground py-0.5 w-10">{c.field}</td>
                                <td className="py-0.5">
                                  <span className="line-through text-destructive/50">{c.oldVal}</span>
                                </td>
                                <td className="py-0.5 text-center w-4">
                                  <ArrowRight className="h-3 w-3 inline text-muted-foreground" />
                                </td>
                                <td className={`py-0.5 font-medium ${c.color}`}>{c.newVal}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            </div>

            <SheetFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
              <Button variant="outline" onClick={() => setBatchStep("edit")} className="w-full sm:w-auto">返回修改</Button>
              <Button onClick={handleBatchUpdate} disabled={batchUpdating} className="w-full sm:w-auto">
                {batchUpdating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                确认应用
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
