"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { getNetWorthTrend, getIncomeExpense, getCategoryBreakdown, getMonthlySummary } from "@/lib/api";
import type { NetWorthPoint, IncomeExpensePoint, CategoryBreakdownItem, MonthlySummaryItem } from "@/types";

function getDefaultDateRange() {
  const now = new Date();
  const to = now.toISOString().slice(0, 7);
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 7);
  return { from, to };
}

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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("income-expense");

  return (
    <div className="space-y-4 pt-4 md:pt-0">
      <h1 className="text-2xl font-bold">报表统计</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="income-expense" className="flex-1">收支报表</TabsTrigger>
          <TabsTrigger value="net-worth" className="flex-1">净资产趋势</TabsTrigger>
          <TabsTrigger value="category" className="flex-1">分类分析</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">月度汇总</TabsTrigger>
        </TabsList>

        <TabsContent value="income-expense">
          <IncomeExpenseTab />
        </TabsContent>
        <TabsContent value="net-worth">
          <NetWorthTab />
        </TabsContent>
        <TabsContent value="category">
          <CategoryTab />
        </TabsContent>
        <TabsContent value="monthly">
          <MonthlyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IncomeExpenseTab() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [data, setData] = useState<IncomeExpensePoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getIncomeExpense(dateRange.from, dateRange.to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">收支趋势</CardTitle>
        <div className="flex gap-2">
          <input
            type="month"
            value={dateRange.from}
            onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
            className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
          <span className="self-center text-sm text-muted-foreground">至</span>
          <input
            type="month"
            value={dateRange.to}
            onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
            className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : data && data.length > 0 ? (
          <ChartGuard className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无数据</p>
        )}
      </CardContent>
    </Card>
  );
}

function NetWorthTab() {
  const [data, setData] = useState<NetWorthPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 7);
    const from = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 7);
    setLoading(true);
    getNetWorthTrend(from, to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">净资产走势（近12个月）</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : data && data.length > 0 ? (
          <ChartGuard className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="净资产"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartGuard>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无数据</p>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryTab() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [data, setData] = useState<CategoryBreakdownItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCategoryBreakdown(dateRange.from, dateRange.to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">支出分类分析</CardTitle>
        <div className="flex gap-2">
          <input
            type="month"
            value={dateRange.from}
            onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
            className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
          <span className="self-center text-sm text-muted-foreground">至</span>
          <input
            type="month"
            value={dateRange.to}
            onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
            className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : data && data.length > 0 ? (
          <div className="flex flex-col items-center">
            <ChartGuard className="h-64 w-full max-w-md">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ categoryName, percentage }: any) =>
                      `${categoryName} ${percentage}%`
                    }
                    labelLine={false}
                  >
                    {data.map((entry, i) => (
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
            <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-2">
              {data.map((item) => (
                <div key={item.categoryName} className="flex items-center gap-2 text-sm">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.categoryName}</span>
                  <span className="ml-auto text-muted-foreground">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无数据</p>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<MonthlySummaryItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMonthlySummary(year)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">月度汇总</CardTitle>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left font-medium">月份</th>
                  <th className="py-2 text-right font-medium">收入</th>
                  <th className="py-2 text-right font-medium">支出</th>
                  <th className="py-2 text-right font-medium">结余</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={item.month} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{monthNames[i]}</td>
                    <td className="py-2.5 text-right text-green-600">
                      {formatCurrency(item.income)}
                    </td>
                    <td className="py-2.5 text-right text-red-500">
                      {formatCurrency(item.expense)}
                    </td>
                    <td className="py-2.5 text-right font-semibold">
                      <span className={item.netDelta >= 0 ? "text-green-600" : "text-red-500"}>
                        {item.netDelta >= 0 ? "+" : ""}
                        {formatCurrency(item.netDelta)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无数据</p>
        )}
      </CardContent>
    </Card>
  );
}
