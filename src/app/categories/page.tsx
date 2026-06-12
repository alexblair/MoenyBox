"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Paintbrush,
} from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory, batchDeleteCategories, initCategories, getDefaultInitCategories, exportCategoriesUrl } from "@/lib/api";
import { IconPicker } from "@/components/icon-picker";
import { CategoryBatchEditSheet } from "@/components/category-batch-edit-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Textarea,
} from "@/components/ui/textarea";
import { CategorySelect } from "@/components/category-select";
import { RequirePermission } from "@/components/require-permission";
import { toast } from "sonner";
import type { Category } from "@/types";

const COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("0");
  const [icon, setIcon] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [initData, setInitData] = useState("");
  const [initImporting, setInitImporting] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    getCategories()
      .then((data) => {
        setCategories(data);
        setExpanded(new Set(data.map((c) => c.id)));
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setParentId("0");
    setIcon("");
    setNote("");
    setColor("");
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setParentId(cat.parentId?.toString() || "0");
    setIcon(cat.icon || "");
    setNote(cat.note || "");
    setColor(cat.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("请输入分类名称"); return; }
    try {
      const payload: any = { name: name.trim(), parentId: parentId === "0" ? null : Number(parentId) };
      if (icon.trim()) payload.icon = icon.trim();
      payload.note = note.trim() || null;
      if (color) payload.color = color;
      if (editing) {
        await updateCategory(editing.id, payload);
        toast.success("分类已更新");
      } else {
        await createCategory(payload);
        toast.success("分类已创建");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`确定删除分类"${cat.name}"吗？`)) return;
    try {
      await deleteCategory(cat.id);
      toast.success("分类已删除");
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

  const countChildren = (cat: Category): number => (cat.children?.length || 0);

  const collectAllIds = (items: Category[]): number[] => {
    const ids: number[] = [];
    for (const item of items) {
      ids.push(item.id);
      if (item.children) ids.push(...collectAllIds(item.children));
    }
    return ids;
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
    const allIds = collectAllIds(categories);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) { toast.error("请先选择要删除的分类"); return; }
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个分类吗？`)) return;
    try {
      const result = await batchDeleteCategories(Array.from(selectedIds));
      if (result.deleted.length > 0) {
        toast.success(`成功删除 ${result.deleted.length} 个分类`);
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
      const defaults = await getDefaultInitCategories();
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
      const result = await initCategories(data as { name: string; parentName?: string | null; color?: string }[]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInitData(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const renderTree = (items: Category[], depth = 0) => {
    return items.map((cat) => {
      const hasChildren = countChildren(cat) > 0;
      const isExpanded = expanded.has(cat.id);

      return (
        <div key={cat.id}>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            <Checkbox
              checked={selectedIds.has(cat.id)}
              onCheckedChange={() => toggleSelect(cat.id)}
            />
            {hasChildren ? (
              <button onClick={() => toggleExpand(cat.id)} className="shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {cat.icon ? (
              <span className="shrink-0 text-base">{cat.icon}</span>
            ) : (
              <span
                className="flex h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            )}
            <span className="flex-1 text-sm truncate">{cat.name}</span>
            {cat.note && (
              <span className="hidden sm:inline-block max-w-[160px] truncate text-xs text-muted-foreground/60 ml-2">
                {cat.note}
              </span>
            )}
            {cat.parentId === null && <Badge variant="secondary" className="text-xs shrink-0">{countChildren(cat)} 子类</Badge>}
            <RequirePermission permission="account.manage">
              <button onClick={() => openEdit(cat)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </RequirePermission>
            <RequirePermission permission="account.manage">
              <button onClick={() => handleDelete(cat)} className="shrink-0 p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </RequirePermission>
          </div>
          {hasChildren && isExpanded && renderTree(cat.children!, depth + 1)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  const allIds = collectAllIds(categories);

  return (
    <div className="pt-4 space-y-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">分类管理</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={exportCategoriesUrl()} download>
              <Download className="mr-1 h-4 w-4" /> 导出
            </a>
          </Button>
          <RequirePermission permission="account.manage">
            <Button variant="outline" size="sm" onClick={openInitDialog}>
              <Upload className="mr-1 h-4 w-4" /> 初始化
            </Button>
          </RequirePermission>
          {selectedIds.size > 0 && (
            <>
              <RequirePermission permission="account.manage">
                <Button variant="outline" size="sm" onClick={() => setBatchEditOpen(true)}>
                  <Paintbrush className="mr-1 h-4 w-4" /> 批量编辑 ({selectedIds.size})
                </Button>
              </RequirePermission>
              <RequirePermission permission="account.manage">
                <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                  <Trash2 className="mr-1 h-4 w-4" /> 批量删除 ({selectedIds.size})
                </Button>
              </RequirePermission>
            </>
          )}
          <RequirePermission permission="account.manage">
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-1 h-4 w-4" /> 添加分类
            </Button>
          </RequirePermission>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">暂无分类，点击上方按钮添加</div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Checkbox
              checked={allIds.length > 0 && selectedIds.size === allIds.length}
              onCheckedChange={toggleAll}
            />
            <span>{selectedIds.size > 0 ? `已选 ${selectedIds.size} / ${allIds.length}` : "全选"}</span>
          </div>
          <Card>
            <CardContent className="p-2">{renderTree(categories)}</CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑分类" : "添加分类"}</DialogTitle>
            <DialogDescription>
              {editing ? "修改分类信息" : "创建新的交易分类"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>分类名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：餐饮" />
            </div>
            <div>
              <Label>父分类</Label>
              <CategorySelect
                value={parentId}
                onChange={setParentId}
                categories={categories}
                nullOption="无（顶级分类）"
                nullValue="0"
                excludeId={editing?.id}
              />
            </div>
            <div>
              <Label>图标（可选，优先于颜色）</Label>
              <div className="flex items-center gap-2 mt-1">
                <IconPicker value={icon} onChange={setIcon} />
                {icon && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIcon("")}>
                    清除
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>备注（可选）</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="分类的补充说明" />
            </div>
            <div>
              <Label>颜色（可选，留空则继承父分类或随机）</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setColor("")}
                  className={`h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold ${
                    !color ? "border-foreground scale-110" : "border-transparent text-muted-foreground"
                  }`}
                >
                  Auto
                </button>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
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
            <DialogTitle>初始化分类数据</DialogTitle>
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

      <CategoryBatchEditSheet
        open={batchEditOpen}
        onOpenChange={setBatchEditOpen}
        selectedIds={selectedIds}
        categories={categories}
        onComplete={load}
      />
    </div>
  );
}
