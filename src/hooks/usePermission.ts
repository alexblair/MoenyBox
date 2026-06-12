"use client";

import { useState, useEffect, useCallback } from "react";
import type { AccountPermissionId } from "@/types";

interface PermissionEntry {
  permission: AccountPermissionId;
  granted: boolean;
}

let cachedPermissions: PermissionEntry[] | null = null;
let cacheLoadPromise: Promise<PermissionEntry[]> | null = null;

async function fetchPermissions(): Promise<PermissionEntry[]> {
  if (cachedPermissions) return cachedPermissions;
  if (cacheLoadPromise) return cacheLoadPromise;

  cacheLoadPromise = fetch("/api/auth/permissions")
    .then((res) => {
      if (!res.ok) return [];
      return res.json();
    })
    .then((data: PermissionEntry[]) => {
      cachedPermissions = data;
      return data;
    })
    .finally(() => {
      cacheLoadPromise = null;
    });

  return cacheLoadPromise;
}

export function invalidatePermissionCache() {
  cachedPermissions = null;
}

export function usePermission() {
  const [permissions, setPermissions] = useState<PermissionEntry[]>(cachedPermissions ?? []);

  useEffect(() => {
    if (cachedPermissions) return;
    fetchPermissions().then(setPermissions);
  }, []);

  const has = useCallback(
    (perm: AccountPermissionId, accountId?: number): boolean => {
      return permissions.some(
        (p) => p.permission === perm && p.granted
      );
    },
    [permissions],
  );

  const hasOnAccount = useCallback(
    (perm: AccountPermissionId, accountId: number): boolean => {
      return permissions.some(
        (p) => p.permission === perm && p.granted
      );
    },
    [permissions],
  );

  return { permissions, has, hasOnAccount, refresh: () => fetchPermissions().then(setPermissions) };
}
