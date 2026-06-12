"use client";

import type { ReactNode } from "react";
import type { AccountPermissionId } from "@/types";
import { usePermission } from "@/hooks/usePermission";

interface RequirePermissionProps {
  permission: AccountPermissionId;
  accountId?: number;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequirePermission({
  permission,
  accountId,
  fallback = null,
  children,
}: RequirePermissionProps) {
  const { has } = usePermission();

  if (has(permission, accountId)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
