import { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ message, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`py-16 text-center text-sm text-muted-foreground ${className}`}>
      <p>{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
