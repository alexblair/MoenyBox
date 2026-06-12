import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { TYPE_COLORS, TYPE_SIGNS } from "@/lib/constants";
import type { TransactionType } from "@/types";

export function TransactionAmount({
  type,
  amount,
  className = "",
}: {
  type: TransactionType;
  amount: number;
  className?: string;
}) {
  return (
    <span className={`text-sm font-semibold whitespace-nowrap ${TYPE_COLORS[type]} ${className}`}>
      {TYPE_SIGNS[type]}{formatCurrency(amount)}
    </span>
  );
}

export function TransactionTypeIcon({ type, className = "h-4 w-4" }: { type: TransactionType; className?: string }) {
  const props = { className: `${className} ${TYPE_COLORS[type]}` };
  switch (type) {
    case "EXPENSE": return <ArrowDownCircle {...props} />;
    case "INCOME": return <ArrowUpCircle {...props} />;
    case "TRANSFER": return <ArrowLeftRight {...props} />;
  }
}
