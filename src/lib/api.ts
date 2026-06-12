import type {
  Category,
  Account,
  AccountGroup,
  AccountPermission,
  AccountPermissionId,
  Transaction,
  TransactionSearchParams,
  PaginatedResult,
  CsvImportPreview,
  DuplicateGroup,
  TransactionTemplate,
  DashboardCharts,
  NetWorthPoint,
  IncomeExpensePoint,
  CategoryBreakdownItem,
  MonthlySummaryItem,
  User,
  UserGroup,
  GroupPermission,
} from "@/types";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "请求失败" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// Categories
export function getCategories(): Promise<Category[]> {
  return fetchApi<Category[]>("/api/categories");
}

export function createCategory(data: Partial<Category>): Promise<Category> {
  return fetchApi<Category>("/api/categories", { method: "POST", body: JSON.stringify(data) });
}

export function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  return fetchApi<Category>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteCategory(id: number): Promise<void> {
  return fetchApi<void>(`/api/categories/${id}`, { method: "DELETE" });
}

export function batchDeleteCategories(ids: number[]): Promise<{ deleted: number[]; failed: { id: number; reason: string }[] }> {
  return fetchApi("/api/categories/batch-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function batchUpdateCategories(
  ids: number[],
  data: { icon?: string; color?: string }
): Promise<{ success: boolean; count: number }> {
  return fetchApi("/api/categories/batch-update", {
    method: "POST",
    body: JSON.stringify({ ids, ...data }),
  });
}

export function getDefaultInitCategories(): Promise<{ name: string; parentName?: string | null; color?: string }[]> {
  return fetchApi("/api/categories/init");
}

export function initCategories(
  data: { name: string; parentName?: string | null; color?: string }[]
): Promise<{ created: number; skipped: number }> {
  return fetchApi("/api/categories/init", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function exportCategoriesUrl(): string {
  return "/api/categories/export";
}

// Account Groups
export function getAccountGroups(): Promise<AccountGroup[]> {
  return fetchApi<AccountGroup[]>("/api/account-groups");
}

export function getAccountGroup(id: number): Promise<AccountGroup> {
  return fetchApi<AccountGroup>(`/api/account-groups/${id}`);
}

export function createAccountGroup(data: Partial<AccountGroup> & { name: string; memberIds?: number[] }): Promise<AccountGroup> {
  return fetchApi<AccountGroup>("/api/account-groups", { method: "POST", body: JSON.stringify(data) });
}

export function updateAccountGroup(id: number, data: Partial<AccountGroup> & { memberIds?: number[] }): Promise<AccountGroup> {
  return fetchApi<AccountGroup>(`/api/account-groups/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteAccountGroup(id: number): Promise<void> {
  return fetchApi<void>(`/api/account-groups/${id}`, { method: "DELETE" });
}

// Account Permissions
export function getAccountPermissions(params?: {
  accountId?: number;
  groupId?: number;
  permission?: string;
}): Promise<AccountPermission[]> {
  const searchParams = new URLSearchParams();
  if (params?.accountId !== undefined) searchParams.set("accountId", String(params.accountId));
  if (params?.groupId !== undefined) searchParams.set("groupId", String(params.groupId));
  if (params?.permission) searchParams.set("permission", params.permission);
  const qs = searchParams.toString();
  return fetchApi<AccountPermission[]>(`/api/account-permissions${qs ? `?${qs}` : ""}`);
}

export function getAccountPermission(id: number): Promise<AccountPermission> {
  return fetchApi<AccountPermission>(`/api/account-permissions/${id}`);
}

export function createAccountPermission(data: {
  accountId?: number | null;
  groupId?: number | null;
  permission: AccountPermissionId;
  granted?: boolean;
}): Promise<AccountPermission> {
  return fetchApi<AccountPermission>("/api/account-permissions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAccountPermission(
  id: number,
  data: Partial<AccountPermission>
): Promise<AccountPermission> {
  return fetchApi<AccountPermission>(`/api/account-permissions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteAccountPermission(id: number): Promise<void> {
  return fetchApi<void>(`/api/account-permissions/${id}`, { method: "DELETE" });
}

// Accounts
export function getAccounts(): Promise<Account[]> {
  return fetchApi<Account[]>("/api/accounts");
}

export function createAccount(data: Partial<Account>): Promise<Account> {
  return fetchApi<Account>("/api/accounts", { method: "POST", body: JSON.stringify(data) });
}

export function updateAccount(id: number, data: Partial<Account>): Promise<Account> {
  return fetchApi<Account>(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteAccount(id: number): Promise<void> {
  return fetchApi<void>(`/api/accounts/${id}`, { method: "DELETE" });
}

export function archiveAccount(id: number): Promise<Account> {
  return fetchApi<Account>(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify({ archived: true }) });
}

export function unarchiveAccount(id: number): Promise<Account> {
  return fetchApi<Account>(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify({ archived: false }) });
}

export function batchDeleteAccounts(ids: number[]): Promise<{ deleted: number[]; failed: { id: number; reason: string }[] }> {
  return fetchApi("/api/accounts/batch-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function getDefaultInitAccounts(): Promise<{ name: string; type: string; balance: number; currency: string }[]> {
  return fetchApi("/api/accounts/init");
}

export function initAccounts(
  data: { name: string; type?: string; balance?: number; currency?: string }[]
): Promise<{ created: number; skipped: number }> {
  return fetchApi("/api/accounts/init", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function exportAccountsUrl(): string {
  return "/api/accounts/export";
}

// Transactions
export function getTransactions(params?: TransactionSearchParams): Promise<PaginatedResult<Transaction>> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }
  const qs = searchParams.toString();
  return fetchApi<PaginatedResult<Transaction>>(`/api/transactions${qs ? `?${qs}` : ""}`);
}

export function getTransaction(id: number): Promise<Transaction> {
  return fetchApi<Transaction>(`/api/transactions/${id}`);
}

export function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  return fetchApi<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(data) });
}

export function updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
  return fetchApi<Transaction>(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteTransaction(id: number): Promise<void> {
  return fetchApi<void>(`/api/transactions/${id}`, { method: "DELETE" });
}

export function batchUpdateTransactions(
  ids: number[],
  updates: Record<string, unknown>
): Promise<{ success: boolean; count: number }> {
  return fetchApi("/api/transactions/batch", {
    method: "POST",
    body: JSON.stringify({ action: "update", ids, updates }),
  });
}

export function batchDeleteTransactions(
  ids: number[]
): Promise<{ success: boolean; count: number }> {
  return fetchApi("/api/transactions/batch", {
    method: "POST",
    body: JSON.stringify({ action: "delete", ids }),
  });
}

export function detectDuplicates(params: {
  fields: string[];
  type?: string;
  categoryId?: number;
  accountId?: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
}): Promise<{ groups: DuplicateGroup[]; totalDuplicates: number }> {
  return fetchApi("/api/transactions/duplicates", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Templates
export function getTemplates(): Promise<TransactionTemplate[]> {
  return fetchApi<TransactionTemplate[]>("/api/templates");
}

export function getActiveTemplates(): Promise<TransactionTemplate[]> {
  return fetchApi<TransactionTemplate[]>("/api/templates/active");
}

export function createTemplate(data: Partial<TransactionTemplate> & { name: string }): Promise<TransactionTemplate> {
  return fetchApi<TransactionTemplate>("/api/templates", { method: "POST", body: JSON.stringify(data) });
}

export function updateTemplate(id: number, data: Partial<TransactionTemplate>): Promise<TransactionTemplate> {
  return fetchApi<TransactionTemplate>(`/api/templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteTemplate(id: number): Promise<void> {
  return fetchApi<void>(`/api/templates/${id}`, { method: "DELETE" });
}

export function createTemplateFromTransactions(
  transactionIds: number[],
  name: string
): Promise<TransactionTemplate> {
  return fetchApi<TransactionTemplate>("/api/templates/from-transactions", {
    method: "POST",
    body: JSON.stringify({ transactionIds, name }),
  });
}

// Transaction cloning
export function cloneTransactions(
  ids: number[],
  overrides?: Record<string, unknown>
): Promise<{ success: boolean; count: number }> {
  return fetchApi("/api/transactions/batch/clone", {
    method: "POST",
    body: JSON.stringify({ ids, overrides }),
  });
}

export function uploadAttachmentFiles(transactionId: number, files: File[]): Promise<any> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  return fetch(`/api/transactions/${transactionId}/attachments`, {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "上传失败" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  });
}

export function deleteAttachment(id: number): Promise<void> {
  return fetchApi<void>(`/api/attachments/${id}`, { method: "DELETE" });
}

export function getDashboardCharts(): Promise<DashboardCharts> {
  return fetchApi("/api/dashboard");
}

export function exportCsvUrl(params?: TransactionSearchParams): string {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }
  const qs = searchParams.toString();
  return `/api/export/csv${qs ? `?${qs}` : ""}`;
}

// Reports
export function getNetWorthTrend(from: string, to: string): Promise<NetWorthPoint[]> {
  return fetchApi<NetWorthPoint[]>(`/api/reports/net-worth?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export function getIncomeExpense(from: string, to: string): Promise<IncomeExpensePoint[]> {
  return fetchApi<IncomeExpensePoint[]>(`/api/reports/income-expense?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export function getCategoryBreakdown(from: string, to: string): Promise<CategoryBreakdownItem[]> {
  return fetchApi<CategoryBreakdownItem[]>(`/api/reports/category-breakdown?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export function getMonthlySummary(year: number): Promise<MonthlySummaryItem[]> {
  return fetchApi<MonthlySummaryItem[]>(`/api/reports/monthly-summary?year=${year}`);
}

// Users
export function getUsers(): Promise<User[]> {
  return fetchApi<User[]>("/api/users");
}

export function getUser(id: number): Promise<User> {
  return fetchApi<User>(`/api/users/${id}`);
}

export function createUser(data: { name: string; email?: string; avatar?: string; active?: boolean; password?: string }): Promise<User> {
  return fetchApi<User>("/api/users", { method: "POST", body: JSON.stringify(data) });
}

export function updateUser(id: number, data: Partial<User>): Promise<User> {
  return fetchApi<User>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteUser(id: number): Promise<void> {
  return fetchApi<void>(`/api/users/${id}`, { method: "DELETE" });
}

export function clearUserData(id: number): Promise<void> {
  return fetchApi<void>(`/api/users/${id}/clear-data`, { method: "POST" });
}

export function importDemoData(id: number): Promise<{ accounts: number; categories: number; transactions: number }> {
  return fetchApi(`/api/users/${id}/import-demo`, { method: "POST" });
}

export function getUserPermissions(userId: number, accountId?: number): Promise<{ permission: AccountPermissionId; granted: boolean }[]> {
  const qs = accountId !== undefined ? `?accountId=${accountId}` : "";
  return fetchApi(`/api/users/${userId}/permissions${qs}`);
}

// User Groups
export function getUserGroups(): Promise<UserGroup[]> {
  return fetchApi<UserGroup[]>("/api/user-groups");
}

export function getUserGroup(id: number): Promise<UserGroup> {
  return fetchApi<UserGroup>(`/api/user-groups/${id}`);
}

export function createUserGroup(data: Partial<UserGroup> & { name: string; memberIds?: number[] }): Promise<UserGroup> {
  return fetchApi<UserGroup>("/api/user-groups", { method: "POST", body: JSON.stringify(data) });
}

export function updateUserGroup(id: number, data: Partial<UserGroup> & { memberIds?: number[] }): Promise<UserGroup> {
  return fetchApi<UserGroup>(`/api/user-groups/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteUserGroup(id: number): Promise<void> {
  return fetchApi<void>(`/api/user-groups/${id}`, { method: "DELETE" });
}

// Group Permissions
export function getGroupPermissions(params?: { userGroupId?: number; permission?: string; accountId?: number }): Promise<GroupPermission[]> {
  const searchParams = new URLSearchParams();
  if (params?.userGroupId !== undefined) searchParams.set("userGroupId", String(params.userGroupId));
  if (params?.permission) searchParams.set("permission", params.permission);
  if (params?.accountId !== undefined) searchParams.set("accountId", String(params.accountId));
  const qs = searchParams.toString();
  return fetchApi<GroupPermission[]>(`/api/group-permissions${qs ? `?${qs}` : ""}`);
}

export function createGroupPermission(data: { userGroupId: number; permission: AccountPermissionId; accountId?: number | null; granted?: boolean }): Promise<GroupPermission> {
  return fetchApi<GroupPermission>("/api/group-permissions", { method: "POST", body: JSON.stringify(data) });
}

export function deleteGroupPermission(id: number): Promise<void> {
  return fetchApi<void>(`/api/group-permissions/${id}`, { method: "DELETE" });
}

export { fetchApi };
