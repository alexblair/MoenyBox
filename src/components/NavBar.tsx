"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  PlusCircle,
  List,
  Layers,
  CreditCard,
  Upload,
  Menu,
  GitFork,
  FileText,
  FolderOpen,
  BarChart3,
  Sun,
  Moon,
  Users,
  UserCog,
  LogOut,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/transactions/new", label: "记账", icon: PlusCircle, highlight: true },
  { href: "/transactions", label: "记录", icon: List },
];

const menuItems = [
  { href: "/categories", label: "分类管理", icon: Layers },
  { href: "/templates", label: "交易模板", icon: FileText },
  { href: "/accounts", label: "账户管理", icon: CreditCard },
  { href: "/reports", label: "报表统计", icon: BarChart3 },
  { href: "/account-groups", label: "账户分组", icon: FolderOpen },
  { href: "/users", label: "用户管理", icon: Users },
  { href: "/user-groups", label: "用户组", icon: UserCog },
  { href: "/import", label: "CSV管理", icon: Upload },
  { href: "/rules", label: "规则引擎", icon: GitFork },
];

const allItems = [...navItems, ...menuItems];

export default function NavBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  function bestMatch(items: typeof navItems) {
    return items
      .filter((i) => pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href)))
      .sort((a, b) => b.href.length - a.href.length)[0];
  }

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const isActive = bestMatch(navItems)?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                  isActive && !item.highlight
                    ? "text-primary"
                    : !item.highlight && "text-muted-foreground hover:text-foreground",
                  item.highlight &&
                    "relative -top-2 rounded-full bg-primary p-2 text-primary-foreground shadow-lg hover:bg-primary/90"
                )}
              >
                <Icon className={cn("h-5 w-5", item.highlight && "h-6 w-6")} />
                {!item.highlight && <span>{item.label}</span>}
              </Link>
            );
          })}

          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
                  menuItems.some((m) => pathname.startsWith(m.href)) && "text-primary"
                )}
              >
                <Menu className="h-5 w-5" />
                <span>我的</span>
              </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-2"
              >
                {user ? (
                  <div className="flex items-center gap-3 rounded-sm px-2 py-2 mb-1 border-b">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {user.name[0]}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">{user.name}</span>
                  </div>
                ) : (
                  <DropdownMenuPrimitive.Item asChild>
                    <Link href="/login" className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground mb-1 border-b">
                      <LogIn className="h-4 w-4" />
                      <span>登录</span>
                    </Link>
                  </DropdownMenuPrimitive.Item>
                )}
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <DropdownMenuPrimitive.Item key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuPrimitive.Item>
                  );
                })}
                {user && (
                  <div className="pt-1 mt-1 border-t">
                    <DropdownMenuPrimitive.Item asChild>
                      <button
                        onClick={handleLogout}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>退出登录</span>
                      </button>
                    </DropdownMenuPrimitive.Item>
                  </div>
                )}
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:border-r md:bg-background md:min-h-screen md:sticky md:top-0 md:shrink-0">
        <div className="p-5 border-b">
          <h1 className="text-xl font-bold">MoneyBox</h1>
          <p className="text-xs text-muted-foreground mt-0.5">个人记账工具</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {allItems.map((item) => {
            const isActive = bestMatch(allItems)?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-1">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 shrink-0" />
            )}
            <span>{mounted && theme === "dark" ? "浅色模式" : "深色模式"}</span>
          </button>
          {user ? (
            <div className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {user.name[0]}
              </div>
              <span className="flex-1 truncate">{user.name}</span>
              <button onClick={handleLogout} className="hover:text-foreground transition-colors" title="退出登录">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogIn className="h-5 w-5 shrink-0" />
              <span>登录</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
