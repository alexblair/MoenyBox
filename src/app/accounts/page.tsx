"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Edit2, Trash2, Building2, CreditCard, Wallet, Upload, Download,
  ChevronDown, ChevronRight, Archive, RotateCcw,
} from "lucide-react";
import { getAccounts, getAccountGroups, createAccount, updateAccount, deleteAccount, archiveAccount, unarchiveAccount, batchDeleteAccounts, initAccounts, getDefaultInitAccounts, exportAccountsUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Textarea,
} from "@/components/ui/textarea";
import { RequirePermission } from "@/components/require-permission";
import { toast } from "sonner";
import type { Account, AccountType, AccountGroup } from "@/types";

const ACCOUNT_ICONS: Record<AccountType, typeof Building2> = {
  BANK: Building2,
  CREDIT_CARD: CreditCard,
  VIRTUAL: Wallet,
};

const ACCOUNT_LABELS: Record<AccountType, string> = {
  BANK: "银行账户",
  CREDIT_CARD: "信用卡",
  VIRTUAL: "虚拟账户",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [initData, setInitData] = useState("");
  const [initImporting, setInitImporting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [archivedCollapsed, setArchivedCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getAccounts(), getAccountGroups()])
      .then(([a, g]) => {
        setAccounts(a);
        setGroups(g);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setType("BANK");
    setBalance("");
    setCurrency("CNY");
    setDialogOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setCurrency(acc.currency);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("请输入账户名称"); return; }
    try {
      const data = { name: name.trim(), type, balance: parseFloat(balance) || 0, currency };
      if (editing) {
        await updateAccount(editing.id, data);
        toast.success("账户已更新");
      } else {
        await createAccount(data);
        toast.success("账户已创建");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (acc: Account) => {
    if (!confirm(`确定删除账户"${acc.name}"吗？`)) return;
    try {
      await deleteAccount(acc.id);
      toast.success("账户已删除");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleArchive = async (acc: Account) => {
    if (!confirm(`确定归档账户"${acc.name}"吗？归档后账户将隐藏。`)) return;
    try {
      await archiveAccount(acc.id);
      toast.success("账户已归档");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnarchive = async (acc: Account) => {
    try {
      await unarchiveAccount(acc.id);
      toast.success("账户已恢复");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === accounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map((a) => a.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) { toast.error("请先选择要删除的账户"); return; }
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个账户吗？`)) return;
    try {
      const result = await batchDeleteAccounts(Array.from(selectedIds));
      if (result.deleted.length > 0) {
        toast.success(`成功删除 ${result.deleted.length} 个账户`);
      }
      if (result.failed.length > 0) {
        for (const f of result.failed) {
          toast.error(f.reason);
        }
      }
      setSelectedIds(new Set());
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openInitDialog = async () => {
    try {
      const defaults = await getDefaultInitAccounts();
      setInitData(JSON.stringify(defaults, null, 2));
    } catch {
      setInitData("");
    }
    setInitDialogOpen(true);
  };

  const handleInit = async () => {
    let data: unknown[];
    try {
      data = JSON.parse(initData);
      if (!Array.isArray(data)) throw new Error("数据必须是数组格式");
    } catch {
      toast.error("JSON 格式错误，请输入有效的 JSON 数组");
      return;
    }
    setInitImporting(true);
    try {
      const result = await initAccounts(data as { name: string; type?: string; balance?: number; currency?: string }[]);
      toast.success(`初始化完成：新建 ${result.created} 个，跳过 ${result.skipped} 个`);
      setInitDialogOpen(false);
      setInitData("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setInitImporting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith(".json")) {
      toast.error("请拖入 JSON 文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInitData(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const toggleGroup = (groupId: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const accountGroupMap = new Map<number, AccountGroup>();
  for (const g of groups) {
    if (g.archived) continue;
    for (const m of g.members || []) {
      accountGroupMap.set(m.accountId, g);
    }
  }

  const groupedAccounts = new Map<string, Account[]>();
  const ungrouped: Account[] = [];
  const archivedAccounts: Account[] = [];
  for (const acc of accounts) {
    if (acc.archived) {
      archivedAccounts.push(acc);
      continue;
    }
    const grp = accountGroupMap.get(acc.id);
    if (grp) {
      const key = `group-${grp.id}`;
      if (!groupedAccounts.has(key)) groupedAccounts.set(key, []);
      groupedAccounts.get(key)!.push(acc);
    } else {
      ungrouped.push(acc);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInitData(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const renderAccountCard = (acc: Account) => {
    const Icon = ACCOUNT_ICONS[acc.type];
    const bal = Number(acc.balance);
    const isArchived = acc.archived;
    return (
      <Card key={acc.id} className={`transition-colors ${isArchived ? "opacity-60" : "hover:bg-accent/50"}`}>
        <CardContent className="flex items-center gap-3 p-4">
          {!isArchived && (
            <Checkbox
              checked={selectedIds.has(acc.id)}
              onCheckedChange={() => toggleSelect(acc.id)}
            />
          )}
          {isArchived && <div className="w-10" />}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium truncate ${isArchived ? "line-through" : ""}`}>{acc.name}</p>
              <Badge variant="outline" className="text-xs shrink-0">
                {ACCOUNT_LABELS[acc.type]}
              </Badge>
            </div>
            <p className={`text-sm font-semibold ${isArchived ? "italic text-muted-foreground" : bal >= 0 ? "text-green-600" : "text-gray-400"}`}>
              {formatCurrency(bal, acc.currency)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <RequirePermission permission="account.manage">
              <button onClick={() => openEdit(acc)} className="p-1.5 text-muted-foreground hover:text-foreground">
                <Edit2 className="h-4 w-4" />
              </button>
            </RequirePermission>
            {isArchived ? (
              <button onClick={() => handleUnarchive(acc)} className="p-1.5 text-muted-foreground hover:text-foreground" title="恢复账户">
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button onClick={() => handleArchive(acc)} className="p-1.5 text-muted-foreground hover:text-foreground" title="归档账户">
                  <Archive className="h-4 w-4" />
                </button>
                <RequirePermission permission="account.delete">
                  <button onClick={() => handleDelete(acc)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </RequirePermission>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">账户管理</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={exportAccountsUrl()} download>
              <Download className="mr-1 h-4 w-4" /> 导出
            </a>
          </Button>
          <RequirePermission permission="account.manage">
            <Button variant="outline" size="sm" onClick={openInitDialog}>
              <Upload className="mr-1 h-4 w-4" /> 初始化
            </Button>
          </RequirePermission>
          {selectedIds.size > 0 && (
            <RequirePermission permission="account.delete">
              <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                <Trash2 className="mr-1 h-4 w-4" /> 批量删除 ({selectedIds.size})
              </Button>
            </RequirePermission>
          )}
          <RequirePermission permission="account.manage">
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-1 h-4 w-4" /> 添加账户
            </Button>
          </RequirePermission>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">暂无账户，点击上方按钮添加</div>
      ) : (
        <div className="space-y-4">
          {groups.filter((g) => !g.archived && groupedAccounts.has(`group-${g.id}`)).map((g) => {
            const grpAccounts = groupedAccounts.get(`group-${g.id}`) || [];
            const collapsed = collapsedGroups.has(g.id);
            return (
              <div key={g.id}>
                <button
                  onClick={() => toggleGroup(g.id)}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm font-medium">{g.name}</span>
                  <Badge variant="secondary" className="text-xs ml-1">{grpAccounts.length}</Badge>
                </button>
                {!collapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {grpAccounts.map((acc) => renderAccountCard(acc))}
                  </div>
                )}
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">未分组</span>
                <Badge variant="secondary" className="text-xs">{ungrouped.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ungrouped.map((acc) => renderAccountCard(acc))}
              </div>
            </div>
          )}
          {archivedAccounts.length > 0 && (
            <div>
              <button
                onClick={() => setArchivedCollapsed(!archivedCollapsed)}
                className="flex items-center gap-2 w-full text-left mb-2"
              >
                {archivedCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">已归档</span>
                <Badge variant="secondary" className="text-xs">{archivedAccounts.length}</Badge>
              </button>
              {!archivedCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {archivedAccounts.map((acc) => renderAccountCard(acc))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={accounts.length > 0 && selectedIds.size === accounts.length}
          onCheckedChange={toggleAll}
        />
        <span>{selectedIds.size > 0 ? `已选 ${selectedIds.size} / ${accounts.length}` : "全选"}</span>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑账户" : "添加账户"}</DialogTitle>
            <DialogDescription>
              {editing ? "修改账户信息" : "创建新的账户"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>账户名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：建设银行" />
            </div>
            <div>
              <Label>账户类型</Label>
              <Select value={type} onValueChange={(v: AccountType) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">银行账户</SelectItem>
                  <SelectItem value="CREDIT_CARD">信用卡</SelectItem>
                  <SelectItem value="VIRTUAL">虚拟账户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>余额</Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>币种</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY 人民币</SelectItem>
                  <SelectItem value="USD">USD 美元</SelectItem>
                  <SelectItem value="EUR">EUR 欧元</SelectItem>
                  <SelectItem value="JPY">JPY 日元</SelectItem>
                  <SelectItem value="HKD">HKD 港币</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? "保存" : "创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>初始化账户数据</DialogTitle>
            <DialogDescription>
              默认填充了系统预设数据。已存在的名称会自动跳过，不会重复导入。
              支持拖入 .json 文件或点击下方按钮选择文件。
            </DialogDescription>
          </DialogHeader>
          <div
            className="relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute right-2 top-2 z-10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-3 w-3" /> 选择文件
            </Button>
            <Textarea
              className="min-h-[250px] font-mono text-sm"
              value={initData}
              onChange={(e) => setInitData(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setInitDialogOpen(false); setInitData(""); }}>
              取消
            </Button>
            <Button onClick={handleInit} disabled={initImporting}>
              {initImporting ? "导入中..." : "导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
