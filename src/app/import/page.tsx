"use client";

import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react";
import { Upload, FileText, ChevronDown, ChevronRight, RotateCcw, Check, X, AlertTriangle, Filter, GitFork, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RequirePermission } from "@/components/require-permission";
import { toast } from "sonner";
import { CategorySelect } from "@/components/category-select";
import type { Account, Category, ImportPreviewResponse, ImportRowPreview, RowFix, TransactionType } from "@/types";
import { exportCsvUrl } from "@/lib/api";

const ENCODINGS = [
  { value: "utf-8", label: "UTF-8" },
  { value: "gbk", label: "GBK" },
  { value: "gb2312", label: "GB2312" },
  { value: "shift-jis", label: "Shift-JIS" },
  { value: "euc-kr", label: "EUC-KR" },
  { value: "iso-2022-jp", label: "ISO-2022-JP" },
];

const SYSTEM_FIELDS = [
  { value: "amount", label: "金额" },
  { value: "dateTime", label: "日期时间" },
  { value: "note", label: "备注" },
  { value: "category", label: "分类" },
  { value: "type", label: "类型（收入/支出）" },
  { value: "account", label: "账户" },
  { value: "ignore", label: "忽略" },
];

interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
}

function detectEncoding(bytes: Uint8Array): string {
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return "utf-8";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(0, 4096));
    return "utf-8";
  } catch {
    return "gbk";
  }
}

function decodeText(bytes: Uint8Array, encoding: string): string {
  return new TextDecoder(encoding, { fatal: false }).decode(bytes);
}

function parseCsv(text: string, rowLimit?: number): { headers: string[]; rows: Record<string, string>[] } | null {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rawRows = rowLimit ? lines.slice(1, 1 + rowLimit) : lines.slice(1);
  const rows = rawRows.map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
  return { headers, rows };
}

function buildAutoMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  headers.forEach((h) => {
    const lower = h.toLowerCase();
    if (lower.includes("金额") || lower.includes("money") || lower.includes("amount")) mapping[h] = "amount";
    else if (lower.includes("时间") || lower.includes("日期") || lower.includes("time") || lower.includes("date")) mapping[h] = "dateTime";
    else if (lower.includes("备注") || lower.includes("note") || lower.includes("desc")) mapping[h] = "note";
    else if (lower.includes("分类") || lower.includes("类别") || lower.includes("category")) mapping[h] = "category";
    else if (lower.includes("类型") || lower.includes("type")) mapping[h] = "type";
    else if (lower.includes("账户") || lower.includes("account")) mapping[h] = "account";
    else mapping[h] = "ignore";
  });
  return mapping;
}

function findRowsWithoutAccount(allRows: Record<string, string>[], mapping: Record<string, string>): number[] {
  const accountColumn = Object.entries(mapping).find(([_, v]) => v === "account")?.[0];
  const result: number[] = [];
  allRows.forEach((row, i) => {
    if (!accountColumn || !row[accountColumn]?.trim()) result.push(i);
  });
  return result;
}

function getFieldSetValue(key: string): string {
  const map: Record<string, string> = {
    type: "类型（收入/支出）",
    amount: "金额",
    dateTime: "日期时间",
    note: "备注",
    category: "分类",
    account: "账户",
  };
  return map[key] || key;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null);
  const [csvText, setCsvText] = useState("");
  const [encoding, setEncoding] = useState("utf-8");
  const [detectedEnc, setDetectedEnc] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [allCsvRows, setAllCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [rowAccountOverrides, setRowAccountOverrides] = useState<Record<number, number>>({});
  const [accountMode, setAccountMode] = useState<"global" | "individual">("global");
  const [previewResult, setPreviewResult] = useState<ImportPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rowFixes, setRowFixes] = useState<Record<number, RowFix>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "valid" | "error" | "duplicate" | "rule">("all");
  const [batchFixValue, setBatchFixValue] = useState<RowFix>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<"import" | "export">("import");

  const [exportType, setExportType] = useState("ALL");
  const [exportCategoryId, setExportCategoryId] = useState("");
  const [exportAccountId, setExportAccountId] = useState("ALL");
  const [exportKeyword, setExportKeyword] = useState("");
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportAmountMin, setExportAmountMin] = useState("");
  const [exportAmountMax, setExportAmountMax] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()).catch(() => []),
      fetch("/api/categories").then((r) => r.json()).catch(() => []),
    ]).then(([accts, cats]) => {
      setAccounts(accts);
      setCategories(Array.isArray(cats) ? cats : (cats as { categories: Category[] }).categories || []);
    }).catch(() => {});
  }, []);

  const decodeAndParse = useCallback((bytes: Uint8Array, enc: string) => {
    const text = decodeText(bytes, enc);
    const p = parseCsv(text, 5);
    const all = parseCsv(text);
    return { text, preview: p, allRows: all?.rows ?? [] };
  }, []);

  const processFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".csv")) { toast.error("请选择 CSV 文件"); return; }
    setFile(f);
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    setRawBytes(bytes);
    const detected = detectEncoding(bytes);
    setDetectedEnc(detected);
    setEncoding(detected);
    const { text, preview: p, allRows: all } = decodeAndParse(bytes, detected);
    setCsvText(text);
    if (!p) { toast.error("CSV 文件内容不足"); return; }
    setPreview(p);
    setAllCsvRows(all);
    setMapping(buildAutoMapping(p.headers));
    setPreviewResult(null);
    setRowFixes({});
    setExpandedRows(new Set());
    setSelectedRows(new Set());
    setDefaultAccountId("");
    setRowAccountOverrides({});
    setAccountMode("global");
  }, [decodeAndParse]);

  const handleEncodingChange = (value: string) => {
    setEncoding(value);
    if (!rawBytes) return;
    const { text, preview: p, allRows: all } = decodeAndParse(rawBytes, value);
    setCsvText(text);
    if (p) {
      setPreview(p);
      setAllCsvRows(all);
      setPreviewResult(null);
      setRowFixes({});
      setExpandedRows(new Set());
      setSelectedRows(new Set());
      setRowAccountOverrides({});
    }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const handleMappingChange = (header: string, value: string) => {
    setMapping((prev) => ({ ...prev, [header]: value }));
    setPreviewResult(null);
    setRowAccountOverrides({});
  };

  const buildMappingArray = () =>
    Object.entries(mapping).filter(([_, v]) => v !== "ignore").map(([csvColumn, systemField]) => ({ csvColumn, systemField }));

  const rowsWithoutAccount = useMemo(() => findRowsWithoutAccount(allCsvRows, mapping), [allCsvRows, mapping]);
  const hasAccountMapping = Object.values(mapping).includes("account");
  const needsAccountConfig = !hasAccountMapping || rowsWithoutAccount.length > 0;

  const handlePreview = async () => {
    if (!csvText || buildMappingArray().length === 0) { toast.error("请先完成字段映射"); return; }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: csvText,
          mapping: buildMappingArray(),
          defaultAccountId: defaultAccountId ? Number(defaultAccountId) : undefined,
          rowAccountOverrides: Object.keys(rowAccountOverrides).length > 0 ? rowAccountOverrides : undefined,
          rowFixes: Object.keys(rowFixes).length > 0 ? rowFixes : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "预览失败");
      setPreviewResult(data);
      setSelectedRows(new Set(data.rows.filter((r: ImportRowPreview) => r.valid && !r.isDuplicate).map((r: ImportRowPreview) => r.rowNumber)));
      setExpandedRows(new Set());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (selectedRows.size === 0) { toast.error("请选择要导入的行"); return; }
    setImporting(true);
    try {
      const overrides = rowAccountOverrides;
      const filteredFixes: Record<number, RowFix> = {};
      for (const rowNum of selectedRows) {
        if (rowFixes[rowNum] && Object.keys(rowFixes[rowNum]).length > 0) {
          filteredFixes[rowNum] = rowFixes[rowNum];
        }
      }
      const res = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: csvText,
          mapping: buildMappingArray(),
          defaultAccountId: defaultAccountId ? Number(defaultAccountId) : undefined,
          rowAccountOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
          rowFixes: Object.keys(filteredFixes).length > 0 ? filteredFixes : undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "导入失败");
      if (result.success > 0) {
        toast.success(`导入成功 ${result.success} 条记录`);
        if (result.errors?.length > 0) {
          toast.error(`失败 ${result.errors.length} 条`, {
            description: result.errors.slice(0, 3).map((e: any) => `第${e.row}行: ${e.message}`).join("\n"),
          });
        }
        setFile(null);
        setRawBytes(null);
        setCsvText("");
        setPreview(null);
        setAllCsvRows([]);
        setMapping({});
        setPreviewResult(null);
        setRowFixes({});
        setExpandedRows(new Set());
        setSelectedRows(new Set());
        setDetectedEnc(null);
        setEncoding("utf-8");
        setDefaultAccountId("");
        setRowAccountOverrides({});
        setAccountMode("global");
      } else {
        const errMsg = result.errors?.[0]?.message || "没有数据被导入";
        toast.error(errMsg);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleExpand = (rowNum: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum); else next.add(rowNum);
      return next;
    });
  };

  const toggleSelect = (rowNum: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum); else next.add(rowNum);
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    if (!previewResult) return [];
    if (filter === "valid") return previewResult.rows.filter((r) => r.valid && !r.isDuplicate);
    if (filter === "error") return previewResult.rows.filter((r) => !r.valid);
    if (filter === "duplicate") return previewResult.rows.filter((r) => r.isDuplicate);
    if (filter === "rule") return previewResult.rows.filter((r) => r.ruleFixes && r.ruleFixes.length > 0);
    return previewResult.rows;
  }, [previewResult, filter]);

  const setFix = (rowNum: number, field: keyof RowFix, value: any) => {
    setRowFixes((prev) => {
      const next = { ...prev };
      if (!next[rowNum]) next[rowNum] = {};
      next[rowNum] = { ...next[rowNum], [field]: value };
      return next;
    });
  };

  const clearRowFix = (rowNum: number) => {
    setRowFixes((prev) => {
      const next = { ...prev };
      delete next[rowNum];
      return next;
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const handleBatchSetAccount = (accountId: string) => {
    if (!accountId) return;
    const id = Number(accountId);
    setRowAccountOverrides((prev) => {
      const next = { ...prev };
      selectedRows.forEach((idx) => { next[idx] = id; });
      return next;
    });
    setSelectedRows(new Set());
  };

  const selectAllProblemRows = () => { setSelectedRows(new Set(rowsWithoutAccount)); };

  const selectedErrorRows = useMemo(() => {
    if (!previewResult) return [];
    return previewResult.rows.filter((r) => selectedRows.has(r.rowNumber) && !r.valid);
  }, [previewResult, selectedRows]);

  const errorAggregates = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of selectedErrorRows) {
      const fields = new Set(row.errors.map((e) => e.field));
      for (const f of fields) counts[f] = (counts[f] || 0) + 1;
    }
    return counts;
  }, [selectedErrorRows]);

  const applyBatchFix = () => {
    const fix = batchFixValue;
    const hasFix = Object.keys(fix).length > 0;
    if (!hasFix) { toast.error("请先设置要批量修复的值"); return; }
    setRowFixes((prev) => {
      const next = { ...prev };
      for (const row of selectedErrorRows) {
        const existing: RowFix = next[row.rowNumber] ? { ...next[row.rowNumber] } : {};
        Object.assign(existing, fix);
        next[row.rowNumber] = existing;
      }
      return next;
    });
    setBatchFixValue({});
    toast.success(`已为 ${selectedErrorRows.length} 行设置修复`);
  };

  const handleExport = () => {
    window.open(exportCsvUrl({
      type: exportType !== "ALL" ? (exportType as TransactionType) : undefined,
      categoryId: exportCategoryId ? Number(exportCategoryId) : undefined,
      accountId: exportAccountId !== "ALL" ? Number(exportAccountId) : undefined,
      keyword: exportKeyword || undefined,
      dateFrom: exportDateFrom || undefined,
      dateTo: exportDateTo || undefined,
      amountMin: exportAmountMin ? Number(exportAmountMin) : undefined,
      amountMax: exportAmountMax ? Number(exportAmountMax) : undefined,
    }), "_blank");
  };

  const clearBatchFixRow = () => {
    for (const row of selectedErrorRows) {
      const fix = batchFixValue;
      if (Object.keys(fix).length === 0) {
        setRowFixes((prev) => {
          const next = { ...prev };
          delete next[row.rowNumber];
          return next;
        });
      }
    }
    setBatchFixValue({});
  };

  const formatRowPreview = (row: Record<string, string>, headers: string[]): string => {
    const interesting = ["金额", "时间", "日期", "备注", "分类", "类型", "amount", "date", "time", "note", "category", "type"];
    const parts: string[] = [];
    for (const h of headers) {
      const lower = h.toLowerCase();
      if (interesting.some((k) => lower.includes(k)) && row[h]?.trim()) {
        parts.push(`${h}: ${row[h]}`);
        if (parts.length >= 2) break;
      }
    }
    return parts.join(" | ") || "";
  };

  const typeOptions = [
    { value: "INCOME", label: "收入" },
    { value: "EXPENSE", label: "支出" },
  ];

  const renderFixPanel = (row: ImportRowPreview) => {
    const fix = rowFixes[row.rowNumber];
    return (
      <div className="p-3 bg-muted/30 border-t space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">修复字段</span>
          {fix && Object.keys(fix).length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => clearRowFix(row.rowNumber)}>
              清除修复
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {row.errors.find((e) => e.field === "type") && (
            <div>
              <Label className="text-xs">类型</Label>
              <Select value={fix?.type || ""} onValueChange={(v) => setFix(row.rowNumber, "type", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择类型" /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {row.errors.find((e) => e.field === "amount") && (
            <div>
              <Label className="text-xs">金额</Label>
              <Input
                type="number"
                step="0.01"
                className="h-8 text-xs"
                placeholder="输入金额"
                defaultValue={fix?.amount ?? row.parsed.amount ?? ""}
                onBlur={(e) => setFix(row.rowNumber, "amount", parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          {row.errors.find((e) => e.field === "dateTime") && (
            <div>
              <Label className="text-xs">日期时间</Label>
              <Input
                type="datetime-local"
                className="h-8 text-xs"
                defaultValue={fix?.dateTime ? fix.dateTime.slice(0, 16) : ""}
                onBlur={(e) => {
                  if (e.target.value) setFix(row.rowNumber, "dateTime", new Date(e.target.value).toISOString());
                }}
              />
            </div>
          )}
          {row.errors.find((e) => e.field === "category") && (
            <div>
              <Label className="text-xs">分类</Label>
              <CategorySelect
                value={fix?.categoryId ? String(fix.categoryId) : ""}
                onChange={(v) => setFix(row.rowNumber, "categoryId", Number(v))}
                categories={categories}
                placeholder="选择分类"
                size="sm"
              />
            </div>
          )}
          {row.errors.find((e) => e.field === "account") && (
            <div>
              <Label className="text-xs">账户</Label>
              <Select value={fix?.accountId ? String(fix.accountId) : ""} onValueChange={(v) => setFix(row.rowNumber, "accountId", Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择账户" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pt-4 space-y-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">CSV</h2>
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          <button onClick={() => setTab("import")}
            className={`px-2.5 py-1 text-sm rounded-sm transition-colors ${
              tab === "import" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}>导入</button>
          <button onClick={() => setTab("export")}
            className={`px-2.5 py-1 text-sm rounded-sm transition-colors ${
              tab === "export" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}>导出</button>
        </div>
      </div>

      {tab === "export" ? (
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-sm font-medium">导出条件</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">类型</label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部</SelectItem>
                    <SelectItem value="INCOME">收入</SelectItem>
                    <SelectItem value="EXPENSE">支出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">分类</label>
                <CategorySelect value={exportCategoryId} onChange={(v) => setExportCategoryId(v)}
                  categories={categories} nullOption="全部" nullValue="" size="sm" className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">账户</label>
                <Select value={exportAccountId} onValueChange={setExportAccountId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">关键字</label>
                <Input className="h-9 text-xs" placeholder="搜索备注..." value={exportKeyword}
                  onChange={(e) => setExportKeyword(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">开始日期</label>
                <Input type="date" className="h-9 text-xs" value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">结束日期</label>
                <Input type="date" className="h-9 text-xs" value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">金额 ≥</label>
                <Input type="number" className="h-9 text-xs" placeholder="0" value={exportAmountMin}
                  onChange={(e) => setExportAmountMin(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">金额 ≤</label>
                <Input type="number" className="h-9 text-xs" placeholder="999999" value={exportAmountMax}
                  onChange={(e) => setExportAmountMax(e.target.value)} />
              </div>
            </div>
            <RequirePermission permission="transaction.export">
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />导出 CSV
              </Button>
            </RequirePermission>
          </CardContent>
        </Card>
      ) : !preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          <Upload className="h-10 w-10" />
          <p className="text-sm">拖拽 CSV 文件到此处，或点击选择</p>
          <p className="text-xs text-muted-foreground">支持 .csv 格式</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={() => {
            setFile(null); setRawBytes(null); setCsvText(""); setPreview(null);
            setAllCsvRows([]); setMapping({}); setPreviewResult(null); setRowFixes({});
            setExpandedRows(new Set()); setSelectedRows(new Set()); setDetectedEnc(null);
            setEncoding("utf-8"); setDefaultAccountId(""); setRowAccountOverrides({}); setAccountMode("global");
          }}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />重新选择
          </Button>
        </div>

      <div className="flex items-center gap-2 flex-wrap">
        <FileText className="h-5 w-5" />
        <span className="text-sm font-medium">{file?.name}</span>
        <Badge variant="secondary" className="text-xs">{preview.headers.length} 列</Badge>
        <Badge variant="outline" className="text-xs">{encoding.toUpperCase()}</Badge>
        {detectedEnc && detectedEnc !== encoding && (
          <Badge variant="secondary" className="text-xs">建议: {detectedEnc.toUpperCase()}</Badge>
        )}
        <Badge variant="outline" className="text-xs">共 {allCsvRows.length} 行</Badge>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">字符编码</Label>
        <Select value={encoding} onValueChange={handleEncodingChange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENCODINGS.map((enc) => <SelectItem key={enc.value} value={enc.value}>{enc.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {detectedEnc && detectedEnc !== encoding && (
          <Button variant="ghost" size="sm" onClick={() => handleEncodingChange(detectedEnc)}>
            使用检测结果: {detectedEnc.toUpperCase()}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                {preview.headers.map((h) => (
                  <th key={h} className={`px-2 py-1 text-left font-medium whitespace-nowrap ${
                    (mapping[h] || "ignore") === "ignore" ? "text-muted-foreground/40 line-through" : "text-foreground"
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {preview.headers.map((h) => (
                    <td key={h} className={`px-2 py-1 truncate max-w-[120px] ${
                      (mapping[h] || "ignore") === "ignore" ? "text-muted-foreground/40" : ""
                    }`}>{row[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">字段映射</h3>
        {preview.headers.map((header) => {
          const isIgnored = (mapping[header] || "ignore") === "ignore";
          return (
            <div key={header} className={`flex items-center gap-2 p-1.5 rounded ${
              isIgnored ? "opacity-40" : "bg-primary/5"
            }`}>
              <span className={`w-28 text-sm truncate ${isIgnored ? "line-through text-muted-foreground" : ""}`}>{header}</span>
              <span className="text-muted-foreground">→</span>
              <Select value={mapping[header] || "ignore"} onValueChange={(v) => handleMappingChange(header, v)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {needsAccountConfig && accounts.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-medium">导入账户配置</h3>
            <p className="text-xs text-muted-foreground">
              {hasAccountMapping
                ? `以下 ${rowsWithoutAccount.length} 行 CSV 数据中未指定账户`
                : `未设置账户字段映射，所有 ${allCsvRows.length} 条记录将使用下方配置的账户`}
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="accountMode" checked={accountMode === "global"}
                  onChange={() => setAccountMode("global")} className="accent-primary" />
                统一设置一个账户
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="accountMode" checked={accountMode === "individual"}
                  onChange={() => setAccountMode("individual")} className="accent-primary" />
                逐行分别设置
              </label>
            </div>
            {accountMode === "global" ? (
              <div className="flex items-center gap-3">
                <Label className="text-sm whitespace-nowrap w-16">默认账户</Label>
                <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="请选择账户" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} ({a.type === "BANK" ? "银行卡" : a.type === "CREDIT_CARD" ? "信用卡" : "虚拟账户"}) {a.balance.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllProblemRows}>全选</Button>
                  <Select onValueChange={handleBatchSetAccount}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="批量设置所选行" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-1">
                  {rowsWithoutAccount.map((idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                      selectedRows.has(idx) ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}>
                      <input type="checkbox" checked={selectedRows.has(idx)}
                        onChange={() => toggleSelect(idx)} className="accent-primary" />
                      <span className="text-muted-foreground min-w-[3rem]">#{idx + 2}</span>
                      <span className="flex-1 truncate">{formatRowPreview(allCsvRows[idx], preview.headers)}</span>
                      <Select value={rowAccountOverrides[idx] ? String(rowAccountOverrides[idx]) : ""}
                        onValueChange={(v) => setRowAccountOverrides((prev) => ({ ...prev, [idx]: Number(v) }))}>
                        <SelectTrigger className="w-36 h-7 text-xs"><SelectValue placeholder="选择账户" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button onClick={handlePreview} disabled={previewLoading}>
        {previewLoading ? "验证中..." : previewResult ? "重新验证" : "生成预览"}
      </Button>

      {previewResult && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                共 {previewResult.total} 条
              </span>
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                <Check className="h-3 w-3 mr-0.5" />有效 {previewResult.validCount}
              </Badge>
              {previewResult.errorCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600 border-red-200">
                  <X className="h-3 w-3 mr-0.5" />异常 {previewResult.errorCount}
                </Badge>
              )}
              {(previewResult.duplicateCount ?? 0) > 0 && (
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />重复 {previewResult.duplicateCount}
                </Badge>
              )}
              {previewResult.rows.some((r) => r.ruleFixes && r.ruleFixes.length > 0) && (
                <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                  <GitFork className="h-3 w-3 mr-0.5" />规则 {previewResult.rows.filter((r) => r.ruleFixes && r.ruleFixes.length > 0).length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              {(["all", "valid", "error", "duplicate", "rule"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                    filter === f ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {f === "all" ? "全部" : f === "valid" ? "有效" : f === "error" ? "异常" : f === "duplicate" ? "重复" : "规则"}
                </button>
              ))}
            </div>
          </div>

          {selectedErrorRows.length > 1 && (
            <Card className="border-amber-200 bg-amber-500/5">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">批量修复</span>
                    <span className="text-xs text-muted-foreground">已选 {selectedErrorRows.length} 行</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs"
                    onClick={() => setBatchFixValue({})}>
                    清除
                  </Button>
                </div>
                {Object.keys(errorAggregates).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(errorAggregates).map(([field, count]) => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {getFieldSetValue(field)}: {count}行
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {(errorAggregates.type || selectedErrorRows.some((r) => r.errors.find((e) => e.field === "type"))) && (
                    <div>
                      <Label className="text-xs">类型</Label>
                      <Select value={batchFixValue.type || ""}
                        onValueChange={(v) => setBatchFixValue((prev) => ({ ...prev, type: v as "INCOME" | "EXPENSE" }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="批量设置类型" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">收入</SelectItem>
                          <SelectItem value="EXPENSE">支出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(errorAggregates.amount || selectedErrorRows.some((r) => r.errors.find((e) => e.field === "amount"))) && (
                    <div>
                      <Label className="text-xs">金额</Label>
                      <Input type="number" step="0.01" className="h-8 text-xs" placeholder="批量设置金额"
                        value={batchFixValue.amount ?? ""}
                        onChange={(e) => setBatchFixValue((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  )}
                  {(errorAggregates.dateTime || selectedErrorRows.some((r) => r.errors.find((e) => e.field === "dateTime"))) && (
                    <div>
                      <Label className="text-xs">日期时间</Label>
                      <Input type="datetime-local" className="h-8 text-xs"
                        value={batchFixValue.dateTime ? batchFixValue.dateTime.slice(0, 16) : ""}
                        onChange={(e) => e.target.value && setBatchFixValue((prev) => ({ ...prev, dateTime: new Date(e.target.value).toISOString() }))} />
                    </div>
                  )}
                  {(errorAggregates.category || selectedErrorRows.some((r) => r.errors.find((e) => e.field === "category"))) && (
                    <div>
                      <Label className="text-xs">分类</Label>
                      <CategorySelect
                        value={batchFixValue.categoryId ? String(batchFixValue.categoryId) : ""}
                        onChange={(v) => setBatchFixValue((prev) => ({ ...prev, categoryId: v ? Number(v) : undefined }))}
                        categories={categories}
                        placeholder="批量设置分类"
                        size="sm"
                      />
                    </div>
                  )}
                  {(errorAggregates.account || selectedErrorRows.some((r) => r.errors.find((e) => e.field === "account"))) && (
                    <div>
                      <Label className="text-xs">账户</Label>
                      <Select value={batchFixValue.accountId ? String(batchFixValue.accountId) : ""}
                        onValueChange={(v) => setBatchFixValue((prev) => ({ ...prev, accountId: Number(v) }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="批量设置账户" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={applyBatchFix}
                  disabled={Object.keys(batchFixValue).length === 0}>
                  应用批量修复
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-2 py-1.5 w-8">
                      <input type="checkbox"
                        checked={filteredRows.length > 0 && filteredRows.every((r) => selectedRows.has(r.rowNumber))}
                        onChange={() => {
                          const allSelected = filteredRows.every((r) => selectedRows.has(r.rowNumber));
                          setSelectedRows((prev) => {
                            const next = new Set(prev);
                            for (const r of filteredRows) {
                              if (allSelected) next.delete(r.rowNumber); else next.add(r.rowNumber);
                            }
                            return next;
                          });
                        }}
                        className="accent-primary" />
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-16">类型</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-20">金额</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">日期</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">分类</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">账户</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">备注</th>
                    <th className="px-2 py-1.5 text-center font-medium text-muted-foreground w-12">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const hasFixes = rowFixes[row.rowNumber] && Object.keys(rowFixes[row.rowNumber]).length > 0;
                    const errors = row.errors;
                    const isExpanded = expandedRows.has(row.rowNumber);
                    const hasErrors = !row.valid;
                    const isDuplicate = row.isDuplicate;
                    const hasRuleFixes = row.ruleFixes && row.ruleFixes.length > 0;
                    const isSelected = selectedRows.has(row.rowNumber);
                    const showExpand = hasErrors || isDuplicate || hasRuleFixes;
                    return (
                      <Fragment key={row.rowNumber}>
                        <tr className={`border-b last:border-0 ${
                          hasErrors ? "bg-red-500/5" : isDuplicate ? "bg-amber-500/5" : "hover:bg-muted/30"
                        }`}>
                          <td className="px-2 py-1.5">
                            <input type="checkbox" checked={isSelected}
                              onChange={() => toggleSelect(row.rowNumber)} className="accent-primary" />
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">{row.rowNumber}</td>
                          <td className="px-2 py-1.5">
                            {row.resolved.typeDisplay ? (
                              <span className={row.resolved.typeDisplay === "收入" ? "text-green-600" : "text-red-600"}>
                                {row.resolved.typeDisplay}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {row.resolved.amount != null ? row.resolved.amount.toFixed(2) : "-"}
                          </td>
                          <td className="px-2 py-1.5">{formatDate(row.resolved.dateTime)}</td>
                          <td className="px-2 py-1.5 max-w-[100px] truncate">
                            {row.resolved.category
                              ? (hasFixes && rowFixes[row.rowNumber].categoryId != null
                                ? <span className="text-green-600">{row.resolved.category.path}<Check className="h-3 w-3 inline ml-0.5" /></span>
                                : row.resolved.category.path)
                              : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-2 py-1.5 max-w-[100px] truncate">
                            {row.resolved.account
                              ? (hasFixes && rowFixes[row.rowNumber].accountId != null
                                ? <span className="text-green-600">{row.resolved.account.name}<Check className="h-3 w-3 inline ml-0.5" /></span>
                                : row.resolved.account.name)
                              : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-2 py-1.5 max-w-[80px] truncate text-muted-foreground">
                            {row.parsed.note || "-"}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-center gap-1">
                              {hasRuleFixes && (
                                <GitFork className="h-3 w-3 text-purple-500 shrink-0" />
                              )}
                              {row.valid && !isDuplicate ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : isDuplicate ? (
                                <button onClick={() => toggleExpand(row.rowNumber)}
                                  className="flex items-center gap-1 text-amber-500 hover:text-amber-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                              ) : (
                                <button onClick={() => toggleExpand(row.rowNumber)}
                                  className="flex items-center gap-1 text-red-500 hover:text-red-600">
                                  <X className="h-3 w-3" />
                                  <span className="text-xs">{errors.length}</span>
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && showExpand && (
                          <tr className="border-b bg-muted/10">
                            <td colSpan={9} className="p-3">
                              <div className="text-xs space-y-2">
                                <div className="font-medium text-muted-foreground mb-1">CSV 原始数据</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                                  {Object.entries(mapping).filter(([_, v]) => v !== "ignore").map(([csvCol, sysField]) => (
                                    <div key={csvCol} className="flex gap-1">
                                      <span className="text-muted-foreground shrink-0">{getFieldSetValue(sysField)}:</span>
                                      <span className={row.raw[csvCol] ? "" : "text-muted-foreground"}>{row.raw[csvCol] || "(空)"}</span>
                                    </div>
                                  ))}
                                </div>
                                {hasErrors && (
                                  <>
                                    <div className="border-t pt-2 mt-2">
                                      <div className="font-medium text-red-500 mb-1">错误信息</div>
                                      {errors.map((e, i) => (
                                        <div key={i} className="ml-1">
                                          <span className="font-medium">{getFieldSetValue(e.field)}</span>: {e.message}
                                        </div>
                                      ))}
                                    </div>
                                    {renderFixPanel(row)}
                                  </>
                                )}
                                {row.ruleFixes && row.ruleFixes.length > 0 && (
                                  <div className="border-t pt-2 mt-2">
                                    <div className="font-medium text-purple-600 mb-1">规则匹配结果</div>
                                    {row.ruleFixes.map((fix: RowFix, fi: number) => (
                                      <div key={fi} className="ml-1 text-xs space-y-0.5">
                                        {fix.type && <div>类型 → {fix.type === "INCOME" ? "收入" : "支出"}</div>}
                                        {fix.amount != null && <div>金额 → {fix.amount.toFixed(2)}</div>}
                                        {fix.dateTime && <div>时间 → {formatDate(fix.dateTime)}</div>}
                                        {fix.categoryId && <div>分类ID → {fix.categoryId}</div>}
                                        {fix.accountId && <div>账户ID → {fix.accountId}</div>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {isDuplicate && !hasErrors && (
                                  <div className="border-t pt-2 mt-2 text-amber-600">
                                    此记录与已有数据重复（时间+金额+类型完全相同），默认未选中。如需导入请勾选该行。
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={9} className="px-2 py-8 text-center text-muted-foreground text-sm">无可显示的记录</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

        </>
      )}

      {previewResult && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => {
            setPreviewResult(null); setRowFixes({}); setExpandedRows(new Set());
          }}>
            返回修改
          </Button>
          <RequirePermission permission="transaction.create">
            <Button className="flex-1" onClick={handleImport}
              disabled={importing || selectedRows.size === 0}>
              {importing ? "导入中..." : `导入选中 (${selectedRows.size})`}
            </Button>
          </RequirePermission>
        </div>
      )}
      </>)}
    </div>
  );
}
