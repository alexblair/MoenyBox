"use client";

import { useState, useEffect, Fragment } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical, AlertTriangle, Info, Clock } from "lucide-react";
import { CategorySelect } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types";


interface Condition {
  id?: number;
  field: string;
  operator: string;
  value: string;
}

interface Action {
  id?: number;
  field: string;
  value: string;
}

interface Rule {
  id?: number;
  name: string;
  description: string;
  conditionMode: "ALL" | "ANY";
  sortOrder: number;
  active: boolean;
  conditions: Condition[];
  actions: Action[];
}

interface RuleGroup {
  id?: number;
  name: string;
  description: string;
  mode: "ALL" | "ANY";
  sortOrder: number;
  active: boolean;
  scenarios: string[];
  rules: Rule[];
}

const FIELDS = [
  { value: "type", label: "类型" },
  { value: "amount", label: "金额" },
  { value: "note", label: "备注" },
  { value: "categoryId", label: "分类" },
  { value: "accountId", label: "账户" },
];

const CONDITION_OPERATORS = [
  { value: "EQUALS", label: "等于" },
  { value: "NOT_EQUALS", label: "不等于" },
  { value: "CONTAINS", label: "包含" },
  { value: "STARTS_WITH", label: "开头是" },
  { value: "ENDS_WITH", label: "结尾是" },
  { value: "GREATER_THAN", label: "大于" },
  { value: "LESS_THAN", label: "小于" },
];

const ACTION_FIELDS = [
  { value: "type", label: "类型" },
  { value: "amount", label: "金额" },
  { value: "dateTime", label: "日期时间" },
  { value: "categoryId", label: "分类" },
  { value: "accountId", label: "账户" },
  { value: "note", label: "备注" },
];

function defaultRule(): Rule {
  return { name: "", description: "", conditionMode: "ALL", sortOrder: 0, active: true, conditions: [{ field: "note", operator: "CONTAINS", value: "" }], actions: [{ field: "categoryId", value: "" }] };
}

function defaultGroup(): RuleGroup {
  return { name: "", description: "", mode: "ALL", sortOrder: 0, active: true, scenarios: ["IMPORT", "MANUAL"], rules: [defaultRule()] };
}

function RuleEditor({ rule, onChange, onDelete, categories, accounts }: { rule: Rule; onChange: (r: Rule) => void; onDelete: () => void; categories: Category[]; accounts: { id: number; name: string }[] }) {

  const addCondition = () => onChange({ ...rule, conditions: [...rule.conditions, { field: "note", operator: "CONTAINS", value: "" }] });
  const updateCondition = (i: number, c: Condition) => {
    const next = [...rule.conditions]; next[i] = c; onChange({ ...rule, conditions: next });
  };
  const removeCondition = (i: number) => onChange({ ...rule, conditions: rule.conditions.filter((_, idx) => idx !== i) });
  const addAction = () => onChange({ ...rule, actions: [...rule.actions, { field: "categoryId", value: "" }] });
  const updateAction = (i: number, a: Action) => {
    const next = [...rule.actions]; next[i] = a; onChange({ ...rule, actions: next });
  };
  const removeAction = (i: number) => onChange({ ...rule, actions: rule.actions.filter((_, idx) => idx !== i) });

  return (
    <Card className="border-l-4 border-l-primary/40">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Input className="h-8 text-sm flex-1" placeholder="规则名称" value={rule.name}
            onChange={(e) => onChange({ ...rule, name: e.target.value })} />
          <div className="flex items-center gap-1">
            <Select value={rule.conditionMode} onValueChange={(v) => onChange({ ...rule, conditionMode: v as "ALL" | "ANY" })}>
              <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL</SelectItem>
                <SelectItem value="ANY">ANY</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" className="text-xs space-y-2 w-64">
                <p><strong>ALL (全部匹配)</strong> — 规则内<strong>所有</strong>条件都必须满足，才执行动作。</p>
                <p>适用于：需要多个字段同时匹配才修正，例如金额&gt;100 且备注包含「餐饮」。</p>
                <p><strong>ANY (任一匹配)</strong> — 规则内<strong>任一</strong>条件满足即执行动作。</p>
                <p>适用于：多个条件任意一个命中就修正，例如备注包含「超市」或备注包含「便利店」。</p>
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">条件</Label>
          {rule.conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Select value={cond.field} onValueChange={(v) => updateCondition(i, { ...cond, field: v })}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={cond.operator} onValueChange={(v) => updateCondition(i, { ...cond, operator: v })}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITION_OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="h-7 text-xs flex-1" placeholder="值" value={cond.value}
                onChange={(e) => updateCondition(i, { ...cond, value: e.target.value })} />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                onClick={() => removeCondition(i)} disabled={rule.conditions.length <= 1}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addCondition}>+ 添加条件</Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">动作</Label>
          {rule.actions.map((action, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Select value={action.field} onValueChange={(v) => updateAction(i, { ...action, field: v })}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">→</span>
              {action.field === "type" ? (
                <Select value={action.value} onValueChange={(v) => updateAction(i, { ...action, value: v })}>
                  <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="选择类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">收入</SelectItem>
                    <SelectItem value="EXPENSE">支出</SelectItem>
                  </SelectContent>
                </Select>
              ) : action.field === "categoryId" ? (
                <CategorySelect
                  value={action.value}
                  onChange={(v) => updateAction(i, { ...action, value: v })}
                  categories={categories}
                  size="sm"
                />
              ) : action.field === "accountId" ? (
                <Select value={action.value} onValueChange={(v) => updateAction(i, { ...action, value: v })}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="选择账户" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : action.field === "dateTime" ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input type="datetime-local" className="h-7 text-xs flex-1" value={action.value}
                    onChange={(e) => updateAction(i, { ...action, value: e.target.value })} />
                  <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground p-1"
                    title="设为当前时间"
                    onClick={() => {
                      const now = new Date();
                      const pad = (n: number) => String(n).padStart(2, "0");
                      const val = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                      updateAction(i, { ...action, value: val });
                    }}>
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : action.field === "note" ? (
                <div className="flex-1 space-y-0.5">
                  <Input className="h-7 text-xs w-full" placeholder='例: 餐饮-${原值}' value={action.value}
                    onChange={(e) => updateAction(i, { ...action, value: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground">使用 <code className="bg-muted px-1 rounded">${"${原值}"}</code> 保留原备注中对应部分</p>
                </div>
              ) : (
                <Input className="h-7 text-xs flex-1" placeholder="值" value={action.value}
                  onChange={(e) => updateAction(i, { ...action, value: e.target.value })} />
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                onClick={() => removeAction(i)} disabled={rule.actions.length <= 1}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addAction}>+ 添加动作</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RulesPage() {
  const [groups, setGroups] = useState<RuleGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<RuleGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showHistorical, setShowHistorical] = useState(false);
  const [histAll, setHistAll] = useState(false);
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [histPreview, setHistPreview] = useState<{ applied: number; fixes: Record<number, any[]>; details: { id: number; note: string | null; amount: number; type: string; dateTime: string | null; categoryName: string | null; accountName: string | null; changes: { field: string; from: string; to: string }[] }[] } | null>(null);
  const [histApplying, setHistApplying] = useState(false);
  const [histPreviewLoading, setHistPreviewLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => { loadGroups(); loadCategories(); loadAccounts(); }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch (_) {}
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts(await res.json());
    } catch (_) {}
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rules/groups");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingGroup) return;
    if (!editingGroup.name.trim()) { toast.error("请输入规则组名称"); return; }
    try {
      const method = editingGroup.id ? "PUT" : "POST";
      const url = editingGroup.id ? `/api/rules/groups/${editingGroup.id}` : "/api/rules/groups";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingGroup),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editingGroup.id ? "规则组已更新" : "规则组已创建");
      setEditingGroup(null);
      loadGroups();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此规则组？")) return;
    try {
      const res = await fetch(`/api/rules/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("规则组已删除");
      loadGroups();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleGroup = (id: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="pt-4 space-y-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">规则引擎</h2>
        <Button size="sm" onClick={() => setEditingGroup(defaultGroup())}>
          <Plus className="h-4 w-4 mr-1" />新建规则组
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        规则引擎可在导入或编辑时自动匹配交易并应用修正。
        规则组 <strong>ALL</strong> = 组内所有规则必须全部匹配；<strong>ANY</strong> = 组内任一规则匹配即可。
        规则内条件同理：<strong>ALL</strong> = 所有条件满足；<strong>ANY</strong> = 任一条件满足。
        使用场景定义该规则组在 <strong>CSV导入</strong> 和/或 <strong>手工操作</strong> 时是否生效。
      </p>

      {!editingGroup && (
        <>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHistorical(!showHistorical)}>
              <AlertTriangle className="h-4 w-4 mr-1" />应用到历史
            </Button>
          </div>

          {showHistorical && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-medium">批量应用到历史交易</h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" className="accent-primary" checked={histAll}
                      onChange={(e) => { setHistAll(e.target.checked); setHistPreview(null); }} />
                    全部历史
                  </label>
                  <div className={`flex items-center gap-3 ${histAll ? "opacity-40 pointer-events-none" : ""}`}>
                    <div>
                      <Label className="text-xs">起始日期</Label>
                      <Input type="date" className="h-8 text-sm" value={histDateFrom}
                        onChange={(e) => { setHistDateFrom(e.target.value); setHistPreview(null); }} />
                    </div>
                    <div>
                      <Label className="text-xs">结束日期</Label>
                      <Input type="date" className="h-8 text-sm" value={histDateTo}
                        onChange={(e) => { setHistDateTo(e.target.value); setHistPreview(null); }} />
                    </div>
                  </div>
                  <Button size="sm" className="mt-5" disabled={(!histAll && !histDateFrom) || histPreviewLoading}
                    onClick={async () => {
                      setHistPreviewLoading(true);
                      setHistPreview(null);
                      try {
                        const body: any = { action: "preview" };
                        if (histAll) body.allHistory = true;
                        else { body.dateFrom = histDateFrom; body.dateTo = histDateTo || undefined; }
                        const res = await fetch("/api/rules/apply-batch", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(body),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);
                        setHistPreview(data);
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setHistPreviewLoading(false);
                      }
                    }}>
                    {histPreviewLoading ? "预览中..." : "预览"}
                  </Button>
                </div>

                {histPreview && (
                  <div className="space-y-3">
                    <div className="text-sm">
                      匹配 <strong>{histPreview.applied}</strong> 条交易
                    </div>

                    {histPreview.details.length > 0 && (
                      <div className="border rounded-md overflow-x-auto max-h-64 overflow-y-auto text-xs">
                        <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-x-3 gap-y-1 p-2 bg-muted/50 font-medium text-muted-foreground border-b">
                          <div>备注</div>
                          <div>金额</div>
                          <div>类型</div>
                          <div>变更</div>
                        </div>
                        {histPreview.details.map((tx) => (
                          <div key={tx.id} className="grid grid-cols-[1fr_auto_auto_1fr] gap-x-3 gap-y-1 p-2 border-b last:border-0 items-start">
                            <div className="truncate max-w-[160px]" title={tx.note || ""}>
                              {tx.note || <span className="text-muted-foreground">-</span>}
                            </div>
                            <div className="whitespace-nowrap">{tx.amount}</div>
                            <div className="whitespace-nowrap">{tx.type}</div>
                            <div className="flex flex-col gap-0.5">
                              {tx.changes.map((c, i) => (
                                <span key={i} className="whitespace-nowrap">
                                  {c.field}: <span className="text-muted-foreground line-through">{c.from}</span>
                                  <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
                                  <span className="text-primary font-medium">{c.to}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {histPreview.applied > 0 && histPreview.details.length > 0 && (
                      <Button size="sm" disabled={histApplying}
                        onClick={async () => {
                          setHistApplying(true);
                          try {
                            const res = await fetch("/api/rules/apply-batch", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "apply", fixes: histPreview.fixes, ...(histAll ? { allHistory: true } : { dateFrom: histDateFrom, dateTo: histDateTo || undefined }) }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            toast.success(`已应用 ${data.count} 条修正`);
                            setHistPreview(null);
                            setShowHistorical(false);
                            setHistDateFrom("");
                            setHistDateTo("");
                          } catch (e: any) {
                            toast.error(e.message);
                          } finally {
                            setHistApplying(false);
                          }
                        }}>
                        {histApplying ? "应用中..." : `确认应用 (${histPreview.applied} 条)`}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {editingGroup && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{editingGroup.id ? "编辑规则组" : "新建规则组"}</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingGroup(null)}>取消</Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs">名称</Label>
                <Input className="h-8 text-sm" placeholder="规则组名称" value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">模式</Label>
                <div className="flex items-center gap-1">
                  <Select value={editingGroup.mode}
                    onValueChange={(v) => setEditingGroup({ ...editingGroup, mode: v as "ALL" | "ANY" })}>
                    <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">ALL</SelectItem>
                      <SelectItem value="ANY">ANY</SelectItem>
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="text-xs space-y-2 w-64">
                      <p><strong>ALL (全部匹配)</strong> — 组内<strong>所有</strong>规则必须都匹配，才会执行动作。</p>
                       <p>适用于：需要同时满足多个条件组合才修正的场景，例如备注包含「餐饮」且金额&gt;100。</p>
                      <p><strong>ANY (任一匹配)</strong> — 组内<strong>任一</strong>规则匹配即可执行对应的动作。</p>
                      <p>适用于：多个独立规则各自匹配不同场景，例如备注包含「超市」→分类设为食品，或金额&gt;500→分类设为大额。</p>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">描述</Label>
              <Input className="h-8 text-sm" placeholder="可选描述" value={editingGroup.description}
                onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">使用场景</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-primary" checked={editingGroup.scenarios.includes("IMPORT")}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...editingGroup.scenarios, "IMPORT"]
                        : editingGroup.scenarios.filter((s) => s !== "IMPORT");
                      setEditingGroup({ ...editingGroup, scenarios: next });
                    }} />
                  CSV导入时
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-primary" checked={editingGroup.scenarios.includes("MANUAL")}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...editingGroup.scenarios, "MANUAL"]
                        : editingGroup.scenarios.filter((s) => s !== "MANUAL");
                      setEditingGroup({ ...editingGroup, scenarios: next });
                    }} />
                  手工操作时
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">规则列表</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => setEditingGroup({ ...editingGroup, rules: [...editingGroup.rules, defaultRule()] })}>
                  + 添加规则
                </Button>
              </div>
              {editingGroup.rules.map((rule, i) => (
                <RuleEditor key={i} rule={rule} categories={categories} accounts={accounts}
                  onChange={(r) => {
                    const next = [...editingGroup.rules]; next[i] = r;
                    setEditingGroup({ ...editingGroup, rules: next });
                  }}
                  onDelete={() => {
                    if (editingGroup.rules.length <= 1) { toast.error("至少保留一条规则"); return; }
                    setEditingGroup({ ...editingGroup, rules: editingGroup.rules.filter((_, idx) => idx !== i) });
                  }} />
              ))}
            </div>

            <Button onClick={handleSave} disabled={!editingGroup.name.trim()}>
              {editingGroup.id ? "更新规则组" : "创建规则组"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-8">加载中...</div>
      ) : groups.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          暂无规则组，点击上方 「新建规则组」 开始
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => group.id && toggleGroup(group.id)} className="shrink-0">
                      {expandedGroups.has(group.id!) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{group.name}</span>
                      {group.description && (
                        <span className="text-xs text-muted-foreground ml-2">{group.description}</span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">{group.mode}</Badge>
                    <Badge variant="secondary" className="text-xs">{group.rules.length} 条规则</Badge>
                    {group.scenarios?.includes?.("IMPORT") ? (
                      <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">导入</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">非导入</Badge>
                    )}
                    {group.scenarios?.includes?.("MANUAL") ? (
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20">手工</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">非手工</Badge>
                    )}
                    {!group.active && <Badge variant="outline" className="text-xs text-muted-foreground">已禁用</Badge>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => setEditingGroup({ ...group })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                      onClick={() => group.id && handleDelete(group.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {expandedGroups.has(group.id!) && (
                  <div className="mt-2 space-y-2 pl-6">
                    {group.rules.map((rule, i) => (
                      <div key={i} className="text-xs border-l-2 border-muted pl-3 py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.name || "未命名规则"}</span>
                          <Badge variant="outline" className="text-xs">{rule.conditionMode}</Badge>
                          {!rule.active && <span className="text-muted-foreground">已禁用</span>}
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {rule.conditions.length} 个条件 → {rule.actions.length} 个动作
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
