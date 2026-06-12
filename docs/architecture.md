# MoneyBox Architecture · 架构文档

> Version: 1.0 | Last Updated: 2026-06-12

---

## 1. 系统架构概览 / System Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │          Next.js App (React)                    │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │ │
│  │  │  Pages  │ │Components│ │  Offline (Dexie) │ │ │
│  │  └────┬────┘ └──────────┘ └──────────────────┘ │ │
│  └───────┼─────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────────────────┐
    │          Next.js API Routes (Server)            │
    │  ┌──────────┐ ┌────────┐ ┌───────────────────┐  │
    │  │ Business │ │  Auth  │ │  File Upload      │  │
    │  │  Logic   │ │        │ │  (sharp)          │  │
    │  └────┬─────┘ └────────┘ └───────────────────┘  │
    └───────┼──────────────────────────────────────────┘
            │
    ┌───────▼──────────────────────────────────────────┐
    │   Prisma ORM + MySQL                             │
    │   ┌──────────────────────────────────────────┐   │
    │   │  transactions, categories, accounts, ... │   │
    │   └──────────────────────────────────────────┘   │
    └──────────────────────────────────────────────────┘
```

## 2. 分层架构 / Layered Architecture

### 2.1 Presentation Layer (src/app/)

- **Pages**: Next.js App Router pages under `src/app/`
- **Layout**: Root layout with NavBar, ThemeProvider, CommandPalette
- **API Routes**: RESTful endpoints under `src/app/api/`

### 2.2 Component Layer (src/components/)

- **ui/**: shadcn/ui primitives (button, dialog, input, select, etc.)
- **Domain components**: TransactionForm, TransactionList, CategorySelect, etc.

### 2.3 Business Logic Layer (src/server/)

- Pure service functions that encapsulate business rules
- Separated by domain: `transactions.ts`, `categories.ts`, `accounts.ts`, `reports.ts`, `rule-engine.ts`

### 2.4 Data Access Layer

- **Prisma ORM**: Type-safe database access via `src/lib/db.ts`
- **Dexie.js**: Client-side IndexedDB for offline support via `src/lib/offline-db.ts`

### 2.5 Type Layer (src/types/)

- Shared TypeScript type definitions used across frontend and backend

## 3. 关键设计决策 / Key Design Decisions

### 3.1 离线架构 / Offline Architecture

```
Online:  Browser ↔ API ↔ MySQL
Offline: Browser ↔ Dexie (IndexedDB) ↔ Sync Queue
```

- Dexie.js provides client-side IndexedDB storage
- Offline writes are queued for sync when connection restores
- Read operations fall back to Dexie cache when API unavailable

### 3.2 权限系统 / Permission System

10-level permission model designed for multi-user extension:

| Permission | Scope |
|------------|-------|
| `account.view` | Read account basic info |
| `account.view_balance` | View account balance |
| `transaction.view` | View transactions |
| `transaction.create` | Create transactions |
| `transaction.edit` | Edit transactions |
| `transaction.delete` | Delete transactions |
| `transaction.export` | Export transactions |
| `account.manage` | Manage account settings |
| `account.delete` | Delete account |
| `account_group.manage` | Manage account groups |

Resolution order:
1. Exact match (accountId + groupId + permission)
2. Group-level match (groupId + permission)
3. Global default (currently all-granted for single-user)

### 3.3 规则引擎 / Rule Engine

```
RuleGroup (ALL/ANY mode)
  └── Rule (ALL/ANY mode)
       ├── RuleCondition (field + operator + value)
       └── RuleAction (field + value)
```

- Supports conditions: `field` (note, amount, etc.) + `operator` (contains, equals, gt, lt) + `value`
- Actions can set `category`, `type`, `note`, etc.
- Triggered during CSV import or manual transaction creation

### 3.4 分类树 / Category Tree

- Self-referencing `parentId` enables unlimited nesting
- Tree traversal utility in `src/lib/tree-utils.ts`
- Each category has `color`, `icon`, `sortOrder`

## 4. 数据流 / Data Flow

### Transaction CRUD Flow

```
User Action → Page Component → API Client (src/lib/api.ts)
  → HTTP Request → API Route (src/app/api/transactions/)
    → Server Logic (src/server/transactions.ts)
      → Prisma ORM → MySQL
    ← JSON Response
  ← Update UI
```

### CSV Import Flow

```
Upload CSV → Preview API (parse + validate + detect duplicates)
  → User maps fields → Confirm Import
    → Import API (apply rules → create transactions → return results)
```

## 5. 安全性 / Security

- Session-based authentication via `SESSION_SECRET`
- File upload deduplication via content hash
- Input validation on both client and server
- Permission checks in API routes (prepared for multi-user)

## 6. 性能优化 / Performance

- **Pagination**: All list APIs support `page`/`pageSize` parameters
- **Indexing**: Database indexes on frequently queried columns
- **Image optimization**: sharp for server-side image processing
- **Chart lazy rendering**: `ChartGuard` component defers recharts rendering until container is visible
- **Font optimization**: local Inter font with `display: swap`
