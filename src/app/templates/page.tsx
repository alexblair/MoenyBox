"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  FolderPlus,
} from "lucide-react";
import { getTemplates, getCategories, getAccounts, createTemplate, updateTemplate, deleteTemplate } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/category-select";
import { AccountSelect } from "@/components/account-select";
import { toast } from "sonner";
import type { TransactionTemplate, Category, Account, TransactionType } from "@/types";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionTemplate | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "EXPENSE" as TransactionType,
    amount: "",
    categoryId: "",
    accountId: "",
    toAccountId: "",
    note: "",
    parentId: "",
    active: true,
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getTemplates().catch(() => []),
      getCategories().catch(() => []),
      getAccounts().catch(() => []),
    ])
      .then(([tmpls, cats, accts]) => {
        setTemplates(tmpls);
        setCategories(cats);
        setAccounts(accts);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = (parentId?: number) => {
    setEditing(null);
    setForm({
      name: "",
      type: "EXPENSE",
      amount: "",
      categoryId: "",
      accountId: accounts[0]?.id?.toString() || "",
      toAccountId: "",
      note: "",
      parentId: parentId?.toString() || "",
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (tmpl: TransactionTemplate) => {
    setEditing(tmpl);
    setForm({
      name: tmpl.name,
      type: tmpl.type,
      amount: String(tmpl.amount),
      categoryId: tmpl.categoryId?.toString() || "",
      accountId: tmpl.accountId.toString(),
      toAccountId: tmpl.toAccountId?.toString() || "",
      note: tmpl.note || "",
      parentId: tmpl.parentId?.toString() || "",
      active: tmpl.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("请输入模板名称"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("请输入有效金额"); return; }
    if (!form.accountId) { toast.error("请选择账户"); return; }

    try {
      const data: any = {
        name: form.name.trim(),
        type: form.type,
        amount: parseFloat(form.amount),
        accountId: Number(form.accountId),
        note: form.note || null,
        parentId: form.parentId ? Number(form.parentId) : null,
        active: form.active,
      };
      if (form.type !== "TRANSFER") {
        data.categoryId = form.categoryId ? Number(form.categoryId) : null;
      } else {
        data.toAccountId = form.toAccountId ? Number(form.toAccountId) : null;
      }

      if (editing) {
        await updateTemplate(editing.id, data);
        toast.success("模板已更新");
      } else {
        await createTemplate(data);
        toast.success("模板已创建");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (tmpl: TransactionTemplate) => {
    const msg = tmpl.children?.length
      ? `确定删除模板"${tmpl.name}"及其所有子模板吗？`
      : `确定删除模板"${tmpl.name}"吗？`;
    if (!confirm(msg)) return;
    try {
      await deleteTemplate(tmpl.id);
      toast.success("模板已删除");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleActive = async (tmpl: TransactionTemplate) => {
    try {
      await updateTemplate(tmpl.id, { active: !tmpl.active });
      toast.success(tmpl.active ? "模板已停用" : "模板已启用");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTemplates = showInactive
    ? templates
    : templates.filter((t) => t.active);

  const countChildren = (t: TransactionTemplate): number => (t.children?.length || 0);

  const typeIcon = (type: string) => {
    switch (type) {
      case "EXPENSE": return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case "INCOME": return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "TRANSFER": return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "EXPENSE": return "支出";
      case "INCOME": return "收入";
      case "TRANSFER": return "转账";
      default: return type;
    }
  };

  const renderTree = (items: TransactionTemplate[], depth = 0) => {
    return items.map((tmpl) => {
      const hasChildren = countChildren(tmpl) > 0;
      const isExpanded = expanded.has(tmpl.id);

      return (
        <div key={tmpl.id}>
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors ${
              !tmpl.active ? "opacity-50" : ""
            }`}
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            {hasChildren ? (
              <button onClick={() => toggleExpand(tmpl.id)} className="shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {typeIcon(tmpl.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{tmpl.name}</span>
                {!tmpl.active && <Badge variant="outline" className="text-[10px] h-4 px-1">已禁用</Badge>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {typeLabel(tmpl.type)} · {formatCurrency(tmpl.amount)}
                {tmpl.category && ` · ${tmpl.category.name}`}
                {tmpl.account && ` · ${tmpl.account.name}`}
              </div>
            </div>
            {tmpl.parentId === null && (
              <>
                {!showInactive && (
                  <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={() => openCreate(tmpl.id)} title="添加子模板">
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">{countChildren(tmpl)} 子</span>
              </>
            )}
            <button onClick={() => handleToggleActive(tmpl)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground" title={tmpl.active ? "停用" : "启用"}>
              {tmpl.active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
            </button>
            <button onClick={() => openEdit(tmpl)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => handleDelete(tmpl)} className="shrink-0 p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {hasChildren && isExpanded && renderTree(tmpl.children!, depth + 1)}
        </div>
      );
    });
  };

  const flatTemplates = (items: TransactionTemplate[]): TransactionTemplate[] => {
    const result: TransactionTemplate[] = [];
    const walk = (list: TransactionTemplate[]) => {
      for (const t of list) {
        result.push(t);
        if (t.children) walk(t.children);
      }
    };
    walk(items);
    return result;
  };

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">交易模板</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? "管理中" : "显示禁用"}
          </Button>
          <Button onClick={() => openCreate()} size="sm">
            <Plus className="mr-1 h-4 w-4" /> 添加模板
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        记账模板用于快速记录重复交易。在首页或交易页面可快速选择模板进行记账。
        {showInactive && "（当前显示所有模板，包括已禁用的）"}
      </p>

      {filteredTemplates.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {showInactive ? "暂无模板，点击上方按钮添加" : "暂无可用的活跃模板"}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">{renderTree(filteredTemplates)}</CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑模板" : "添加模板"}</DialogTitle>
            <DialogDescription>
              {editing ? "修改快速记账模板" : "创建一个新的快速记账模板"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>模板名称</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="例如：每日咖啡" />
            </div>

            <div>
              <Label>交易类型</Label>
              <Tabs value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as TransactionType, categoryId: "", toAccountId: "" }))}>
                <TabsList className="w-full mt-1">
                  <TabsTrigger value="EXPENSE" className="flex-1 gap-1 text-xs">
                    <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" /> 支出
                  </TabsTrigger>
                  <TabsTrigger value="INCOME" className="flex-1 gap-1 text-xs">
                    <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" /> 收入
                  </TabsTrigger>
                  <TabsTrigger value="TRANSFER" className="flex-1 gap-1 text-xs">
                    <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" /> 转账
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <Label>金额</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="mt-1" />
            </div>

            {form.type !== "TRANSFER" && (
              <div>
                <Label>分类</Label>
                <CategorySelect
                  value={form.categoryId}
                  onChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}
                  categories={categories}
                  filterByType={form.type as "INCOME" | "EXPENSE"}
                  nullOption="不设置"
                  nullValue=""
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>账户</Label>
              <AccountSelect
                value={form.accountId}
                onValueChange={(v) => setForm((p) => ({ ...p, accountId: v }))}
                accounts={accounts}
                placeholder="选择账户"
                showBalance={false}
                className="mt-1"
              />
            </div>

            {form.type === "TRANSFER" && (
              <div>
                <Label>到账户</Label>
                <AccountSelect
                  value={form.toAccountId}
                  onValueChange={(v) => setForm((p) => ({ ...p, toAccountId: v }))}
                  accounts={accounts.filter((a) => a.id !== Number(form.accountId))}
                  placeholder="选择目标账户"
                  showBalance={false}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>备注</Label>
              <Textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="备注（可选）" rows={2} className="mt-1" />
            </div>

            {!editing && (
              <div>
                <Label>父模板（可选）</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm((p) => ({ ...p, parentId: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="无（顶级模板）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无（顶级模板）</SelectItem>
                    {flatTemplates(templates).filter((t) => !t.parentId).map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? "保存" : "创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
