"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getUserGroup, updateUserGroup, getGroupPermissions, createGroupPermission, deleteGroupPermission } from "@/lib/api";
import type { UserGroup, GroupPermission, AccountPermissionId } from "@/types";
import { ACCOUNT_PERMISSIONS } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, Shield, UserIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function UserGroupDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { id } = params;
  const router = useRouter();
  const [group, setGroup] = useState<UserGroup | null>(null);
  const [permissions, setPermissions] = useState<GroupPermission[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [g, perms] = await Promise.all([
        getUserGroup(Number(id)),
        getGroupPermissions({ userGroupId: Number(id) }),
      ]);
      setGroup(g);
      setPermissions(perms);
    } catch (e: any) {
      toast.error("加载失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function isGranted(permId: AccountPermissionId): boolean {
    return permissions.some((p) => p.permission === permId && p.granted);
  }

  async function togglePermission(permId: AccountPermissionId, granted: boolean) {
    if (granted) {
      try {
        await createGroupPermission({ userGroupId: Number(id), permission: permId, granted: true });
        toast.success("权限已添加");
        load();
      } catch (e: any) {
        toast.error(e.message);
      }
    } else {
      const target = permissions.find((p) => p.permission === permId);
      if (target) {
        try {
          await deleteGroupPermission(target.id);
          toast.success("权限已移除");
          load();
        } catch (e: any) {
          toast.error(e.message);
        }
      }
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  if (!group) {
    return <div className="text-center py-12 text-muted-foreground">用户组不存在</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/user-groups">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: group.color + "20" }}>
              <Users className="h-4 w-4" style={{ color: group.color }} />
            </div>
            {group.name}
          </h2>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserIcon className="h-4 w-4" /> 成员 ({group.members?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!group.members || group.members.length === 0) ? (
            <p className="text-sm text-muted-foreground">暂无成员</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.members.map((m) => (
                <Badge key={m.userId} variant="secondary">{m.user?.name ?? `#${m.userId}`}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> 权限配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            分配权限给该用户组。用户组中的所有用户将继承这些权限。
          </p>
          <div className="space-y-3">
            {ACCOUNT_PERMISSIONS.map((perm) => (
              <div key={perm.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors">
                <div>
                  <Label htmlFor={`perm-${perm.id}`} className="cursor-pointer font-medium">
                    {perm.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
                <Switch
                  id={`perm-${perm.id}`}
                  checked={isGranted(perm.id)}
                  onCheckedChange={(checked: boolean) => togglePermission(perm.id, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
