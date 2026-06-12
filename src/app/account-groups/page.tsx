"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Edit2, Trash2, FolderOpen, Palette, Hash,
} from "lucide-react";
import {
  getAccountGroups, createAccountGroup, updateAccountGroup, deleteAccountGroup,
} from "@/lib/api";
import { getAccounts } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { RequirePermission } from "@/components/require-permission";
import { toast } from "sonner";
import type { AccountGroup, Account } from "@/types";

const ICON_OPTIONS = [
  { value: "folder-open", label: "文件夹", icon: FolderOpen },
  { value: "palette", label: "调色板", icon: Palette },
  { value: "hash", label: "井号", icon: Hash },
];

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export default function AccountGroupsPage() {
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccountGroup | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("folder-open");
  const [color, setColor] = useState("#6366f1");
  const [sortOrder, setSortOrder] = useState("0");
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getAccountGroups(), getAccounts()])
      .then(([g, a]) => {
        setGroups(g);
        setAccounts(a);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setIcon("folder-open");
    setColor("#6366f1");
    setSortOrder("0");
    setSelectedAccountIds(new Set());
    setDialogOpen(true);
  };

  const openEdit = (g: AccountGroup) => {
    setEditing(g);
    setName(g.name);
    setDescription(g.description || "");
    setIcon(g.icon || "folder-open");
    setColor(g.color);
    setSortOrder(g.sortOrder.toString());
    setSelectedAccountIds(new Set((g.members || []).map((m) => m.accountId)));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("请输入分组名称"); return; }
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        sortOrder: parseInt(sortOrder) || 0,
        memberIds: Array.from(selectedAccountIds),
      };
      if (editing) {
        await updateAccountGroup(editing.id, data);
        toast.success("分组已更新");
      } else {
        await createAccountGroup(data);
        toast.success("分组已创建");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (g: AccountGroup) => {
    if (!confirm(`确定删除分组"${g.name}"吗？（不会删除账户）`)) return;
    try {
      await deleteAccountGroup(g.id);
      toast.success("分组已删除");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleAccount = (id: number) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
        <h2 className="text-lg font-semibold">账户分组管理</h2>
        <RequirePermission permission="account_group.manage">
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> 添加分组
          </Button>
        </RequirePermission>
      </div>

      {groups.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">暂无分组，点击上方按钮添加</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((g) => (
            <Card key={g.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: g.color + "20", color: g.color }}
                  >
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      {g.archived && <Badge variant="outline" className="text-xs">已归档</Badge>}
                    </div>
                    {g.description && (
                      <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.members?.length || 0} 个账户
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <RequirePermission permission="account_group.manage">
                      <button onClick={() => openEdit(g)} className="p-1.5 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </RequirePermission>
                    <RequirePermission permission="account_group.manage">
                      <button onClick={() => handleDelete(g)} className="p-1.5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </RequirePermission>
                  </div>
                </div>

                {g.members && g.members.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {g.members.map((m) => (
                      <Badge key={m.accountId} variant="secondary" className="text-xs">
                        {m.account?.name || `#${m.accountId}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑分组" : "添加分组"}</DialogTitle>
            <DialogDescription>
              {editing ? "修改账户分组信息" : "创建新的账户分组"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>分组名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：日常消费" />
            </div>
            <div>
              <Label>描述</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选描述" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>图标</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>排序</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>颜色</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>包含账户</Label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {accounts.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccountIds.has(a.id)}
                      onChange={() => toggleAccount(a.id)}
                      className="h-4 w-4"
                    />
                    {a.name}
                  </label>
                ))}
                {accounts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    暂无可用账户，请先创建账户
                  </p>
                )}
              </div>
            </div>
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
