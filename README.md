# Workshop ERP (نظام إدارة ورش الألمنيوم والحديد)

An offline-first, multi-tenant ERP system built specifically for aluminium and steel fabrication workshops. Powered by React, TypeScript, Capacitor, and SQLite with immutable double-entry accounting, inventory management with weighted average costing (WAC), manufacturing execution, and background synchronization via the Outbox pattern.

---

## 🌟 Key Capabilities

1. **Double-Entry Accounting Engine**
   - Standard 5-digit chart of accounts hierarchy (Assets `10000`, Liabilities `20000`, Equity `30000`, Revenue `40000`, Expenses `50000`).
   - Immutable posted journal entries with complete audit trail and reversal mechanisms.
   - Real-time generation of Trial Balance, General Ledger, Profit & Loss (Income Statement), and Balance Sheet.
   - Preserves raw negative debit/credit balances for correct contra-accounts, liabilities, and equity balances.

2. **Inventory & Costing Engine**
   - Real-time stock valuation using chronological **Weighted Average Costing (WAC)** computed directly from immutable stock movements.
   - Multi-warehouse stock tracking, stock in/out/adjustments, and minimum threshold alerts.

3. **Operations & Sales Workflow**
   - Quotation to Sales Invoice conversions with customizable 5% sales tax and payment tracking.
   - Purchase Orders to Supplier Bills with automated inventory receiving and account payable ledger postings.
   - Customer payment receipts and supplier disbursements linked to multi-cash registers and bank accounts.

4. **Fabrication & Manufacturing**
   - Dimension-driven Bills of Materials (BOM) for sliding windows, doors, handrails, and curtain walls.
   - Automated profile cut lists and cutting waste estimation.
   - Multi-stage manufacturing work orders (Cutting, Assembly, Glazing, Quality Inspection, Ready for Delivery).

5. **Offline-First & Outbox Sync Architecture**
   - Local-first persistence in SQLite (via Web SQLite Driver in browser and Native SQLite on Capacitor mobile).
   - Atomic local commits writing business data and sync outbox events simultaneously.
   - Idempotent background synchronization queue with exponential backoff and network state monitoring.

6. **Bilingual & RTL-First UI**
   - Arabic-first RTL interface with seamless one-click English LTR toggle.
   - High-contrast responsive interface optimized for workshop desks, tablets, and field mobile devices.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd workshop-erp

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

### Type Checking & Linting
```bash
npm run lint
```

### Running Automated Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## 📁 Project Architecture & Directory Structure

```
├── src/
│   ├── components/            # UI Views and Layout Components (lazy loaded)
│   │   ├── AccountingView.tsx   # Double-entry ledger, P&L, balance sheet, trial balance
│   │   ├── ArchitectureView.tsx # ADR documentation & offline-sync status
│   │   ├── DashboardView.tsx    # High-level KPIs, recent activity, alerts
│   │   ├── Header.tsx           # Bilingual switch, tenant switcher, sync status
│   │   ├── InventoryView.tsx    # Product catalog, stock valuation & movements
│   │   ├── ManufacturingView.tsx# Production work orders, cutting lists & BOM
│   │   ├── OperationsView.tsx   # Quotations, Invoices, Purchase Orders, Payments
│   │   ├── ReviewGateView.tsx   # Clarifications & architectural decisions
│   │   ├── SettingsView.tsx     # Company profile, cash accounts, tax configuration
│   │   └── Sidebar.tsx          # Navigation sidebar
│   ├── context/
│   │   └── ERPContext.tsx       # Global application state, database hooks & actions
│   ├── db/
│   │   ├── databaseService.ts   # SQLite database coordinator & migrations
│   │   ├── sqliteDriver.ts      # Web SQLite & Capacitor Native SQLite drivers
│   │   ├── seed.ts              # Initial chart of accounts, products, and defaults
│   │   └── types.ts             # SQLite schema and entity type definitions
│   ├── repositories/          # Type-safe Repository Pattern layer
│   │   ├── ChartOfAccountsRepository.ts
│   │   ├── JournalEntriesRepository.ts
│   │   ├── PaymentsRepository.ts
│   │   ├── ProductsRepository.ts
│   │   ├── PurchasesRepository.ts
│   │   ├── SalesRepository.ts
│   │   ├── StockRepository.ts
│   │   └── SyncOutboxRepository.ts
│   ├── services/              # Domain Business Logic & Engines
│   │   ├── accountingEngine.ts     # Pure accounting balance & report calculators
│   │   ├── AccountingReportsService.ts # Repository-backed financial reporting
│   │   ├── AtomicTransactionService.ts # Multi-entity atomic operations
│   │   ├── inventoryEngine.ts      # Chronological WAC & stock valuation calculator
│   │   ├── seedData.ts             # Initial demo datasets for workshops
│   │   └── syncEngine.ts           # Outbox background sync worker
│   ├── tests/                 # Unit and Integration test suites (Vitest)
│   │   ├── accountingEngine.test.ts # Accounting, WAC & pure engine unit tests
│   │   ├── phase3.test.ts           # End-to-end repository & workflow tests
│   │   └── testRunner.ts            # In-app test runner
│   ├── types/
│   │   └── index.ts           # Domain models, enums, and TypeScript interfaces
│   ├── App.tsx                # App root with code-splitting
│   ├── main.tsx               # DOM entry point
│   └── index.css              # Global Tailwind CSS styles
├── metadata.json              # Applet metadata
├── package.json               # Project manifest and scripts
├── tsconfig.json              # TypeScript strict configuration
└── vite.config.ts             # Vite build configuration
```

---

## 🛡️ License
Proprietary — Workshop ERP. All rights reserved.
