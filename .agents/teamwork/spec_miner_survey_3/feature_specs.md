# TataDana SaaS: Complete Feature Inventory, Acceptance Criteria & Implementation Gap Analysis

**Author**: Spec Miner 3 (teamwork_preview_spec_miner)  
**Date**: 2026-10-17  
**Working Directory**: `C:\Users\User\.gemini\antigravity\scratch\tatadana`  
**Reference Document**: `ORIGINAL_REQUEST.md`

---

## 1. Specification Sources & Authoritative Scope

This specification was mined through direct inspection of:
1. **`ORIGINAL_REQUEST.md`**: Core user requirements across R1 (Telegram & AI Bot), R2 (Dashboard & FinTech engine), R3 (Superadmin suite), and R4 (Supabase RLS database).
2. **Next.js 14 Codebase (`src/app/`, `src/lib/`, `src/components/`)**: 29 pages, 29 API routes, and 32 library services.
3. **Database Migrations (`supabase/migrations/`)**: `20241010000000_initial_schema.sql`, `20261010000000_tatadana_init.sql`, and `20261011000000_recurring_bills_and_budget_periods.sql`.
4. **Automated Test Suite (`src/tests/run-all-tests.ts`)**: 1,950 lines of unit and integration test assertions covering currency parsing, bot commands, turbo boosts, plan limits, report generators, and audit compliance.

---

## 2. Features Discovered (Complete Feature Inventory)

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| **F-01** | R1: Bot & AI | Telegram Webhook Receiver | Endpoint receiving live updates from Telegram Bot `@ungakeuanganbot` | JSON update payload with `update_id` and `message` | JSON `{ok: true, reply: string, type: string}` | Returns HTTP 500 on parse error; skips duplicate | `src/app/api/telegram/webhook/route.ts` |
| **F-02** | R1: Bot & AI | Webhook Idempotency Protection | Anti-duplication mechanism discarding duplicate `update_id` to prevent double-charging or duplicate transactions | Telegram `update_id` integer | `{status: "skipped", message: "Update ID already processed"}` | Duplicate updates are ignored without side effects | `src/lib/telegram/long-poller.ts:135` |
| **F-03** | R1: Bot & AI | Indonesian Currency Amount Parsing | Parsing colloquial amounts ("15rb", "15 ribu", "500k", "1.5jt", "1,5jt", "2.5m", "Rp 50.000") | Raw text string | Standardized integer in IDR (e.g. 15000, 1500000, 2500000000) | Returns `null` if no nominal detected | `src/lib/ai/parser.ts:12` |
| **F-04** | R1: Bot & AI | Natural Language Transaction Parsing | Structured JSON extraction of type (`expense`/`income`/`transfer`), amount, category, and notes from Indonesian natural text | Sentences (e.g., "beli bakso 15rb", "gajian 5jt ke bca") | `{type, amount, category, notes, is_ambiguous}` | Returns `is_ambiguous: true` with suggested format examples | `src/lib/ai/parser.ts:149`, `src/lib/telegram-parser.ts:68` |
| **F-05** | R1: Bot & AI | Colloquial Wallet Resolution | Automatic resolution of payment source based on text keywords ("tunai", "cash", "bca", "gopay", "mandiri", "ovo") | Free text sentence | Target `Wallet` object (e.g. Dompet Tunai, BCA Prioritas) | Defaults to primary/default wallet | `src/lib/telegram-parser.ts:276` |
| **F-06** | R1: Bot & AI | In-App Telegram Bot Simulator | Interactive in-browser chat terminal simulating `@ungakeuanganbot` with real-time UI updates | Chat input, quick chip clicks | Formatted ASCII receipt slip with progress bar & budget feedback | Displays user-facing warning toast on error | `src/app/dashboard/simulator/page.tsx` |
| **F-07** | R1: Bot & AI | Simulated OCR Receipt Scanner | One-click button in simulator simulating multi-item grocery receipt processing (AI Vision OCR) | Simulated photo attachment | 3 itemized lines (susu, roti, air) totaling Rp85.000 recorded to DB | Rejects with Pro upgrade modal for starter tier | `src/lib/telegram/long-poller.ts:196` |
| **F-08** | R1: Bot & AI | Simulated Voice Note STT | In-app simulator button mimicking Indonesian voice note audio note | Simulated voice note payload (<=60s) | Audio transcript parsed and recorded as transaction | Rejects voice notes >60s with length warning | `src/lib/telegram/long-poller.ts:265` |
| **F-09** | R1: Bot & AI | Web Tata AI Bot Transaction Form | Dedicated interface with date picker (Hari Ini/Kemarin), type toggle, and wallet selector (BCA, GoPay, Tunai) | Form values (date, type, wallet, amount, category, notes) | Instant sync to dataStore & `/api/transactions`, balance deduction | Rejects invalid nominals with validation error | `src/app/dashboard/tata-ai/page.tsx:62` |
| **F-10** | R1: Bot & AI | Conversational AI Financial Advisor | Natural language financial coach answering budget and savings questions in bot and web | Free-form questions (e.g. "strategi hemat akhir bulan") | Context-aware Indonesian advice referencing real balances | Fallbacks to rule-based advice if LLM is offline | `src/lib/telegram-parser.ts:432`, `src/app/api/ai/chat/route.ts` |
| **F-11** | R1: Bot & AI | Bot Telegram Commands | Full slash commands: `/saldo`, `/hari ini`, `/minggu ini`, `/bulan ini`, `/budget`, `/kalender`, `/tanya`, `/sheet`, `/boost`, `/bantuan` | Slash command text | Rich formatted Markdown text with balance & budget metrics | Returns guidance list if command unrecognized | `src/lib/telegram-parser.ts:340`, `src/lib/telegram/commands.ts` |
| **F-12** | R1: Bot & AI | Telegram Long Polling Engine | Development background daemon polling Telegram API when webhook is unavailable in localhost | Bot API Token from `.env.local` or Settings | Synchronous event pipeline execution | Automatic backoff on 429, restart on 409 conflict | `src/lib/telegram/long-poller.ts:425` |
| **F-13** | R2: Dashboard | Electric Blue & Obsidian Slate Theme | Modern generative UI in `#2563EB` (Electric Blue), `#00D2FF` (Cyan), and `#090D16`/`#0F172A` (Obsidian) | Responsive viewport 375px–1280px | Consistent dark fintech aesthetic | N/A | `tailwind.config.ts`, `src/app/dashboard/page.tsx` |
| **F-14** | R2: Dashboard | Period Filtering (1 Hari, 7 Hari, 1 Bulan, Tahunan) | Overview metric filter recalculating cashflow, expenses, and transaction lists by active period | Click period button | Recomputed income, expense, and category breakdowns | Defaults to 'bulanan' | `src/app/dashboard/page.tsx:114` |
| **F-15** | R2: Dashboard | Multi-Wallet System | Support for BCA, Mandiri, GoPay, OVO, and Dompet Tunai with real-time balance calculations | Wallet ID, name, balance, color | Wallet cards with default badge and balance display | Cannot delete wallet with active balance | `src/app/dashboard/wallets/page.tsx` |
| **F-16** | R2: Dashboard | Inter-Wallet Transfer | Fund transfer moving money between any two wallets with single atomic transaction entry | Source wallet, target wallet, amount, notes | Source balance -X, target balance +X, transfer logged | Validates source != destination, amount > 0 | `src/app/dashboard/wallets/page.tsx:127` |
| **F-17** | R2: Dashboard | Multi-Period Category Budgeting | Budget limits set per category across Daily, Weekly, Monthly, and Yearly periods | Category ID, amount, period type | Progress bar, spent vs limit, percentage visual | Warning if amount <= 0 | `src/app/dashboard/budgets/page.tsx:38` |
| **F-18** | R2: Dashboard | Proactive Budget Alerts (80% & 100%) | Automated Telegram warnings when a category expense reaches 80% or exceeds 100% of allocation | Transaction insert trigger | Warning block appended to Telegram receipt slip | Alert sent flag prevents repetitive spam | `src/lib/telegram-parser.ts:246` |
| **F-19** | R2: Dashboard | Proactive Large Expense Advisor | Pro-tier alert triggering when single transaction consumes >=20% of category monthly budget | Transaction amount & category budget | In-reply advice note suggesting spending moderation | Suppressed for starter plan users | `src/lib/telegram-parser.ts:616` |
| **F-20** | R2: Dashboard | Native Financial Reports | Transaction report with search query, category filter, wallet filter, type filter, and date ranges | Search string, dropdown filters, date inputs | Paginated transaction table with sorting by date & amount | Empty state shown if 0 matches | `src/app/dashboard/reports/page.tsx:115` |
| **F-21** | R2: Dashboard | On-Demand PDF Report Export | Client-downloadable official PDF report with summary cards and itemized table with WIB timestamps | User ID, active date filters | Valid binary `.pdf` file (`%PDF` header, A4 format) | HTTP 403 with upgrade prompt if limit reached | `src/lib/reports/pdf-generator.ts:17` |
| **F-22** | R2: Dashboard | On-Demand Excel (.xlsx) & CSV Export | Multi-sheet spreadsheet generator with Ringkasan, Transaksi, and OCR Receipt Items | User ID, active date filters | Valid binary `.xlsx` (ZIP `PK` magic bytes) or CSV text | Downloads fallback file on error | `src/lib/reports/excel-generator.ts:15` |
| **F-23** | R2: Dashboard | Download History Log | History table tracking every generated PDF/Excel export file | User ID | List of previous downloads with date, file format, size | Empty placeholder when no prior exports | `src/app/api/reports/history/route.ts` |
| **F-24** | R2: Dashboard | Interactive Cashflow & Bills Calendar | Calendar grid showing daily income/expense tags, drilldown modal, and recurring bill due dates | Month/Week view selector, date click | Detailed date transaction breakdown modal & quick add form | Handles month boundaries cleanly | `src/app/dashboard/calendar/page.tsx:27` |
| **F-25** | R2: Dashboard | Recurring Bills Schedule | Management of recurring utility bills (PLN, PDAM, Internet) with due dates | Bill name, amount, category, due date | Calendar badge indicator and reminder list | Validates amount > 0 | `src/app/api/recurring-bills/route.ts` |
| **F-26** | R3: Admin | Superadmin Login Authentication | Dedicated credential verification for `ungaaputrii@gmail.com` with password `1234` | Email and password string | JWT session / state update & redirect to `/admin` | Displays error toast for wrong email/password | `src/app/auth/login/page.tsx:112` |
| **F-27** | R3: Admin | Manual Payment Approval / Rejection | Verification flow for Midtrans and manual bank transfer upgrade orders | Order ID, approve/reject action | User upgraded to Pro instantly; status updated | Validates admin role before update | `src/app/admin/payments/page.tsx:30` |
| **F-28** | R3: Admin | Multi-Provider AI Configuration | Management of Gemini, OpenAI, and DeepSeek credentials, models, and priority ranking | API keys, active toggle, priority number | Config saved and hot-reloaded into provider pool | Masks API keys in UI for privacy | `src/app/admin/ai-providers/page.tsx:54` |
| **F-29** | R3: Admin | AI Single vs Failover Mode Toggle | Switch between single default provider and automatic fallback chain upon API timeout/error | Mode selection ('single' vs 'failover') | Updated `ai_settings` record | Defaults to 'failover' | `src/lib/ai/provider-manager.ts:34` |
| **F-30** | R3: Admin | AI Execution & Cost Logs | Audit log table displaying prompt tokens, completion tokens, latency (ms), and call status | Log filter parameters | Tabular telemetry history with success/fail badges | Immutable log retention | `src/app/admin/ai-logs/page.tsx:8` |
| **F-31** | R3: Admin | User Management & Plan Upgrade | Admin table of all registered users with direct plan toggles (Starter <-> Pro) | User ID, target plan | User plan updated in database; audit log written | Rejects non-existent user ID with 404 | `src/app/api/admin/users/route.ts:19` |
| **F-32** | R3: Admin | 1-Click User Account Impersonation | Allows Superadmin to view dashboard as specific user without knowing user's password | Target User ID | Session swapped to user context; redirects to `/dashboard` | Audit log `IMPERSONATE_USER` recorded with timestamp | `src/app/admin/users/page.tsx:69` |
| **F-33** | R3: Admin | Platform Data Export All | Complete database export of users, transactions, and payments into single Excel or PDF file | Format param (`excel` or `pdf`) | Streaming file download with timestamped filename | Reverts to JSON if generator fails | `src/app/api/admin/export-all/route.ts:8` |
| **F-34** | R3: Admin | Admin Profile & Avatar Instant Sync | Profile modal to switch avatar among 5 presets or custom image upload | Image file or preset avatar URL | Instant update across all UI navigation elements via event | Validates image size <= 5MB | `src/app/admin/page.tsx:85` |
| **F-35** | R3: Admin | Immutable Admin Audit Trail | Security log recording all administrative actions (impersonation, plan modifications, payment approvals) | System event trigger | Detailed audit log entry with admin name, target, and payload | Cannot be modified or deleted by user | `src/app/admin/audit-logs/page.tsx:8` |
| **F-36** | R4: Database | Supabase Migration Declarations | SQL definitions in `supabase/migrations/` defining tables, foreign keys, triggers, and indices | Migration scripts | Declarative schema for PostgreSQL in Supabase | Transaction rollback on syntax or type error | `supabase/migrations/` |
| **F-37** | R4: Database | Row Level Security (RLS) Policies | Tenant data isolation ensuring users only access their own records | Supabase `auth.uid()` | RLS policy rules (`USING (auth.uid() = user_id)`) | Unauthorized access yields empty result or error | `supabase/migrations/20241010000000_initial_schema.sql:225` |
| **F-38** | R4: Database | Automated Balance Trigger Function | PostgreSQL trigger adjusting wallet balance on transaction insert or delete | Insert/Delete on `transactions` | Automatic addition or deduction from `wallets.balance` | Reversible on transaction deletion | `supabase/migrations/20261010000000_tatadana_init.sql:229` |
| **F-39** | R1/Bot | Reminder Turbo Boost System | Telegram bot acceleration commands (`/boost`, `/boost percepat`, `/boost 5 menit lebih cpt`, `/boost extreme`) | Time shift expressions | Shifts daily reminder times (12:00 -> 11:55 / 11:45 / 11:30) | Anti-false positive guard protects financial texts | `src/lib/reminder-scheduler.ts:40` |
| **F-40** | R1/Bot | Multi-Tier Turbo Escalation | Stepped escalation moving from Level 1 (10m/15m buffer) to Level 2 Extreme Turbo (30m buffer) on repeated command | Repeated `/boost` command | Level 2 confirmation reply with instant reminder simulation | Status check via `/boost status` | `src/tests/run-all-tests.ts:704` |

---

## 3. Acceptance Criteria & Test Verification Matrix

| AC # | Requirement | Acceptance Criteria | Existing Test / Assertion | Status | Verification Method |
|------|-------------|---------------------|---------------------------|--------|---------------------|
| **AC-01** | R1: AI Parser | Parsing Indonesian nominals ("15rb", "500k", "1.5jt", "1,5jt", "2.5m", "Rp 50.000") is 100% accurate | `src/tests/run-all-tests.ts:56-79` tests all nominal patterns | **PASS** | `parseIndonesianAmount()` unit tests pass |
| **AC-02** | R1: AI Parser | Ambiguous input without nominal or intent triggers clear error reply with examples | `src/tests/run-all-tests.ts:99` verifies `is_ambiguous: true` & guidance text | **PASS** | Test case: input `"halo bot"` returns formatting tips |
| **AC-03** | R1: Webhook | Webhook is idempotent, ignoring identical `update_id` retries and replying under 1.5s | `src/lib/telegram/long-poller.ts:136`, `webhook/route.ts:11` checks `processedUpdateIds` | **PASS** | Send identical `update_id` twice; 2nd returns status `skipped` |
| **AC-04** | R1: Simulator | In-app simulator and real Telegram bot write to database & synchronize dual stores | `src/tests/run-all-tests.ts:1309` tests dual-store synchronization | **PASS** | Verify transaction added via simulator updates `dataStore` & `mockStore` |
| **AC-05** | R1: Tata AI Web | Transactions entered via Tata AI Bot (with date & wallet BCA/GoPay/Tunai) appear in Transaksi & Laporan | `src/app/dashboard/tata-ai/page.tsx:97` dispatches `tatadana_data_updated` & posts to API | **PASS** | Form submit updates wallet balance, transaction table, and reports |
| **AC-06** | R2: Dashboard | UI adheres strictly to Electric Blue & Obsidian Slate/Black generative theme | `tailwind.config.ts`, `dashboard/page.tsx` | **PARTIAL** | Core dashboard is in Blue & Obsidian Slate, but admin & simulator still contain `#FF6B00` |
| **AC-07** | R2: Wallets | Multi-Wallet (BCA, Mandiri, GoPay, OVO, Tunai) supports inter-wallet balance transfers | `src/tests/run-all-tests.ts:321` tests transfer balance calculations | **PASS** | Transfer Rp100k from BCA to Tunai updates both balances |
| **AC-08** | R2: Budgets | Multi-period budgets (Daily, Weekly, Monthly) alert at 80% and 100% | `src/tests/run-all-tests.ts:1180-1209`, `reply-formatter.ts` | **PASS** | Verify alert messages triggered at 80% and 100% usage thresholds |
| **AC-09** | R2: Reports | Native reports page offers keyword search, category, wallet, and date filters | `src/app/dashboard/reports/page.tsx:115` | **PASS** | Filter transactions by date range and category in reports view |
| **AC-10** | R2: Exports | Export PDF and Excel (.xlsx) generates valid files with WIB timestamps | `src/tests/run-all-tests.ts:1846-1917` verifies `%PDF` & `PK` headers and non-zero bytes | **PASS** | Download test exports; verify magic bytes and `Asia/Jakarta` timestamp |
| **AC-11** | R2: Calendar | Financial calendar displays daily cashflow status and upcoming recurring bill agenda | `src/app/dashboard/calendar/page.tsx:85`, test: `run-all-tests.ts:1214` | **PASS** | `/kalender` command and calendar UI display cashflow tags & PLN/IndiHome bills |
| **AC-12** | R3: Superadmin | Superadmin accepts `ungaaputrii@gmail.com` and password `1234` | `src/app/auth/login/page.tsx:112`, test: `run-all-tests.ts:1776` | **PASS** | Submit login with admin email and `1234`; successfully routes to `/admin` |
| **AC-13** | R3: Approval | Admin Approve action updates user plan to Pro and verifies payment instantly | `src/tests/run-all-tests.ts:1266`, `src/app/admin/payments/page.tsx:30` | **PASS** | Click Approve on pending payment; user plan becomes `pro` with unlimited limits |
| **AC-14** | R3: AI Failover | Multi-provider AI supports single and automatic failover modes with call logs | `src/lib/ai/provider-manager.ts:34`, `src/app/admin/ai-providers/page.tsx` | **PASS** | Verify failover execution and log entry in `ai_logs` |
| **AC-15** | R3: Impersonation | Superadmin can impersonate user without re-login and write audit log | `src/app/admin/users/page.tsx:69`, `src/app/admin/page.tsx:116` | **PASS** | Click Impersonate; routes to dashboard with user context; audit log recorded |
| **AC-16** | R3: Profile Sync | Changing Superadmin avatar syncs immediately across UI navigation | `src/app/admin/page.tsx:85` broadcasts `tatadana_profile_updated` event | **PASS** | Select avatar preset; verify avatar icon updates in header and sidebar |
| **AC-17** | R4: Database | All 10 core tables defined in `supabase/migrations` with RLS protection | Migrations in `supabase/migrations/` | **PARTIAL** | All 10 tables exist across migration files, but table naming varies and `ai_logs` lacks explicit RLS enable |

---

## 4. Implementation Gap Analysis

### 4.1 Implemented Features (Fully Functional)
1. **Indonesian Natural Language Parsing (`parseIndonesianAmount`, `parseNaturalLanguageInput`)**: Fully implemented and passes all unit tests for all currency shorthand conventions.
2. **Webhook Idempotency (`processTelegramUpdate`)**: Anti-duplication via set tracking for `update_id`.
3. **Multi-Wallet Balance Engine**: Real-time balance deductions, additions, and inter-wallet transfers.
4. **Multi-Period Budget Calculations**: Scales budgets accurately across Daily, Weekly, Monthly, and Yearly periods.
5. **Interactive Financial Calendar**: Cashflow aggregates and recurring bill agenda.
6. **PDF & Excel Binary Report Generators**: Generates valid `%PDF` and `.xlsx` buffers with WIB timestamps.
7. **Superadmin Login Authentication**: Validates `ungaaputrii@gmail.com` with password `1234`.
8. **Admin Payment Approval Flow**: Upgrades user from Starter to Pro and writes audit logs.
9. **Turbo Boost Acceleration Engine**: Multi-tier escalation (5m, 10m, 15m, 30m Level 2 Extreme Turbo) with anti-false-positive regex protection.
10. **Data Export All Platform Records**: Admin route generating complete platform backups in `.xlsx`, `.pdf`, and `.json`.

---

### 4.2 Partially Implemented Features (Gaps Identified)
1. **Design System & Theme Inconsistency (Electric Blue & Obsidian Slate vs Legacy Orange)**:
   - *Current State*: `tailwind.config.ts` has the correct Electric Blue (`#2563EB`) and Obsidian Slate tokens. The user dashboard (`dashboard/page.tsx`), Tata AI (`dashboard/tata-ai/page.tsx`), Wallets (`dashboard/wallets/page.tsx`), Budgets (`dashboard/budgets/page.tsx`), and Calendar (`dashboard/calendar/page.tsx`) follow Electric Blue and Obsidian Slate.
   - *Gap*: Several admin pages (`admin/page.tsx`, `admin/ai-providers/page.tsx`, `admin/ai-logs/page.tsx`, `admin/payments/page.tsx`, `admin/users/page.tsx`), `TelegramSimulatorModal.tsx`, and `pdf-generator.ts` (line 30: `#f97316`) still use legacy orange `#FF6B00` / `#f97316`.
   - *Required Action*: Harmonize remaining admin and export styling to Electric Blue (`#2563EB`) and Obsidian Slate (`#090D16`/`#0F172A`).

2. **Web Tata AI Bot Persistent Drawer / Modal**:
   - *Current State*: Fully implemented as a full page (`/dashboard/tata-ai`) with quick date picker, type selector, and wallet dropdown (BCA, GoPay, Tunai).
   - *Gap*: While the page exists, a persistent global floating drawer / modal accessible from any dashboard page (as described in dispatch) is currently only hooked up to the simulator modal (`TelegramSimulatorModal.tsx`).
   - *Required Action*: Ensure Tata AI Bot input with date, type, and source wallet can be triggered via a global drawer/modal on all dashboard screens.

3. **Supabase Schema & Table Naming Duality**:
   - *Current State*: Migrations exist across 3 SQL files (`20241010000000_initial_schema.sql`, `20261010000000_tatadana_init.sql`, and `20261011000000_recurring_bills_and_budget_periods.sql`).
   - *Gap*: Duality exists between schemas:
     - `profiles` vs `users_profile`
     - `payments` vs `subscriptions_midtrans`
     - `admin_audit_logs` vs `audit_logs`
     - `export_history` vs `export_records`
     - `ai_logs` is defined but lacks explicit `ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;` and policy creation.
   - *Required Action*: Create a unified clean migration that aligns table names precisely to the 10 core tables (`users`, `wallets`, `categories`, `transactions`, `budgets`, `recurring_bills`, `ai_logs`, `export_records`, `midtrans_payments`, `audit_logs`) and enables RLS on all 10 tables.

4. **Multi-Provider AI Execution Integration**:
   - *Current State*: `AIProviderManager` has the complete failover architecture and logs to `mockStore.aiLogs`. Gemini service is implemented.
   - *Gap*: OpenAI and DeepSeek provider callers in `AIProviderManager.callProvider()` currently return `null` (stubs), relying on the fallback/heuristic parser.
   - *Required Action*: Implement live or simulated fetch adapters for OpenAI (`https://api.openai.com/v1/chat/completions`) and DeepSeek (`https://api.deepseek.com/chat/completions`) to demonstrate seamless multi-provider failover.

---

### 4.3 Missing Features (To Be Implemented in Phase 2)
1. **Persistent Global Drawer for Tata AI Bot**: Add a floating drawer/modal component on user dashboard allowing instant transaction recording with date, type, and wallet without navigating away from the current page.
2. **Unified RLS Migration for All 10 Core Tables**: A consolidated migration in `supabase/migrations` that defines all 10 tables with exact names and complete RLS policies for user isolation and admin override.
3. **Complete Color Theme Alignment**: Sweep all remaining `#FF6B00` hex codes in `src/app/admin/` and PDF generator to Electric Blue `#2563EB` and Obsidian Slate.

---

## 5. Edge Cases & Boundary Conditions

| # | Feature | Input / Edge Case | Observed / Expected Behavior |
|---|---------|-------------------|-----------------------------|
| **E-01** | AI Amount Parser | Comma decimal: `"1,5jt"` or `"2,5m"` | Correctly parses Indonesian decimal comma as period; yields `1500000` and `2500000000`. |
| **E-02** | AI Amount Parser | Shorthand multipliers: `"500k"`, `"15rb"`, `"15 ribu"`, `"25.000"` | Yields exact integer without floating-point drift: `500000`, `15000`, `25000`. |
| **E-03** | AI Amount Parser | Non-transaction greetings: `"halo bot"`, `"ping"`, `"siapa kamu"` | Identifies input as non-transactional; returns `is_ambiguous: true` with formatting examples. |
| **E-04** | Anti-False-Positive | Financial texts containing speed words: `"percepat bayar hutang 50rb"`, `"cepetan belanja 100k"` | Correctly recognized as **financial transaction**, NOT as `/boost` command. |
| **E-05** | Telegram Idempotency | Duplicate update retry: Same `update_id` delivered 2x within 500ms | 1st execution records transaction; 2nd execution returns `{status: "skipped"}`. |
| **E-06** | Starter Tier Limit | 51st monthly transaction attempt on Starter plan | Blocked with message `"Batas Transaksi Tercapai! Paket Starter dibatasi 50 transaksi/bulan"` and upgrade link. |
| **E-07** | Receipt OCR Guard | Starter plan user sends photo receipt | Blocked with message `"Fitur Catat via Foto Struk hanya tersedia untuk pengguna TataDana Pro!"`. |
| **E-08** | Timezone Accuracy | Transaction recorded at `2026-10-17T03:00:00Z` (UTC) | Displayed as `10:00 WIB` in PDF, Excel, and Telegram replies. |
| **E-09** | Inter-Wallet Transfer | Source wallet has exactly Rp100.000, transfer Rp100.000 to GoPay | Source balance drops to 0, GoPay increases by Rp100.000, transaction recorded as transfer. |
| **E-10** | Inter-Wallet Transfer | User selects identical source and destination wallet | Transfer blocked with error `"Dompet asal dan tujuan tidak boleh sama."`. |
| **E-11** | Turbo Boost Midnight Wrap | Shift `00:05 WIB` 10 minutes earlier | Returns `23:55 WIB` with clean day/hour boundary wrap. |
| **E-12** | Superadmin Auth | Email with whitespace or uppercase: `" UngaAputrii@gmail.com "` | Normalized to lowercase/trimmed; accepts password `1234` and routes to `/admin`. |
| **E-13** | Superadmin Auth | Invalid password for admin email: `"ungaaputrii@gmail.com"` with password `"wrong"` | Access denied with explicit error message; does not redirect. |

---

## 6. Architectural Invariants & Interface Contracts

1. **Telegram Webhook API Contract**:
   - `POST /api/telegram/webhook`: Accepts Telegram `Update` object. Returns JSON `{ ok: boolean, reply: string, type: string, transaction?: any }` with response header `X-Response-Time-Ms`.
2. **Transaction Recording Contract**:
   - Every transaction write MUST synchronously update the associated wallet balance.
   - For expenses, the corresponding category budget's `spent_amount` MUST be updated.
   - For starter users, `transactions_this_month` MUST be incremented.
3. **Data Sync Contract**:
   - Any client-side transaction addition MUST dispatch `window.dispatchEvent(new CustomEvent('tatadana_data_updated'))` to update all active dashboard widgets.
4. **Timezone Contract**:
   - All client-facing timestamps, reports, and filenames MUST be rendered in Western Indonesia Time (`WIB`, UTC+7).
5. **Database Multi-Tenancy & RLS Invariant**:
   - Every private financial record (`wallets`, `transactions`, `budgets`, `recurring_bills`) MUST belong to a `user_id` and have active RLS policies preventing cross-user data leakage.
