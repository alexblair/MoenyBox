# MoneyBox API Reference · API 参考文档

> Base URL: `http://localhost:3000/api`

---

## 目录 / Table of Contents

1. [Transactions · 交易](#1-transactions--交易)
2. [Categories · 分类](#2-categories--分类)
3. [Accounts · 账户](#3-accounts--账户)
4. [Account Groups · 账户组](#4-account-groups--账户组)
5. [Templates · 模板](#5-templates--模板)
6. [Rules · 规则](#6-rules--规则)
7. [Import · 导入](#7-import--导入)
8. [Reports · 报表](#8-reports--报表)
9. [Dashboard · 仪表盘](#9-dashboard--仪表盘)
10. [Users · 用户](#10-users--用户)
11. [Auth · 认证](#11-auth--认证)
12. [Attachments · 附件](#12-attachments--附件)
13. [Permissions · 权限](#13-permissions--权限)

---

## 1. Transactions · 交易

### GET /api/transactions

查询交易列表，支持分页和多种筛选条件。

Query Parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `INCOME\|EXPENSE\|TRANSFER` | Filter by type |
| `categoryId` | number | Filter by category |
| `accountId` | number | Filter by account |
| `dateFrom` | string (ISO) | Start date |
| `dateTo` | string (ISO) | End date |
| `amountMin` | number | Minimum amount |
| `amountMax` | number | Maximum amount |
| `keyword` | string | Search in note |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20) |
| `sortBy` | string | Sort field (e.g. `dateTime`, `amount`) |
| `sortOrder` | `asc\|desc` | Sort direction |

Response:

```json
{
  "data": [
    {
      "id": 1,
      "type": "EXPENSE",
      "amount": "99.00",
      "categoryId": 5,
      "accountId": 1,
      "toAccountId": null,
      "note": "午餐",
      "dateTime": "2026-06-12T12:00:00.000Z",
      "category": { "id": 5, "name": "餐饮" },
      "account": { "id": 1, "name": "微信钱包" }
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

### POST /api/transactions

创建新交易。

```json
{
  "type": "EXPENSE",
  "amount": 99.00,
  "categoryId": 5,
  "accountId": 1,
  "toAccountId": null,
  "note": "午餐",
  "dateTime": "2026-06-12T12:00:00.000Z"
}
```

### GET /api/transactions/:id

获取单条交易详情。包含 `category`, `account`, `toAccount`, `attachments`。

### PUT /api/transactions/:id

更新交易。支持部分更新。

### DELETE /api/transactions/:id

删除交易。同时级联删除关联的附件关系。

### POST /api/transactions/batch

批量操作。

```json
{
  "ids": [1, 2, 3],
  "action": "delete"   // or "update"
}
```

### POST /api/transactions/batch/clone

批量克隆交易。

```json
{
  "ids": [1, 2, 3],
  "overrides": {
    "dateTime": "2026-07-01T00:00:00.000Z"
  }
}
```

### GET /api/transactions/duplicates

检测重复交易。按金额、类型、日期近似匹配分组。

```json
[
  {
    "count": 2,
    "transactions": [...],
    "keepId": 1,
    "removeIds": [2]
  }
]
```

---

## 2. Categories · 分类

### GET /api/categories

获取所有分类（树形结构）。

### POST /api/categories

创建分类。

```json
{
  "name": "交通",
  "parentId": null,
  "color": "#3b82f6",
  "icon": "car",
  "sortOrder": 0
}
```

### PUT /api/categories/:id

更新分类。

### DELETE /api/categories/:id

删除分类。

### POST /api/categories/batch-delete

```json
{ "ids": [1, 2, 3] }
```

### POST /api/categories/batch-update

```json
{
  "ids": [1, 2, 3],
  "updates": { "parentId": 10 }
}
```

### GET /api/categories/export

导出所有分类为 JSON。

### POST /api/categories/init

初始化默认分类数据。

---

## 3. Accounts · 账户

### GET /api/accounts

获取所有账户列表。支持 `archived` 筛选。

### POST /api/accounts

```json
{
  "name": "招商银行",
  "type": "BANK",
  "balance": 10000.00,
  "currency": "CNY",
  "icon": "bank"
}
```

### PUT /api/accounts/:id

### DELETE /api/accounts/:id

### POST /api/accounts/batch-delete

### GET /api/accounts/export

### POST /api/accounts/init

---

## 4. Account Groups · 账户组

### GET /api/account-groups

```json
[
  {
    "id": 1,
    "name": "个人账户",
    "description": "我的个人资金",
    "icon": "wallet",
    "color": "#6366f1",
    "sortOrder": 0,
    "members": [{ "accountId": 1, "account": { "id": 1, "name": "微信" } }]
  }
]
```

### POST /api/account-groups

```json
{
  "name": "家庭账户",
  "description": "家庭共用资金",
  "color": "#22c55e",
  "memberIds": [1, 2]
}
```

### PUT /api/account-groups/:id

### DELETE /api/account-groups/:id

---

## 5. Templates · 模板

### GET /api/templates

获取所有模板（树形层级结构）。

### GET /api/templates/active

获取所有活跃模板（首页快速记账使用）。

### POST /api/templates

```json
{
  "name": "每日咖啡",
  "type": "EXPENSE",
  "amount": 30.00,
  "categoryId": 5,
  "accountId": 1,
  "note": "咖啡续命",
  "parentId": null,
  "active": true
}
```

### PUT /api/templates/:id

### DELETE /api/templates/:id

### POST /api/templates/from-transactions

从指定交易创建模板。

```json
{
  "transactionIds": [1, 2],
  "name": "常用支出"
}
```

---

## 6. Rules · 规则

### GET /api/rules/groups

获取所有规则组（包含其下的规则、条件、动作）。

### POST /api/rules/groups

```json
{
  "name": "外卖分类",
  "mode": "ALL",
  "scenarios": ["IMPORT", "MANUAL"],
  "rules": [
    {
      "name": "美团外卖",
      "conditionMode": "ALL",
      "conditions": [
        { "field": "note", "operator": "contains", "value": "美团" }
      ],
      "actions": [
        { "field": "categoryId", "value": "5" }
      ]
    }
  ]
}
```

### PUT /api/rules/groups/:id

### DELETE /api/rules/groups/:id

### POST /api/rules/apply

对指定交易应用规则。

```json
{
  "transactionId": 1
}
```

### POST /api/rules/apply-batch

批量应用规则。

---

## 7. Import · 导入

### POST /api/import/preview

预览 CSV 导入结果，带校验和重复检测。

```json
{
  "csvData": "type,amount,date,note\nEXPENSE,99.00,2026-06-12,午餐",
  "mapping": [
    { "csvColumn": "type", "systemField": "type" },
    { "csvColumn": "amount", "systemField": "amount" },
    { "csvColumn": "date", "systemField": "dateTime" },
    { "csvColumn": "note", "systemField": "note" }
  ]
}
```

Response:

```json
{
  "total": 10,
  "validCount": 8,
  "errorCount": 2,
  "duplicateCount": 1,
  "rows": [
    {
      "rowNumber": 1,
      "raw": { "type": "EXPENSE", "amount": "99.00" },
      "parsed": { "type": "EXPENSE", "amount": 99.00, "dateTime": "2026-06-12", "note": "午餐" },
      "resolved": { "category": { "id": 5, "name": "餐饮", "path": "生活 > 餐饮" } },
      "errors": [],
      "valid": true,
      "isDuplicate": false,
      "ruleFixes": []
    }
  ]
}
```

### POST /api/import/csv

执行导入。参数同 preview，会在应用规则后创建交易。

---

## 8. Reports · 报表

### GET /api/reports/net-worth?months=12

净资产趋势。返回每月净资产数据点。

```json
[
  { "date": "2026-01", "netWorth": 50000.00 },
  { "date": "2026-02", "netWorth": 52000.00 }
]
```

### GET /api/reports/income-expense?months=12

月度收支对比。

```json
[
  { "month": "2026-01", "income": 15000.00, "expense": 8000.00 }
]
```

### GET /api/reports/category-breakdown?months=1

分类支出分析。

```json
[
  { "categoryName": "餐饮", "color": "#ef4444", "amount": 3000.00, "percentage": 30 }
]
```

### GET /api/reports/monthly-summary?months=12

月度汇总（收入、支出、净变动）。

```json
[
  { "month": "2026-01", "income": 15000.00, "expense": 8000.00, "netDelta": 7000.00 }
]
```

---

## 9. Dashboard · 仪表盘

### GET /api/dashboard

获取仪表盘数据（月度汇总 + 分类占比）。

```json
{
  "monthlySummary": [
    { "month": "2026-01", "income": 15000.00, "expense": 8000.00 }
  ],
  "categoryBreakdown": [
    { "categoryName": "餐饮", "amount": 3000.00, "percentage": 30, "color": "#ef4444" }
  ]
}
```

---

## 10. Users · 用户

### GET /api/users

获取所有用户列表。

### POST /api/users

```json
{ "name": "张三", "email": "zhangsan@example.com" }
```

### PUT /api/users/:id

### DELETE /api/users/:id

### POST /api/users/:id/clear-data

清空指定用户的所有数据。

### POST /api/users/:id/import-demo

导入演示数据到指定用户。

### GET/PUT /api/users/:id/permissions

获取/更新用户的账户权限。

---

## 11. Auth · 认证

### POST /api/auth/login

```json
{
  "email": "admin@moneybox.local",
  "password": "password"
}
```

Success: Sets session cookie.

### POST /api/auth/logout

清除会话。

### GET /api/auth/me

获取当前登录用户信息。

### GET /api/auth/permissions

获取当前用户的全部权限列表。

---

## 12. Attachments · 附件

### POST /api/transactions/:id/attachments

上传附件到指定交易。支持 multipart/form-data。

### DELETE /api/attachments/:id

删除附件。

---

## 13. Permissions · 权限

### GET /api/account-permissions

获取所有账户权限配置。

### PUT /api/account-permissions/:id

更新单条权限。

### GET /api/group-permissions

获取组级权限配置。

### PUT /api/group-permissions/:id

更新组级权限。

### GET /api/account-groups/:id/permissions

获取指定账户组的权限。

### PUT /api/account-groups/:id/permissions

更新指定账户组的权限。

---

## 通用错误响应 / Common Error Responses

```json
// 400 Bad Request
{ "error": "Invalid amount", "details": "Amount must be a positive number" }

// 401 Unauthorized
{ "error": "Not authenticated" }

// 403 Forbidden
{ "error": "Permission denied", "required": "transaction.create" }

// 404 Not Found
{ "error": "Transaction not found" }

// 500 Internal Server Error
{ "error": "Internal server error" }
```

---

## 分页 / Pagination

所有列表接口支持统一的分页参数和响应格式：

Request: `?page=1&pageSize=20`
Response:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```
