export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type AccountType = "BANK" | "CREDIT_CARD" | "VIRTUAL";

export type AccountPermissionId =
  | "account.view"
  | "account.view_balance"
  | "transaction.view"
  | "transaction.create"
  | "transaction.edit"
  | "transaction.delete"
  | "transaction.export"
  | "account.manage"
  | "account.delete"
  | "account_group.manage";

export const ACCOUNT_PERMISSIONS: { id: AccountPermissionId; label: string; description: string }[] = [
  { id: "account.view", label: "查看账户", description: "查看账户基本信息" },
  { id: "account.view_balance", label: "查看余额", description: "查看账户余额" },
  { id: "transaction.view", label: "查看交易", description: "查看账户的交易记录" },
  { id: "transaction.create", label: "创建交易", description: "在账户中创建新交易" },
  { id: "transaction.edit", label: "编辑交易", description: "编辑账户中的交易" },
  { id: "transaction.delete", label: "删除交易", description: "删除账户中的交易" },
  { id: "transaction.export", label: "导出交易", description: "导出账户交易数据" },
  { id: "account.manage", label: "管理账户", description: "编辑账户设置" },
  { id: "account.delete", label: "删除账户", description: "删除账户" },
  { id: "account_group.manage", label: "管理账户组", description: "创建/编辑/删除账户组" },
];

export interface AccountPermission {
  id: number;
  accountId: number | null;
  groupId: number | null;
  permission: AccountPermissionId;
  granted: boolean;
}

export interface AccountGroup {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  sortOrder: number;
  archived: boolean;
  members?: AccountGroupMember[];
}

export interface AccountGroupMember {
  accountId: number;
  groupId: number;
  sortOrder: number;
  account?: Account;
}

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  color: string;
  icon: string | null;
  note: string | null;
  sortOrder: number;
  children?: Category[];
}

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  icon: string | null;
  archived: boolean;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number | null;
  accountId: number;
  toAccountId: number | null;
  note: string | null;
  dateTime: string;
  category?: Category | null;
  account?: Account | null;
  toAccount?: Account | null;
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  hash: string;
  filename: string;
  filepath: string;
  mimeType: string;
  size: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransactionSearchParams {
  type?: TransactionType;
  categoryId?: number;
  accountId?: number;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CsvFieldMapping {
  csvColumn: string;
  systemField: string;
}

export interface CsvImportPreview {
  headers: string[];
  rows: Record<string, string>[];
  mapping: CsvFieldMapping[];
}

export interface ImportRowPreview {
  rowNumber: number;
  raw: Record<string, string>;
  parsed: {
    type: string | null;
    amount: number | null;
    dateTime: string | null;
    note: string | null;
    categoryName: string | null;
    accountName: string | null;
  };
  resolved: {
    typeDisplay: string | null;
    amount: number | null;
    dateTime: string | null;
    category: { id: number; name: string; path: string } | null;
    account: { id: number; name: string; type: string } | null;
  };
  errors: { field: string; message: string }[];
  valid: boolean;
  isDuplicate?: boolean;
  ruleFixes?: RowFix[];
}

export interface ImportPreviewResponse {
  total: number;
  validCount: number;
  errorCount: number;
  duplicateCount?: number;
  rows: ImportRowPreview[];
}

export interface DuplicateGroup {
  count: number;
  transactions: Transaction[];
  keepId: number;
  removeIds: number[];
}

export interface TransactionTemplate {
  id: number;
  name: string;
  type: TransactionType;
  amount: number;
  categoryId: number | null;
  accountId: number;
  toAccountId: number | null;
  note: string | null;
  sortOrder: number;
  parentId: number | null;
  active: boolean;
  parent?: TransactionTemplate | null;
  children?: TransactionTemplate[];
  category?: Category | null;
  account?: Account | null;
  toAccount?: Account | null;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface DashboardCharts {
  monthlySummary: MonthlySummary[];
  categoryBreakdown: CategoryBreakdown[];
}

export interface NetWorthPoint {
  date: string;
  netWorth: number;
}

export interface IncomeExpensePoint {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdownItem {
  categoryName: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface MonthlySummaryItem {
  month: string;
  income: number;
  expense: number;
  netDelta: number;
}

export type RowFix = Partial<{
  type: "INCOME" | "EXPENSE";
  amount: number;
  dateTime: string;
  categoryId: number;
  accountId: number;
  note: string;
}>;

export interface User {
  id: number;
  name: string;
  email: string | null;
  avatar: string | null;
  active: boolean;
  groupMemberships?: UserGroupMember[];
}

export interface UserGroup {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  sortOrder: number;
  members?: UserGroupMember[];
  permissions?: GroupPermission[];
}

export interface UserGroupMember {
  userId: number;
  userGroupId: number;
  user?: User;
}

export interface GroupPermission {
  id: number;
  userGroupId: number;
  permission: AccountPermissionId;
  accountId: number | null;
  granted: boolean;
}


