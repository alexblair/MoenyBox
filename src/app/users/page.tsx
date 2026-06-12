"use client";

import { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser, clearUserData, importDemoData } from "@/lib/api";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, User as UserIcon, Mail, ShieldCheck, ShieldX, Trash, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordEmpty, setPasswordEmpty] = useState(false);
  const [clearConfirm, setClearConfirm] = useState<number | null>(null);
  const [importing, setImporting] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e: any) {
      toast.error("加载用户失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setPasswordEmpty(false);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email ?? "");
    setPassword("");
    setPasswordEmpty(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("请输入用户名称"); return; }
    try {
      if (editingUser) {
        const payload: any = { name: name.trim(), email: email.trim() || null };
        if (passwordEmpty) {
          payload.password = null;
        } else if (password) {
          payload.password = password;
        }
        await updateUser(editingUser.id, payload);
        toast.success("用户已更新");
      } else {
        const payload: any = { name: name.trim(), email: email.trim() || undefined };
        if (password) payload.password = password;
        await createUser(payload);
        toast.success("用户已创建");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleToggleActive(user: User) {
    try {
      await updateUser(user.id, { active: !user.active });
      toast.success(user.active ? "用户已停用" : "用户已启用");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteUser(id);
      toast.success("用户已删除");
      setDeleteConfirm(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="用户管理" description="管理系统用户和账户">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> 添加用户
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "编辑用户" : "添加用户"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium">名称</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="用户名称" />
              </div>
              <div>
                <label className="text-sm font-medium">邮箱</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" type="email" />
              </div>
              <div>
                <label className="text-sm font-medium">{editingUser ? "新密码（留空不修改）" : "密码"}</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingUser ? "留空则不修改密码" : "设置登录密码"} type="password" disabled={passwordEmpty} />
              </div>
              {editingUser && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={passwordEmpty} onChange={(e) => { setPasswordEmpty(e.target.checked); if (e.target.checked) setPassword(""); }} />
                  设置密码为空
                </label>
              )}
              <Button onClick={handleSave} className="w-full">
                {editingUser ? "保存更改" : "创建用户"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无用户，请添加</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className={user.active ? "" : "opacity-60"}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{user.name}</span>
                    {user.active ? (
                      <Badge variant="default" className="bg-green-500 text-white text-xs">启用</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">停用</Badge>
                    )}
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3" /> {user.email}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleToggleActive(user)} title={user.active ? "停用" : "启用"}>
                    {user.active ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setClearConfirm(user.id)} title="清空全部数据">
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={async () => { setImporting(user.id); try { const r = await importDemoData(user.id); toast.success(`导入完成: ${r.accounts} 账户, ${r.categories} 分类, ${r.transactions} 交易`); } catch (e: any) { toast.error("导入失败: " + e.message); } finally { setImporting(null); } }} disabled={importing === user.id} title="导入DEMO数据">
                    <Upload className={`h-4 w-4 ${importing === user.id ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(user.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确定要删除该用户吗？此操作不可撤销。</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>删除</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear data confirmation */}
      <Dialog open={clearConfirm !== null} onOpenChange={(open) => { if (!open) setClearConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认清空数据</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确定要清空该用户的全部数据吗？包括所有账户、分类、交易记录、规则和附件，且密码将重置为空。此操作不可撤销。</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClearConfirm(null)}>取消</Button>
            <Button variant="destructive" onClick={async () => { if (clearConfirm === null) return; try { await clearUserData(clearConfirm); toast.success("数据已清空"); load(); } catch (e: any) { toast.error("清空失败: " + e.message); } finally { setClearConfirm(null); } }}>清空数据</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
