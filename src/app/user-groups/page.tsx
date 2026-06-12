"use client";

import { useEffect, useState } from "react";
import { getUsers, getUserGroups, createUserGroup, updateUserGroup, deleteUserGroup } from "@/lib/api";
import type { User, UserGroup } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserIcon,
  Shield,
  FolderOpen,
  Palette,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

const ICONS = ["folder-open", "palette", "hash", "settings", "users"];
const COLORS = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#6b7280"];

export default function UserGroupsPage() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("users");
  const [color, setColor] = useState("#6366f1");
  const [sortOrder, setSortOrder] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedTab, setSelectedTab] = useState("members");

  async function load() {
    setLoading(true);
    try {
      const [g, u] = await Promise.all([getUserGroups(), getUsers()]);
      setGroups(g);
      setUsers(u);
    } catch (e: any) {
      toast.error("加载失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingGroup(null);
    setName("");
    setDescription("");
    setIcon("users");
    setColor("#6366f1");
    setSortOrder(0);
    setSelectedMembers([]);
    setDialogOpen(true);
  }

  function openEdit(group: UserGroup) {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description ?? "");
    setIcon(group.icon ?? "users");
    setColor(group.color);
    setSortOrder(group.sortOrder);
    setSelectedMembers(group.members?.map((m) => m.userId) ?? []);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("请输入名称"); return; }
    try {
      if (editingGroup) {
        await updateUserGroup(editingGroup.id, {
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          sortOrder,
          memberIds: selectedMembers,
        });
        toast.success("用户组已更新");
      } else {
        await createUserGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          color,
          sortOrder,
          memberIds: selectedMembers,
        });
        toast.success("用户组已创建");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteUserGroup(id);
      toast.success("用户组已删除");
      setDeleteConfirm(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function toggleMember(userId: number) {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="用户组管理" description="管理用户组及其权限">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> 添加用户组
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "编辑用户组" : "添加用户组"}</DialogTitle>
            </DialogHeader>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">基本信息</TabsTrigger>
                <TabsTrigger value="members" className="flex-1">成员</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium">名称</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="组名称" />
                </div>
                <div>
                  <label className="text-sm font-medium">描述</label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选描述" />
                </div>
                <div>
                  <label className="text-sm font-medium">图标</label>
                  <div className="flex gap-2 mt-1">
                    {ICONS.map((ic) => (
                      <button
                        key={ic}
                        onClick={() => setIcon(ic)}
                        className={`p-2 rounded-md border ${icon === ic ? "border-primary bg-primary/10" : "border-border"}`}
                      >
                        {ic === "folder-open" ? <FolderOpen className="h-4 w-4" /> :
                         ic === "palette" ? <Palette className="h-4 w-4" /> :
                         ic === "hash" ? <span className="text-sm font-bold">#</span> :
                         ic === "settings" ? <Shield className="h-4 w-4" /> :
                         <Users className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">颜色</label>
                  <div className="flex gap-2 mt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className="h-7 w-7 rounded-full border-2"
                        style={{ backgroundColor: c, borderColor: color === c ? "#000" : "transparent" }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">排序</label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
                </div>
              </TabsContent>
              <TabsContent value="members" className="space-y-2 py-2 max-h-80 overflow-y-auto">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">暂无用户，请先创建用户</div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                        id={`user-${user.id}`}
                      />
                      <Label htmlFor={`user-${user.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <UserIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>{user.name}</span>
                        {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                      </Label>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="w-full mt-2">
              {editingGroup ? "保存更改" : "创建用户组"}
            </Button>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无用户组，请添加</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: group.color + "20" }}
                    >
                      <Users className="h-5 w-5" style={{ color: group.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/user-groups/${group.id}`}>
                        <Shield className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(group)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(group.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>{group.members?.length ?? 0} 个成员</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.members?.map((m) => (
                    <Badge key={m.userId} variant="secondary" className="text-xs">
                      {m.user?.name ?? `#${m.userId}`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除该用户组及其权限配置吗？此操作不可撤销。
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
