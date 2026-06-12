"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { batchUpdateCategories } from "@/lib/api";
import { IconPicker } from "@/components/icon-picker";
import type { Category } from "@/types";

const COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
  "#14b8a6", "#d946ef", "#0ea5e9", "#84cc16", "#f43f5e",
];

interface CategoryBatchEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<number>;
  categories: Category[];
  onComplete: () => void;
}

export function CategoryBatchEditSheet({
  open,
  onOpenChange,
  selectedIds,
  categories,
  onComplete,
}: CategoryBatchEditSheetProps) {
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [changeIcon, setChangeIcon] = useState(false);
  const [changeColor, setChangeColor] = useState(false);
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [updating, setUpdating] = useState(false);

  const selectedCats = categories.filter((c) => selectedIds.has(c.id));

  const handlePreview = () => {
    if (!changeIcon && !changeColor) {
      toast.error("请勾选要修改的字段");
      return;
    }
    if (changeColor && !color) {
      toast.error("请选择颜色");
      return;
    }
    setStep("confirm");
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const data: { icon?: string; color?: string } = {};
      if (changeIcon) data.icon = icon;
      if (changeColor) data.color = color;
      const result = await batchUpdateCategories(Array.from(selectedIds), data);
      toast.success(`已更新 ${result.count} 个分类`);
      onOpenChange(false);
      onComplete();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep("edit");
      setChangeIcon(false);
      setChangeColor(false);
      setIcon("");
      setColor("");
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex flex-col sm:max-w-xl">
        {step === "edit" ? (
          <>
            <SheetHeader className="shrink-0">
              <SheetTitle>批量编辑 {selectedIds.size} 个分类</SheetTitle>
              <SheetDescription>选择要修改的字段，统一应用到所有选中分类</SheetDescription>
            </SheetHeader>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="space-y-5 py-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Checkbox
                      id="change-icon"
                      checked={changeIcon}
                      onCheckedChange={(v) => setChangeIcon(!!v)}
                    />
                    <Label htmlFor="change-icon" className="text-sm font-medium cursor-pointer">修改图标</Label>
                  </div>
                  {changeIcon && (
                    <div className="ml-0 sm:ml-7">
                      <IconPicker value={icon} onChange={setIcon} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Checkbox
                      id="change-color"
                      checked={changeColor}
                      onCheckedChange={(v) => setChangeColor(!!v)}
                    />
                    <Label htmlFor="change-color" className="text-sm font-medium cursor-pointer">修改颜色</Label>
                  </div>
                  {changeColor && (
                    <div className="flex flex-wrap gap-2 ml-0 sm:ml-7">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`h-7 w-7 rounded-full border-2 transition-all ${
                            color === c ? "border-foreground scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <SheetFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
              <Button variant="outline" onClick={() => handleClose(false)} className="w-full sm:w-auto">取消</Button>
              <Button onClick={handlePreview} className="w-full sm:w-auto">预览修改</Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader className="shrink-0">
              <SheetTitle>确认修改</SheetTitle>
              <SheetDescription>请确认以下修改内容</SheetDescription>
            </SheetHeader>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="py-4 space-y-3">
                <p className="text-sm font-medium">
                  将以下修改应用到 <span className="text-primary">{selectedIds.size}</span> 个分类：
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {changeIcon && (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">
                      图标: {icon}
                    </Badge>
                  )}
                  {changeColor && (
                    <Badge variant="outline" className="border-purple-200 text-purple-700 text-xs flex items-center gap-1">
                      颜色: <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {selectedCats.map((cat) => (
                    <div key={cat.id} className="text-xs p-2 bg-muted/40 rounded border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        {cat.icon ? <span>{cat.icon}</span> : <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />}
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <div className="space-y-0.5">
                        {changeIcon && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">图标:</span>
                            <span className="line-through text-destructive/50">{cat.icon || "无"}</span>
                            <ArrowRight className="h-3 w-3 mx-0.5 inline text-muted-foreground" />
                            <span className="text-blue-600">{icon}</span>
                          </div>
                        )}
                        {changeColor && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">颜色:</span>
                            <span className="line-through text-destructive/50">
                              <span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: cat.color }} />
                            </span>
                            <ArrowRight className="h-3 w-3 mx-0.5 inline text-muted-foreground" />
                            <span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: color }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
              <Button variant="outline" onClick={() => setStep("edit")} className="w-full sm:w-auto">返回修改</Button>
              <Button onClick={handleUpdate} disabled={updating} className="w-full sm:w-auto">
                {updating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                确认应用
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
