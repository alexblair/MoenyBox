"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { CategorySelect } from "@/components/category-select";
import { AccountSelect } from "@/components/account-select";
import { TYPE_OPTIONS, DATE_RANGES } from "@/lib/constants";
import type { TransactionType, Category, Account, TransactionSearchParams } from "@/types";

interface TransactionFiltersProps {
  filters: TransactionSearchParams;
  dateRange: string;
  categories: Category[];
  accounts: Account[];
  updateFilter: (key: string, value: any) => void;
  setDateRange: (value: string) => void;
  setFilters: React.Dispatch<React.SetStateAction<TransactionSearchParams>>;
}

export function TransactionFilters({
  filters,
  dateRange,
  categories,
  accounts,
  updateFilter,
  setDateRange,
  setFilters,
}: TransactionFiltersProps) {
  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">类型</label>
            <Select
              value={filters.type || "ALL"}
              onValueChange={(v) => updateFilter("type", v === "ALL" ? undefined : v as TransactionType)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">时间范围</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">分类</label>
            <CategorySelect
              value={filters.categoryId?.toString() || ""}
              onChange={(v) => updateFilter("categoryId", v ? Number(v) : undefined)}
              categories={categories}
              nullOption="全部"
              nullValue=""
              size="sm"
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">账户</label>
            <AccountSelect
              value={filters.accountId?.toString() || "ALL"}
              onValueChange={(v) => updateFilter("accountId", v === "ALL" ? undefined : Number(v))}
              accounts={accounts}
              nullOption="全部"
              size="sm"
              className="h-9"
              showBalance={false}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">关键字</label>
            <Input
              className="h-9 text-xs"
              placeholder="搜索备注..."
              value={filters.keyword || ""}
              onChange={(e) => updateFilter("keyword", e.target.value || undefined)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">金额 ≥</label>
            <Input
              type="number"
              className="h-9 text-xs"
              placeholder="0"
              value={filters.amountMin ?? ""}
              onChange={(e) => updateFilter("amountMin", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">金额 ≤</label>
            <Input
              type="number"
              className="h-9 text-xs"
              placeholder="999999"
              value={filters.amountMax ?? ""}
              onChange={(e) => updateFilter("amountMax", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">排序</label>
            <div className="flex items-center gap-1">
              <Select value={filters.sortBy} onValueChange={(v) => setFilters((p) => ({ ...p, sortBy: v, page: 1 }))}>
                <SelectTrigger className="h-9 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateTime">时间</SelectItem>
                  <SelectItem value="amount">金额</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 shrink-0"
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    sortOrder: p.sortOrder === "asc" ? "desc" : "asc",
                    page: 1,
                  }))
                }
              >
                {filters.sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs flex-1"
              onClick={() => {
                setFilters({ page: 1, pageSize: 20, sortBy: "dateTime", sortOrder: "desc" } as TransactionSearchParams);
                setDateRange("");
              }}
            >
              重置
            </Button>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}
