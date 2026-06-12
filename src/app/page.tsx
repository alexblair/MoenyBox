"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  PlusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getAccounts, getTransactions, getActiveTemplates, getDashboardCharts } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Account, Transaction, TransactionTemplate, DashboardCharts } from "@/types";

function ChartGuard({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.offsetWidth > 0 && el.offsetHeight > 0) { setReady(true); return; }
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) { setReady(true); ro.disconnect(); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref} className={className}>{ready ? children : null}</div>;
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [tmplSheetOpen, setTmplSheetOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getAccounts(),
      getTransactions({ pageSize: 5, sortBy: "dateTime", sortOrder: "desc" }),
      getActiveTemplates().catch(() => []),
      getDashboardCharts().catch(() => null),
    ])
      .then(([accts, txnRes, tmpls, chartData]) => {
        setAccounts(accts);
        setRecentTransactions(txnRes.data);
        setTemplates(tmpls);
        setCharts(chartData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTxns = recentTransactions.filter(
    (t) => t.dateTime?.startsWith(currentMonth)
  );
  const monthIncome = thisMonthTxns
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTxns
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 md:pt-0">
      {/* Top summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">总资产</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">本月支出</p>
            <p className="text-lg font-semibold text-red-500">{formatCurrency(monthExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">本月收入</p>
            <p className="text-lg font-semibold text-green-500">{formatCurrency(monthIncome)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <Link
          href="/transactions/new?type=EXPENSE"
          className="flex flex-col items-center gap-1 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-950 md:p-4"
        >
          <ArrowDownCircle className="h-6 w-6" />
          <span className="text-xs">支出</span>
        </Link>
        <Link
          href="/transactions/new?type=INCOME"
          className="flex flex-col items-center gap-1 rounded-lg bg-green-50 p-3 text-green-600 dark:bg-green-950 md:p-4"
        >
          <ArrowUpCircle className="h-6 w-6" />
          <span className="text-xs">收入</span>
        </Link>
        <Link
          href="/transactions/new?type=TRANSFER"
          className="flex flex-col items-center gap-1 rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950 md:p-4"
        >
          <ArrowLeftRight className="h-6 w-6" />
          <span className="text-xs">转账</span>
        </Link>
        {templates.length > 0 && (
          <button
            onClick={() => setTmplSheetOpen(true)}
            className="flex flex-col items-center gap-1 rounded-lg bg-purple-50 p-3 text-purple-600 dark:bg-purple-950 md:p-4"
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs">模板</span>
          </button>
        )}
      </div>

      {/* Charts section */}
      {charts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">月度收支趋势</h3>
              <ChartGuard className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthlySummary}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="income" fill="#22c55e" name="收入" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" name="支出" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartGuard>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">本月支出分类</h3>
              <ChartGuard className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.categoryBreakdown}
                      dataKey="amount"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      label={({ categoryName, percentage }: any) =>
                        `${categoryName} ${percentage}%`
                      }
                      labelLine={false}
                    >
                      {charts.categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartGuard>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template quick-entry sheet */}
      <Sheet open={tmplSheetOpen} onOpenChange={setTmplSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>快速记账模板</SheetTitle>
            <SheetDescription>选择模板快速跳转记账</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-1">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">暂无可用模板</p>
            ) : (
              (() => {
                const renderTree = (items: TransactionTemplate[], depth = 0): React.ReactNode => {
                  return items.map((tmpl) => {
                    const hasChildren = tmpl.children && tmpl.children.length > 0;
                    return (
                      <div key={tmpl.id}>
                        <Link
                          href={`/transactions/new?templateId=${tmpl.id}`}
                          onClick={() => setTmplSheetOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
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
                        </Link>
                        {hasChildren && renderTree(tmpl.children!, depth + 1)}
                      </div>
                    );
                  });
                };
                return renderTree(templates);
              })()
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: two-column layout for transactions + accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">最近交易</h2>
          {recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无交易记录</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((txn) => (
                <Link key={txn.id} href={`/transactions/${txn.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {txn.category?.name || (txn.type === "TRANSFER" ? "转账" : "未分类")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(txn.dateTime, "datetime")}
                            {txn.account && ` · ${txn.account.name}`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          txn.type === "EXPENSE"
                            ? "text-red-500"
                            : txn.type === "INCOME"
                              ? "text-green-500"
                              : "text-blue-500"
                        }`}
                      >
                        {txn.type === "EXPENSE" ? "-" : txn.type === "INCOME" ? "+" : ""}
                        {formatCurrency(Number(txn.amount))}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">账户余额</h2>
          <div className="grid grid-cols-1 gap-2">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {account.type === "BANK" ? "银行" : account.type === "CREDIT_CARD" ? "信用卡" : "虚拟"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{account.name}</p>
                  <p className={`text-sm font-semibold ${Number(account.balance) >= 0 ? "text-green-600" : "text-gray-400"}`}>
                    {formatCurrency(Number(account.balance))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}
