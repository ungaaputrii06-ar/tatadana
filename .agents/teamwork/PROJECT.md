# Project: TataDana SaaS Personal Finance Platform

## Architecture
TataDana is an enterprise-grade Indonesian personal finance SaaS built on Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase Postgres, and Telegram Bot integration.

### Core Architectural Layers:
1. **Frontend Presentation**:
   - Dark mode modern Generative UI: Electric Blue (`#2563EB`, `#00D2FF`) and Obsidian Slate/Black (`#090D16`, `#0F172A`).
   - Responsive layouts (375px mobile to 1280px+ desktop).
   - Global Navigation, bilingual routing (`/transaksi` & `/transactions`, `/laporan` & `/reports`, etc.).
   - Interactive Bot Simulator with real-time chat, receipt OCR simulation, and voice note simulation.
   - Tata AI Quick Entry Drawer/Modal with date picker, transaction type, source wallet selection (BCA, GoPay, Tunai, Mandiri).
2. **Backend Services & API Layer**:
   - REST API endpoints under `src/app/api/`.
   - Telegram Webhook `/api/telegram/webhook` with strict idempotency (anti-duplication of `update_id`), sub-second response latency (< 1.5s).
   - Multi-Provider AI Engine (`AIProviderManager`) supporting Gemini, OpenAI, and DeepSeek with parallel failover and logging.
   - Deterministic Indonesian Slang Parser (`parseIndonesianAmount`) resolving shorthand denominations ("15rb", "500k", "1.5jt", "2.5m", "Rp 50.000").
   - PDF & Excel Binary Generation (`jspdf`, `xlsx`) with WIB (`Asia/Jakarta`) timestamps.
3. **Data & Persistence Layer**:
   - Supabase PostgreSQL declarative migrations in `supabase/migrations/` with Row Level Security (RLS) on all 10 core tables.
   - Dual-store architecture: `dataStore` (client-side) and `mockStore` (server-side) synchronized via `tatadana_data_updated` custom event and `long-poller.ts`.
4. **Security & Superadmin Controls**:
   - Role-Based Access Control: User vs Superadmin (`ungaaputrii@gmail.com` / `1234`).
   - User approval/rejection workflows, Midtrans manual payment verification.
   - User impersonation for administrative audit without password re-entry.
   - Immutable audit logging in `admin_audit_logs`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Telegram Bot Webhook | `/api/telegram/webhook` accepting updates | M2 | R1 |
| 2 | Webhook Idempotency | Anti-duplication filtering for identical `update_id` | M2 | R1, AC-03 |
| 3 | Fast Webhook Latency | Response time < 1.5s with `X-Response-Time-Ms` header | M2 | R1, AC-03 |
| 4 | Indonesian Slang Parser | Accurate parsing of "15rb", "500k", "1.5jt", "Rp 50.000" | M2 | R1, AC-01 |
| 5 | Multi-Provider AI Fallback | Gemini, OpenAI, DeepSeek priority failover | M2 | R3 |
| 6 | AI Telemetry Logs | Log all AI prompts, tokens, latency, status to `ai_logs` | M2 | R3 |
| 7 | Telegram Bot Commands | `/start`, `/bantuan`, `/saldo`, `/hari ini`, `/bulan ini` | M2 | R1, AC-04 |
| 8 | Telegram Budget Alerts | Auto notification when category budget reaches 80% & 100% | M2 | R2 |
| 9 | In-App Bot Simulator Chat | Real-time interactive chat testing interface | M3 | R1 |
| 10 | Receipt OCR Simulation | Image upload simulation extracting structured line items | M3 | R1 |
| 11 | Voice Note Simulation | Voice note audio simulation with speech-to-text | M3 | R1 |
| 12 | Web Tata AI Drawer/Modal | Quick entry with date picker, type, source wallet | M3 | R1 |
| 13 | Two-Way Bot Sync | Transactions recorded via Bot appear in web instantly | M3 | R1, AC-04 |
| 14 | Electric Blue & Obsidian Theme | 100% consistent palette (#2563EB, #090D16, #0F172A) | M3 | R2, AC-14 |
| 15 | Responsive Layout | Seamless rendering from 375px mobile to 1280px desktop | M3 | R2, AC-14 |
| 16 | Multi-Wallet System | Support BCA, Mandiri, GoPay, OVO, Dompet Tunai | M3 | R2 |
| 17 | Real-Time Wallet Balance | Live balance calculations and transaction balance triggers | M1, M3 | R2 |
| 18 | Inter-Wallet Transfer | Fund transfer between wallets with balance adjustment | M3 | R2 |
| 19 | Multi-Period Budgets | Daily, Weekly, and Monthly budget allocations | M3 | R2 |
| 20 | Budget Progress Bars | Visual spent indicators with threshold warnings | M3 | R2 |
| 21 | Native Reports View | Searchable, filterable transactions by category/wallet/date | M3 | R2 |
| 22 | On-Demand PDF Export | Valid PDF report generation with WIB timestamps | M3 | R2, AC-10 |
| 23 | On-Demand Excel Export | Valid `.xlsx` workbook generation with WIB timestamps | M3 | R2, AC-10 |
| 24 | Export Download History | Persistent audit list of generated export files | M3 | R2 |
| 25 | Interactive Cashflow Calendar | Day-by-day cashflow breakdown and upcoming bills | M3 | R2 |
| 26 | Superadmin Authentication | Login with `ungaaputrii@gmail.com` and password `1234` | M4 | R3, AC-12 |
| 27 | Admin User Approval Flow | Approve/Reject new user registrations instantly | M4 | R3, AC-13 |
| 28 | Midtrans Payment Verification | Manual verification and approval of subscription upgrade | M4 | R3, AC-13 |
| 29 | Multi-AI Provider Settings | Admin toggle between single and parallel failover modes | M4 | R3 |
| 30 | Admin AI Call Logs | Table view of all AI requests with token and latency | M4 | R3 |
| 31 | Admin User Management | List, filter, and view user details and activity | M4 | R3 |
| 32 | User Impersonation | Admin view of user dashboard without re-authenticating | M4 | R3 |
| 33 | Complete Data Export | Superadmin export of all user and transaction data | M4 | R3 |
| 34 | User Profile Management | Name, email, settings editing | M3, M4 | R3 |
| 35 | Avatar Photo Sync | Change avatar image and synchronize across all UI | M3, M4 | R3 |
| 36 | Declarative Supabase Migrations | 10 core tables defined in `supabase/migrations/` | M1 | R4 |
| 37 | Row Level Security (RLS) | Declarative RLS policies on all user data tables | M1 | R4 |
| 38 | Database Balance Triggers | Automatic wallet balance sync on INSERT/DELETE | M1 | R4 |
| 39 | E2E Opaque-Box Test Suite | Tiers 1-4 comprehensive test suite | M5 | AC-01..14 |
| 40 | Adversarial Stress & Integrity Audit | Binary veto forensic verification of genuine logic | M5 | Hard Veto |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Supabase DB Schema & RLS Migrations | Harmonize migration files, ensure all 10 core tables have RLS policies, triggers, and types | Survey complete | DONE |
| M2 | Indonesian NL AI Parser & Telegram Webhook | Webhook idempotency, sub-1.5s latency, slang parsing ("15rb", "500k", "1.5jt"), multi-AI provider adapters | M1 | DONE |
| M3 | User Dashboard, Theming & Reports | Eliminate residual orange (#FF6B00), harmonize Electric Blue & Obsidian Slate, Tata AI drawer, PDF/Excel export | M1, M2 | DONE |
| M4 | Superadmin Controls & Multi-AI Failover | Login `ungaaputrii@gmail.com`/`1234`, user/payment approval, user impersonation, AI settings | M1, M2 | DONE |
| M5 | Security Hardening & WhatsApp 2FA | Strict admin role guard, user WhatsApp verification, profile inspector modal | M1, M2, M3, M4 | DONE |
| M6 | Modern & Responsive Web Login Interface | Obsidian background, centered rounded card, capsule switcher, password toggle, WhatsApp help desk, route sync | M1..M5 | DONE |
| M7 | E2E Testing, Adversarial Verification & Audit | Tiers 1-4 test suite, adversarial coverage hardening, Forensic Integrity verification (zero tolerance) | M1..M6 | DONE |

---

## Interface Contracts
### Webhook API Contract (`/api/telegram/webhook`)
- Method: `POST`
- Input: Telegram `Update` JSON payload containing `update_id` (number) and `message` object.
- Response: Status `200 OK`, JSON `{ ok: true, status: 'processed' | 'skipped', reply?: string }`.
- Header: `'X-Response-Time-Ms'` indicating execution time in milliseconds.

### AI Parser Service Contract (`src/lib/ai/parser.ts`)
- Function: `parseIndonesianAmount(text: string): { amount: number; isExpense: boolean } | null`
- Function: `parseTransactionWithAI(text: string, options?: ParseOptions): Promise<ParsedTransaction>`
- Returns: `{ amount: number, type: 'income' | 'expense', category: string, description: string, wallet: string, confidence: number }`

### Supabase Core Tables
- Tables: `users` (or `profiles`), `wallets`, `categories`, `transactions`, `budgets`, `recurring_bills`, `ai_logs`, `export_records`, `midtrans_payments`, `audit_logs`.
- Security: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY ON <table> FOR ALL USING (auth.uid() = user_id);`

### Export Service Contract (`src/lib/reports/`)
- PDF: `generateTransactionPDF(transactions, filters, summary): Promise<Uint8Array>` -> Valid `%PDF` header.
- Excel: `generateTransactionExcel(transactions, filters, summary): Promise<Uint8Array>` -> Valid ZIP `PK` header.
- Timezone: Formatted with WIB (`Asia/Jakarta`, UTC+7).

---

## Code Layout
- `src/app/`: Next.js App Router pages and API routes.
- `src/components/`: Reusable UI components, modals, navigation, and Tata AI drawer.
- `src/lib/`: Backend and client utilities (AI parser, Telegram poller, PDF/Excel generator, storage stores).
- `supabase/migrations/`: Declarative SQL migration files.
- `src/tests/`: Automated unit and integration test suites.
