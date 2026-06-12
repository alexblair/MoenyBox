<p align="center">
  <code>💰 📦</code>
</p>

<h1 align="center">MoneyBox · 记账盒子</h1>

<p align="center">
  <em>银行流水，自动分类</em><br />
  <em>Your bank statements, auto-categorized.</em>
</p>
<p align="center">
  <em>开源智能记账 · 规则引擎自动归类 · 离线 PWA · 自部署</em><br />
  <em>Open-source personal finance with a built-in rule engine · Offline PWA · Self-hosted</em>
</p>

<p align="center">
  <a href="#features">English</a> ·
  <a href="#%E5%8A%9F%E8%83%BD%E7%89%B9%E6%80%A7">中文</a>
</p>

---

## 为什么是 MoneyBox？ · Why MoneyBox?

### 痛点 / The Problem

| 场景 | 现有方案的问题 |
|------|---------------|
| **银行流水导入** | YNAB/Quicken 靠人工逐条分类，耗时易错；Excel 更是体力活 |
| **家庭共用账本** | 钱迹/随手记多账户共享难，权限一团糟 |
| **数据隐私** | 主流 App 全部上云，你的消费数据就是它的训练数据 |
| **断网寸步难行** | 大部分自部署工具无离线支持，手机没信号就没法记账 |
| **定制不够** | 要么订阅付费，要么功能阉割，没有自己的规则 |

| Scenario | The Problem |
|----------|-------------|
| **Bank statement import** | YNAB/Quicken requires manual categorization — tedious and error-prone |
| **Shared family finance** | Most apps lack fine-grained permission control |
| **Data privacy** | All mainstream apps are cloud-only — your spending data is their training data |
| **No offline mode** | Most self-hosted tools can't work without internet |
| **Not customizable** | Pay subscription or get a crippled free version — never your rules |

### 方案 / The Solution

```
MoneyBox = 规则引擎自动化 + 离线 PWA 可靠性 + 自部署隐私 + 企业级权限
         = Rule engine automation + Offline PWA reliability + Self-hosted privacy + Enterprise permissions
```

| 维度 | MoneyBox | YNAB | 钱迹/随手记 | 自部署方案 |
|------|----------|------|------------|-----------|
| **规则引擎** | ✅ 条件-动作引擎，正则/包含/比较，多场景触发 | ❌ 简单规则，有限 | ❌ 无 | 部分有但简陋 |
| **CSV 导入** | ✅ 智能映射+校验+去重+规则自动修正 | ✅ 有但无规则 | ✅ 有 | ❌ 简陋 |
| **离线可用** | ✅ PWA + IndexedDB 全套缓存 | ❌ 必须在线 | ✅ 但数据上云 | ❌ 几乎没有 |
| **权限体系** | ✅ 10 级权限，账户/组粒度 | ❌ 无 | ❌ 无 | ❌ 无 |
| **自部署** | ✅ 一行命令，数据在自己手里 | ❌ 纯 SaaS | ❌ 纯 SaaS | ✅ 但体验粗糙 |
| **模板** | ✅ 树形模板，层级组织，快速记账 | ❌ 无 | ✅ 简单 | ❌ 无 |

### 适合谁？ / Who Is It For?

- **个人理财控** — 要自动化、要规则、不要手动分类
- **家庭财务共管** — 多账户权限管控，各看各的账
- **隐私优先派** — 你的消费数据只属于你
- **自部署爱好者** — Docker 一键部署，MySQL 自己管
- **开发者** — 全栈 Next.js + TypeScript，改源码随心所欲

- **Automation seekers** — Rules do the boring categorization work
- **Family finance managers** — Granular permission control for shared accounts
- **Privacy advocates** — Your spending data never leaves your server
- **Self-hosting enthusiasts** — One-command Docker deployment
- **Developers** — Full-stack Next.js + TypeScript, fork and customize freely

---

## 功能特性

| 模块 | 功能 |
|------|------|
| **交易管理** | 收入/支出/转账 完整 CRUD · 批量操作 · 重复检测 · 克隆 |
| **分类体系** | 多层级树形分类 · 拖拽排序 · 图标选择 · 颜色标记 |
| **账户管理** | 银行/信用卡/虚拟账户 · 账户分组 · 账户归档 · 余额查看 |
| **CSV 导入** | 智能字段映射 · 预览校验 · 规则自动修正 · 重复检测 |
| **规则引擎** | 条件-动作规则 · 分组管理 · 导入/手动触发 |
| **交易模板** | 树形模板 · 快速记账 · 层级组织 |
| **仪表盘** | 月度收支趋势图 · 分类支出饼图 · 总资产概览 · 快捷记账入口 |
| **报表系统** | 收支报表 · 净资产趋势 · 分类分析 · 月度汇总 |
| **权限系统** | 10 级精细化权限 · 按账户/组配置 · 为多用户预留 |
| **PWA 支持** | 离线运行 · 可安装到桌面 · IndexedDB 离线缓存 |
| **附件管理** | 交易关联图片 · hash 去重存储 |
| **暗色模式** | 亮色/暗色/跟随系统 |
| **全局搜索** | Cmd+K 快速搜索 · 交易/账户/分类 |
| **响应式设计** | 桌面 + 移动端 H5 自适应 |

---

## Features

| Module | Description |
|--------|-------------|
| **Transaction Management** | Full CRUD for income/expense/transfer · Batch operations · Duplicate detection · Clone |
| **Category System** | Multi-level tree categories · Drag sorting · Icon picker · Color labels |
| **Account Management** | Bank/Credit/Virtual accounts · Account groups · Archiving · Balance overview |
| **CSV Import** | Smart field mapping · Preview validation · Rule auto-fix · Duplicate detection |
| **Rule Engine** | Condition-action rules · Group management · Trigger on import/manual |
| **Transaction Templates** | Tree-structured templates · Quick entry · Hierarchical organization |
| **Dashboard** | Monthly income/expense chart · Category donut chart · Net worth · Quick actions |
| **Reports** | Income/expense report · Net worth trend · Category analysis · Monthly summary |
| **Permission System** | 10-level granular permissions · Per-account/group config · Multi-user ready |
| **PWA Support** | Offline capable · Installable · IndexedDB offline cache |
| **Attachment Management** | Transaction images · Hash-based dedup storage |
| **Dark Mode** | Light/Dark/System |
| **Global Search** | Cmd+K quick search · Transactions/Accounts/Categories |
| **Responsive Design** | Desktop + Mobile H5 |

---

## Tech Stack · 技术栈

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 6 |
| **Database** | MySQL · Prisma 5 ORM |
| **Styling** | Tailwind CSS 4 · shadcn/ui (Radix UI) |
| **Charts** | Recharts |
| **State** | Zustand |
| **Offline** | Dexie.js (IndexedDB) |
| **CSV** | PapaParse |
| **Icons** | Lucide React |
| **Notifications** | Sonner |
| **Testing** | Vitest |

---

## Getting Started · 快速开始

### Prerequisites · 前置要求

- Node.js >= 18
- MySQL >= 8.0
- npm / pnpm / yarn

### Installation · 安装

```bash
# 1. Clone the repository
git clone <repo-url> && cd moneybox

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MySQL connection string:
# DATABASE_URL="mysql://user:password@localhost:3306/moneybox"

# 4. Setup database
npx prisma db push

# 5. (Optional) Seed demo data
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build · 生产部署

```bash
npm run build
npm start
```

---

## Deployment · 部署

### Docker (Recommended)

```dockerfile
# Example Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Vercel

```bash
# Deploy to Vercel with MySQL (e.g., PlanetScale, Aiven)
vercel --prod
```

Add environment variable `DATABASE_URL` in Vercel dashboard.

---

## Project Structure · 项目结构

```
moneybox/
├── src/
│   ├── app/                 # Next.js App Router (pages + API)
│   │   ├── transactions/    # Transaction CRUD pages
│   │   ├── accounts/        # Account management
│   │   ├── categories/      # Category management
│   │   ├── reports/         # Reports pages
│   │   ├── templates/       # Transaction templates
│   │   ├── rules/           # Rule engine
│   │   ├── import/          # CSV import
│   │   ├── users/           # User management
│   │   ├── user-groups/     # User group management
│   │   ├── account-groups/  # Account group management
│   │   └── api/             # REST API routes
│   ├── components/          # Shared UI components
│   │   ├── ui/              # shadcn/ui primitives
│   │   └── transactions/    # Transaction-specific components
│   ├── lib/                 # Utilities (api, auth, db, offline)
│   ├── server/              # Server-side business logic
│   └── types/               # TypeScript type definitions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Demo data seeder
├── public/                  # Static assets (icons, manifest, sw)
├── scripts/                 # Development scripts
└── __tests__/               # Test files
```

---

## API Overview · API 概览

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/transactions` | List / Create transactions |
| `GET/PUT/DELETE` | `/api/transactions/[id]` | Single transaction CRUD |
| `POST` | `/api/transactions/batch` | Batch operations |
| `GET` | `/api/transactions/duplicates` | Duplicate detection |
| `GET/POST` | `/api/categories` | List / Create categories |
| `GET/PUT/DELETE` | `/api/categories/[id]` | Single category CRUD |
| `POST` | `/api/categories/batch-delete` | Batch delete categories |
| `POST` | `/api/categories/batch-update` | Batch update categories |
| `GET/POST` | `/api/accounts` | List / Create accounts |
| `GET/PUT/DELETE` | `/api/accounts/[id]` | Single account CRUD |
| `GET/POST` | `/api/account-groups` | Account group management |
| `GET` | `/api/dashboard` | Dashboard data |
| `GET` | `/api/reports/*` | Report data (net-worth, income-expense, category-breakdown, monthly-summary) |
| `POST` | `/api/import/csv` | CSV import |
| `POST` | `/api/import/preview` | Import preview with validation |
| `GET/POST` | `/api/templates` | Transaction templates |
| `GET/POST` | `/api/rules/groups` | Rule groups |
| `GET/POST` | `/api/rules/apply` | Apply rules |
| `GET/POST` | `/api/users` | User management |
| `GET/POST` | `/api/auth/*` | Authentication |
| `GET/PUT` | `/api/account-permissions` | Fine-grained permissions |

---

## Database Schema · 数据库设计

```
Category ◄──┐
             │
             ├── Transaction ──── Attachment
             │       │
Account ◄────┘       │
  │                   └── Account (toAccount, transfer target)
  │
  ├── AccountGroupMember ─── AccountGroup
  │
  └── AccountPermission

TransactionTemplate (tree hierarchy)

RuleGroup ─── Rule ─── RuleCondition
                 └── RuleAction

User ─── UserGroupMember ─── UserGroup ─── GroupPermission
```

### Key Models · 核心模型

- **Transaction** — `type` (INCOME/EXPENSE/TRANSFER), `amount`, `category`, `account`, `toAccount`, `note`, `dateTime`
- **Category** — Tree structure via self-referencing `parentId`, with `color`, `icon`, `sortOrder`
- **Account** — `type` (BANK/CREDIT_CARD/VIRTUAL), `balance`, `archived`
- **AccountGroup** — Logical grouping of accounts with `color` and `icon`
- **Rule** — Condition-action engine for auto-categorization during import/manual entry
- **TransactionTemplate** — Tree-structured templates for quick entry
- **User/UserGroup** — Multi-user ready with group-based permissions

---

## Scripts · 常用命令

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Lint all files |
| `npm test` | Run tests |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

---

## Environment Variables · 环境变量

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL connection string | Yes |
| `NEXT_PUBLIC_APP_URL` | Public application URL | No |
| `SESSION_SECRET` | Session encryption secret | Yes |

---

## License · 许可

MIT License

---

## Preview · 预览

| Dashboard | Transactions | Reports |
|-----------|-------------|---------|
| `📊💰📈` | `📋💳📝` | `📉📊📋` |
