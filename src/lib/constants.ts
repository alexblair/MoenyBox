import { Building2, CreditCard, Wallet } from "lucide-react";
import type { AccountType, TransactionType } from "@/types";

export const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "EXPENSE", label: "支出" },
  { value: "INCOME", label: "收入" },
  { value: "TRANSFER", label: "转账" },
];

export const DATE_RANGES = [
  { value: "ALL", label: "全部" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "quarter", label: "最近三月" },
];

export const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "支出",
  INCOME: "收入",
  TRANSFER: "转账",
};

export const TYPE_COLORS: Record<string, string> = {
  EXPENSE: "text-red-500",
  INCOME: "text-green-500",
  TRANSFER: "text-blue-500",
};

export const TYPE_BORDER_COLORS: Record<string, string> = {
  EXPENSE: "border-red-200 text-red-600",
  INCOME: "border-green-200 text-green-600",
  TRANSFER: "border-blue-200 text-blue-600",
};

export const TYPE_SIGNS: Record<string, string> = {
  EXPENSE: "-",
  INCOME: "+",
  TRANSFER: "",
};

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  BANK: "银行账户",
  CREDIT_CARD: "信用卡",
  VIRTUAL: "虚拟账户",
};

export const ACCOUNT_SHORT_LABELS: Record<AccountType, string> = {
  BANK: "银行",
  CREDIT_CARD: "信用卡",
  VIRTUAL: "虚拟",
};

export const ACCOUNT_ICONS: Record<AccountType, typeof Building2> = {
  BANK: Building2,
  CREDIT_CARD: CreditCard,
  VIRTUAL: Wallet,
};

export const DUP_DATE_OPTIONS = [
  { value: "dateDay", label: "当天" },
  { value: "dateHour", label: "当天小时相同" },
  { value: "dateMinute", label: "当天小时与分钟相同" },
  { value: "dateExact", label: "完全一致" },
];

export const DUP_FIELD_OPTIONS = [
  { value: "amount", label: "金额" },
  { value: "categoryId", label: "分类" },
  { value: "accountId", label: "账户" },
  { value: "note", label: "备注" },
  { value: "type", label: "收入/支出" },
];

export const DATE_FIELD_VALUES = ["dateDay", "dateHour", "dateMinute", "dateExact"];
