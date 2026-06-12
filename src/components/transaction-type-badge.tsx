import { Badge } from "@/components/ui/badge";
import { TYPE_BORDER_COLORS, TYPE_LABELS } from "@/lib/constants";
import type { TransactionType } from "@/types";

export function TransactionTypeBadge({
  type,
  className = "",
}: {
  type: TransactionType;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={`text-xs shrink-0 ${TYPE_BORDER_COLORS[type]} ${className}`}>
      {TYPE_LABELS[type]}
    </Badge>
  );
}
