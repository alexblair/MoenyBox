"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  Home,
  PlusCircle,
  List,
  Layers,
  CreditCard,
  Upload,
  GitFork,
  FileText,
  FolderOpen,
  BarChart3,
  Search,
  Hash,
  Coins,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { Account, Category } from "@/types";
import { getAccounts } from "@/lib/api";
import { getCategories } from "@/lib/api";

const navPages = [
  { label: "首页", href: "/", icon: Home },
  { label: "记账", href: "/transactions/new", icon: PlusCircle },
  { label: "记录", href: "/transactions", icon: List },
  { label: "分类管理", href: "/categories", icon: Layers },
  { label: "交易模板", href: "/templates", icon: FileText },
  { label: "账户管理", href: "/accounts", icon: CreditCard },
  { label: "报表统计", href: "/reports", icon: BarChart3 },
  { label: "账户分组", href: "/account-groups", icon: FolderOpen },
  { label: "CSV管理", href: "/import", icon: Upload },
  { label: "规则引擎", href: "/rules", icon: GitFork },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      getAccounts().then(setAccounts).catch(() => {});
      getCategories().then(setCategories).catch(() => {});
    }
  }, [open]);

  const run = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索页面、账户、分类..." />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>
        <CommandGroup heading="页面导航">
          {navPages.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem key={p.href} onSelect={() => run(p.href)}>
                <Icon className="mr-2 h-4 w-4" />
                <span>{p.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        {accounts.length > 0 && (
          <CommandGroup heading="账户">
            {accounts.map((a) => (
              <CommandItem key={a.id} onSelect={() => run(`/accounts`)}>
                <Coins className="mr-2 h-4 w-4" />
                <span>{a.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {a.balance.toLocaleString()}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {categories.length > 0 && (
          <CommandGroup heading="分类">
            {categories.map((c) => (
              <CommandItem key={c.id} onSelect={() => run(`/categories`)}>
                <Hash className="mr-2 h-4 w-4" />
                <span>{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
