"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { ACCOUNT_SHORT_LABELS } from "@/lib/constants";
import type { Account } from "@/types";

interface AccountSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  accounts: Account[];
  nullOption?: string;
  nullValue?: string;
  placeholder?: string;
  disabled?: boolean;
  showBalance?: boolean;
  size?: "sm" | "default";
  className?: string;
}

export function AccountSelect({
  value,
  onValueChange,
  accounts,
  nullOption,
  nullValue = "ALL",
  placeholder = "选择账户",
  disabled,
  showBalance = true,
  size = "default",
  className = "",
}: AccountSelectProps) {
  const h = size === "sm" ? "h-9" : "h-10";
  const txtSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={`${h} ${txtSize} ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {nullOption && <SelectItem value={nullValue}>{nullOption}</SelectItem>}
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id.toString()}>
            {a.name}
            {showBalance && a.balance !== undefined ? `（${ACCOUNT_SHORT_LABELS[a.type]} · ${formatCurrency(Number(a.balance))}）` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
