"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import * as Tooltip from "@/components/ui/tooltip";
import type { Category } from "@/types";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  placeholder?: string;
  nullOption?: string;
  nullValue?: string;
  excludeId?: number;
  filterByType?: "INCOME" | "EXPENSE";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
  align?: "start" | "center" | "end";
}

function flatten(cats: Category[], excludeId?: number) {
  const result: (Category & { _depth: number })[] = [];
  const walk = (list: Category[], depth = 0) => {
    for (const c of list) {
      if (c.id === excludeId) { if (c.children) walk(c.children, depth + 1); continue; }
      result.push({ ...c, _depth: depth });
      if (c.children) walk(c.children, depth + 1);
    }
  };
  walk(cats);
  return result;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  placeholder = "选择分类",
  nullOption,
  nullValue = "",
  excludeId,
  filterByType,
  disabled,
  className = "",
  size = "default",
  align = "start",
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);

  const flat = useMemo(() => flatten(categories, excludeId), [categories, excludeId]);

  const filtered = useMemo(() => {
    let result = flat;
    if (filterByType) {
      const incomeParentId = flat.find((c) => c.name === "收入" && c.parentId === null)?.id;
      result = result.filter((c) =>
        filterByType === "EXPENSE"
          ? c.parentId !== incomeParentId || c.id === incomeParentId
          : c.parentId === incomeParentId || c.id === incomeParentId
      );
    }
    if (search) result = result.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [flat, filterByType, search]);

  useEffect(() => { if (open) setFocusIdx(0); }, [open, filtered.length]);

  const selectedCat = flat.find((c) => c.id === Number(value));

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const sm = size === "sm";
  const itemH = sm ? "py-1 px-2 text-xs" : "py-1.5 px-2 text-sm";
  const dot = sm ? "h-2.5 w-2.5" : "h-3 w-3";
  const btnH = sm ? "h-7 text-xs" : "h-9 text-sm";
  const searchH = sm ? "h-7 text-xs px-2 py-1" : "h-9 text-sm px-3 py-2";

  const list = filtered;
  const offset = nullOption ? 1 : 0;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled} className={`${btnH} w-full justify-between ${className}`}>
          {value === nullValue || (!value && !nullOption) ? (
            <span className="text-muted-foreground truncate">{nullOption || placeholder}</span>
          ) : selectedCat ? (
            <span className="flex items-center gap-1.5 min-w-0">
              {selectedCat.icon ? <span className="shrink-0">{selectedCat.icon}</span> : <span className={`${dot} shrink-0 rounded-full`} style={{ backgroundColor: selectedCat.color }} />}
              <span className="truncate">{selectedCat.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className={`${sm ? "ml-1 h-3 w-3" : "ml-2 h-4 w-4"} shrink-0 opacity-50`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${sm ? "w-[220px] p-1.5" : "w-[280px] p-2"}`} align={align}>
        <div onKeyDown={(e) => {
          const max = list.length + offset - 1;
          if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, max)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, offset > 0 ? -1 : 0)); }
          else if (e.key === "Enter") {
            e.preventDefault();
            if (offset && focusIdx === -1) handleSelect(nullValue);
            else {
              const idx = focusIdx - offset;
              if (list[idx]) handleSelect(String(list[idx].id));
            }
          }
        }}>
          <input ref={useRef<HTMLInputElement>(null)} className={`w-full rounded-md border border-input bg-transparent shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-1.5 ${searchH}`}
            placeholder="搜索分类..." value={search}
            onChange={(e) => { setSearch(e.target.value); setFocusIdx(offset > 0 ? -1 : 0); }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <div className="max-h-[200px] overflow-y-auto space-y-0.5">
            {nullOption && (
              <div className={`flex items-center gap-2 rounded-sm cursor-pointer ${itemH} ${focusIdx === -1 ? "bg-accent" : ""} hover:bg-accent`}
                onClick={() => handleSelect(nullValue)} onMouseEnter={() => setFocusIdx(-1)}
              >
                <span className={`${dot} shrink-0`} />
                <span className="text-muted-foreground">{nullOption}</span>
                {value === nullValue && (
                  <svg className="ml-auto h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            )}
            {list.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">未找到分类</p>}
            {list.map((c, i) => {
              const idx = i + offset;
              const inner = (
                <div key={c.id} className={`flex items-center gap-1.5 rounded-sm cursor-pointer ${itemH} ${focusIdx === idx ? "bg-accent" : ""} hover:bg-accent`}
                  onClick={() => handleSelect(String(c.id))} onMouseEnter={() => setFocusIdx(idx)}
                >
                  {c.icon ? <span className="shrink-0">{c.icon}</span> : <span className={`${dot} shrink-0 rounded-full`} style={{ backgroundColor: c.color }} />}
                  <span style={{ paddingLeft: `${c._depth * 12}px` }}>{c.name}</span>
                  {value === String(c.id) && (
                    <svg className="ml-auto h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
              return c.note ? (
                <Tooltip.Provider key={c.id}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
                    <Tooltip.Content side="right" className="max-w-[200px] break-words">{c.note}</Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              ) : inner;
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
