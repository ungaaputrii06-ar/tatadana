# Comprehensive Survey: Codebase Structure & Build Architecture

**Project**: TataDana (FinTech Management & Telegram Bot SaaS)  
**Surveyed by**: Explorer 1 (Codebase & Build Architecture)  
**Date**: 2026-10-17  
**Working Directory**: `C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_survey_1`  
**Reference Spec**: `C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

TataDana is built on **Next.js 14.2.24** using the **App Router (`src/app`)**, **TypeScript 5.7.3**, and **Tailwind CSS 3.4.17**. The architecture implements a full-stack SaaS solution comprising:
- A responsive web client configured with dark theme by default (Obsidian Slate `#090D16` and Electric Blue `#2563EB`).
- An API layer of 29 REST endpoints under `src/app/api/` supporting Telegram webhooks, multi-provider AI routing, multi-wallet cashflow, multi-period budgets, payment gateway approvals, and financial exports (PDF/Excel/CSV).
- Dual-tier data layer: Declarative Supabase PostgreSQL migrations with Row-Level Security (RLS) and triggers in `supabase/migrations/`, backed by high-performance in-memory mock repositories (`src/lib/supabase/mock-store.ts` with secondary inverted indexes and `src/lib/storage-mock.ts`) and `fastCache` for instant offline development and zero-external-dependency execution.
- A custom test runner (`src/tests/run-all-tests.ts`) executing via `jiti` with 1950 lines of comprehensive unit and integration tests covering Indonesian slang nominal parsing, idempotency, limits, generators, and admin compliance.

---

## 2. Build & Tooling Architecture

### 2.1 Package Configuration (`package.json`)
- **Package Name & Version**: `"name": "tatadana"`, `"version": "1.0.0"`, `"private": true` (`package.json:1-4`)
- **Scripts** (`package.json:5-12`):
  - `"dev": "next dev"` — Development server on port 3000
  - `"build": "next build"` — Next.js production build
  - `"start": "next start"` — Production server
  - `"lint": "next lint"` — ESLint check
  - `"test": "node ./node_modules/jiti/bin/jiti.js src/tests/run-all-tests.ts"` — Custom TypeScript test suite executed via bundled `jiti`
  - `"bot:poll": "node ./node_modules/jiti/bin/jiti.js src/scripts/poll-telegram.ts"` — Standalone long-polling runner
- **Core Production Dependencies** (`package.json:13-24`):
  - `@supabase/supabase-js: ^2.48.0` — Database client & auth
  - `clsx: ^2.1.1` & `tailwind-merge: ^2.6.0` — Conditional class merging
  - `jspdf: ^2.5.2` & `jspdf-autotable: ^3.8.4` — Native client/server PDF generation
  - `lucide-react: ^0.475.0` — Modern fintech icon set
  - `next: ^14.2.24` — App Router framework
  - `react: ^18.3.1` & `react-dom: ^18.3.1` — UI library
  - `xlsx: ^0.18.5` — Spreadsheet (.xlsx and .csv) generation
- **Dev Dependencies** (`package.json:25-33`):
  - `typescript: ^5.7.3`
  - `@types/node: ^20.17.19`, `@types/react: ^18.3.18`, `@types/react-dom: ^18.3.5`
  - `tailwindcss: ^3.4.17`, `postcss: ^8.5.2`, `autoprefixer: ^10.4.20`

### 2.2 Next.js Configuration (`next.config.js`)
- **Path**: `C:\Users\User\.gemini\antigravity\scratch\tatadana\next.config.js`
- **Startup Directory Hygiene** (`next.config.js:5-12`): Automatically deletes redundant `src/app/(auth)` if detected to prevent Next.js App Router collision with `src/app/auth/`.
- **Compiler & Performance Settings** (`next.config.js:15-35`):
  - `reactStrictMode: true`, `swcMinify: true`, `compress: true`, `poweredByHeader: false`
  - `compiler.removeConsole`: Filters `console.log` in production, preserving `error` and `warn`
  - `images.remotePatterns`: Allows `https://**` (used for avatars from Unsplash)
  - `experimental.instrumentationHook: true` — Boots `src/instrumentation.ts` on server startup
  - `experimental.serverComponentsExternalPackages: ['jspdf', 'xlsx']`
  - `experimental.optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge']`
- **HTTP Headers Configuration** (`next.config.js:36-56`):
  - Public static cache headers for `/_next/static/:path*` (max-age 31536000, immutable)
  - Custom API acceleration headers for `/api/:path*`: `X-Turbo-Boost: active-turbo-accelerated`, `X-Acceleration-Level: extreme-level-2`, `X-Cache-Warmup: ready`, `X-Content-Type-Options: nosniff`.

### 2.3 TypeScript Configuration (`tsconfig.json`)
- **Path**: `C:\Users\User\.gemini\antigravity\scratch\tatadana\tsconfig.json`
- **Compiler Options** (`tsconfig.json:2-25`):
  - `target`: `"es2020"`
  - `downlevelIteration`: `true` (enables Map/Set iterations across ES targets)
  - `lib`: `["dom", "dom.iterable", "esnext"]`
  - `module`: `"esnext"`, `moduleResolution`: `"bundler"`
  - `strict`: `true`, `noEmit`: `true`, `isolatedModules`: `true`
  - `paths`: `"@/*": ["./src/*"]` (Global path alias mapping)
- **Includes/Excludes** (`tsconfig.json:26-27`):
  - `include`: `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`
  - `exclude`: `["node_modules", "src/tests", "src/scripts"]` (Isolates test runner from production build bundle)

### 2.4 Styling & Design System (Tailwind & PostCSS)
- **Configuration Files**:
  - `postcss.config.js` (`lines 1-6`): Configures `tailwindcss` and `autoprefixer`.
  - `tailwind.config.js` (`lines 1-41`) & `tailwind.config.ts` (`lines 1-58`):
    - `darkMode: 'class'`
    - `content`: `./src/pages/**/*.{...}`, `./src/components/**/*.{...}`, `./src/app/**/*.{...}`
    - Extended Colors:
      - `brand.500` / `brand.blue`: `#2563EB` (Electric Blue)
      - `brand.cyan`: `#00D2FF`
      - `brand.darkBg`: `#090D16` (Obsidian Black)
      - `brand.darkCard`: `#0F172A` (Obsidian Slate)
      - `brand.darkBorder`: `#1E293B`
      - `brand.darkHover`: `#172033`
      - `surface`: Scale from `surface-50` (`#f8fafc`) to `surface-950` (`#090d16`)
    - Custom Glow Box Shadows:
      - `soft`: `0 2px 15px -3px rgba(0, 0, 0, 0.3)...`
      - `blueGlow`: `0 0 25px -5px rgba(37, 99, 235, 0.45)`
      - `cyanGlow`: `0 0 20px -3px rgba(0, 210, 255, 0.4)`
- **Global CSS (`src/app/globals.css`)**:
  - CSS Variables (`globals.css:5-23`): `--background: #090D16`, `--foreground: #F8FAFC`, `--primary-blue: #2563EB`, `--primary-cyan: #00D2FF`, `--card-bg: #0F172A`, `--border-color: #1E293B`.
  - Utility Classes: `.glow-blue`, `.glow-cyan`, `.text-gradient-blue`, custom sleek scrollbar.
  - Print Media Query (`globals.css:92-181`): A4 portrait formatting, hides non-printable navigation/drawers (`.no-print`, `nav`, `aside`, `button`), converts dark backgrounds to clean high-contrast paper backgrounds (`#ffffff`, text `#111827`).
- **Styling Inconsistency Observation**:
  - While `RootLayout` and `LandingPage` enforce Electric Blue & Obsidian Slate, several child components still contain residual orange colors (`#FF6B00`, `#FFA14D`, `bg-orange-50`):
    - `src/components/ThemeToggle.tsx` (line 58: `text-[#FF6B00]`)
    - `src/components/TelegramSimulatorModal.tsx` (lines 155, 229: orange gradient and bubble)
    - `src/app/admin/payments/page.tsx` (line 73: `text-[#FF6B00]`, white card backgrounds)
    - `src/app/admin/users/page.tsx` (line 107: `text-[#FF6B00]`, white card backgrounds)
    - `src/app/onboarding/page.tsx` & `src/app/auth/verify-otp/page.tsx` (residual orange styling)

---

## 3. Codebase Structure & Directory Analysis

### 3.1 Root Layout & Server Lifecycle
- **`src/app/layout.tsx`**:
  - Root HTML tag with `lang="id" className="dark"`
  - Imports Google Font `Plus Jakarta Sans` (weights 300 to 800)
  - Body class: `min-h-screen bg-[#090D16] text-[#F8FAFC] antialiased selection:bg-blue-600 selection:text-white`
- **`src/instrumentation.ts`**:
  - Hooks into Next.js server boot (`register()`) when `NEXT_RUNTIME === 'nodejs'` and phase is not build/test.
  - Dynamically imports `@/lib/telegram/long-poller` and initializes `telegramLongPoller.start()`.

### 3.2 Routing Topology (`src/app/`)
Total of 29 `page.tsx` routes structured under App Router:

| Route Path | File Location | Purpose & Features |
|---|---|---|
| `/` | `src/app/page.tsx` | Main landing page: Hero with ambient blue glow, pricing toggle (monthly/lifetime), 7 FAQs, dynamic demo buttons |
| `/login` | `src/app/login/page.tsx` | Compatibility alias wrapper delegating to `/auth/login` |
| `/register` | `src/app/register/page.tsx` | Compatibility alias wrapper delegating to `/auth/register` |
| `/auth/login` | `src/app/auth/login/page.tsx` | Email/password login with demo shortcut parameter (`?demo=admin` or `?demo=bunga`) |
| `/auth/register` | `src/app/auth/register/page.tsx` | New user onboarding registration |
| `/auth/verify-otp` | `src/app/auth/verify-otp/page.tsx` | Phone OTP verification screen |
| `/auth/forgot-password` | `src/app/auth/forgot-password/page.tsx` | Password reset interface |
| `/onboarding` | `src/app/onboarding/page.tsx` | Multi-step category and wallet setup wizard |
| `/teamwork-preview` | `src/app/teamwork-preview/page.tsx` | Standalone preview for multi-agent architecture |
| `/dashboard` | `src/app/dashboard/page.tsx` | User dashboard overview: total balance across wallets, budget progress bars, recent transactions, quick actions |
| `/dashboard/transactions` | `src/app/dashboard/transactions/page.tsx` | Transaction ledger with search, filtering, and manual entry |
| `/dashboard/transaksi` | `src/app/dashboard/transaksi/page.tsx` | Indonesian alias re-exporting `/dashboard/transactions` |
| `/dashboard/reports` | `src/app/dashboard/reports/page.tsx` | Native reports page with sortable table, expandable receipt items, on-demand PDF/Excel/CSV exports, and download history |
| `/dashboard/laporan` | `src/app/dashboard/laporan/page.tsx` | Indonesian alias re-exporting `/dashboard/reports` |
| `/dashboard/budgets` | `src/app/dashboard/budgets/page.tsx` | Multi-period budget manager (Daily, Weekly, Monthly, Yearly) with 80% & 100% threshold indicators |
| `/dashboard/budget` | `src/app/dashboard/budget/page.tsx` | Indonesian alias re-exporting `/dashboard/budgets` |
| `/dashboard/wallets` | `src/app/dashboard/wallets/page.tsx` | Multi-wallet management (BCA, Mandiri, GoPay, Tunai), balance view, inter-wallet transfers, default wallet selector |
| `/dashboard/wallet` | `src/app/dashboard/wallet/page.tsx` | Indonesian alias re-exporting `/dashboard/wallets` |
| `/dashboard/calendar` | `src/app/dashboard/calendar/page.tsx` | Interactive financial calendar displaying daily cashflow breakdown and upcoming recurring bills |
| `/dashboard/tata-ai` | `src/app/dashboard/tata-ai/page.tsx` | In-app conversational Tata AI Bot with interactive transaction recorder (date picker, type, BCA/GoPay/Tunai selector) synced two-way |
| `/dashboard/simulator` | `src/app/dashboard/simulator/page.tsx` | Full-page interactive Telegram bot simulator |
| `/dashboard/teamwork` | `src/app/dashboard/teamwork/page.tsx` | 10 Specialist Teams monitoring dashboard |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | User profile settings, avatar upload, Telegram webhook linking, daily reminders config |
| `/admin` | `src/app/admin/page.tsx` | Superadmin overview: metrics, quick approval queue, AI config, user table, audit stream, avatar switcher |
| `/admin/users` | `src/app/admin/users/page.tsx` | User management: list, plan upgrade/downgrade, user transaction audit modal, impersonation, Excel export |
| `/admin/payments` | `src/app/admin/payments/page.tsx` | Midtrans & manual bank transfer approval queue (Approve/Reject buttons) |
| `/admin/ai-providers` | `src/app/admin/ai-providers/page.tsx` | Multi-provider AI manager: Gemini, GPT-4o-mini, DeepSeek (single/failover toggle, API key masking) |
| `/admin/ai-logs` | `src/app/admin/ai-logs/page.tsx` | AI call monitoring: token counts, latency, cost in IDR, fallback status |
| `/admin/audit-logs` | `src/app/admin/audit-logs/page.tsx` | Admin audit trail logging every admin action accessing user data |

### 3.3 Layout Hierarchy
1. **Root Layout** (`src/app/layout.tsx`): Sets global theme container, dark background (`#090D16`), Plus Jakarta Sans font, and viewport settings.
2. **Dashboard Layout** (`src/app/dashboard/layout.tsx`):
   - Integrates sticky desktop `Sidebar.tsx` and mobile hamburger drawer.
   - Provides global floating "Simulator Bot" action button (bottom-right) launching `TelegramSimulatorModal`.
   - Dispatches `tatadana_data_updated` window events upon simulated transactions to trigger reactive re-fetching across dashboard tabs.
3. **Admin Layout** (`src/app/admin/layout.tsx`):
   - Admin sidebar with navigation to 6 admin modules.
   - Built-in superadmin credentials handler (`ungaaputrii@gmail.com` / `1234`) with instant session seeding in `localStorage` and `dataStore`.

### 3.4 API Route Endpoints (`src/app/api/`)
Total of 29 `route.ts` API endpoints:

```
src/app/api/
├── admin/
│   ├── ai-logs/route.ts           # GET AI invocation logs
│   ├── ai-providers/route.ts      # GET/PUT AI providers & single/failover mode
│   ├── audit-logs/route.ts        # GET admin audit trails
│   ├── export-all/route.ts        # GET Excel export of all platform users
│   ├── payments/route.ts          # GET/POST approve or reject manual payments
│   ├── user-transactions/route.ts # GET user transactions with admin audit log creation
│   └── users/route.ts             # GET users, PUT plan modification
├── ai/
│   └── chat/route.ts              # POST in-app Tata AI chat with transaction parser
├── auth/
│   ├── otp/route.ts               # POST send/verify mock OTP
│   ├── otp-send/route.ts          # POST generate OTP
│   └── otp-verify/route.ts        # POST verify OTP
├── budgets/route.ts               # GET/POST/PUT multi-period budgets (daily/weekly/monthly/yearly)
├── cache/
│   └── warmup/route.ts            # GET trigger fastCache prefetch
├── categories/route.ts            # GET/POST user expense/income categories
├── cron/
│   └── reminders/route.ts         # GET trigger scheduled reminders & turbo boost
├── payments/
│   ├── create/route.ts            # POST initiate Midtrans payment
│   └── webhook/route.ts           # POST Midtrans HTTP notification webhook
├── recurring-bills/route.ts       # GET/POST/DELETE recurring obligations
├── reports/
│   ├── export-csv/route.ts        # POST on-demand CSV binary export
│   ├── export-excel/route.ts      # POST on-demand XLSX binary export
│   ├── export-pdf/route.ts        # POST on-demand PDF binary export
│   └── history/route.ts           # GET export history records
├── settings/route.ts              # GET/PUT user profile, reminders & avatar
├── telegram/
│   ├── polling/route.ts           # POST start/stop long poller
│   ├── set-webhook/route.ts       # POST set Telegram webhook URL
│   ├── test-connection/route.ts   # POST test Telegram token against Bot API
│   └── webhook/route.ts           # POST Idempotent Telegram webhook handler (<1.5s response)
├── transactions/route.ts          # GET/POST/PUT/DELETE transaction ledger
└── wallets/route.ts               # GET/POST/PUT multi-wallet management & inter-wallet transfers
```

### 3.5 Core Library & Business Logic Architecture (`src/lib/`)
- **Data Stores**:
  - `src/lib/storage-mock.ts`: In-memory singleton `dataStore` with seeded data for Bunga Putri (`usr_bunga_01`) and superadmin Unga Putri (`adm_unga_01`). Features atomic balance updates (`addTransaction`), budget spend tracking, and custom event dispatching (`tatadana_data_updated`, `tatadana_profile_updated`).
  - `src/lib/supabase/mock-store.ts`: In-memory server repository backing Next.js API routes with inverted secondary indexes (`userTxIndex`, `userWalletIndex`, `userBudgetIndex`, `phoneIndex`, `telegramChatIndex`) for O(1) retrieval.
  - `src/lib/supabase.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`: Supabase client definitions using `@supabase/supabase-js`. Includes `isRealSupabaseConfigured()` check for graceful fallback.
  - `src/lib/cache.ts`: `FastCache` in-memory key-value cache with prefix invalidation and prefetching (`prefetchUserFinancialData`).
- **Telegram & NLP Processing**:
  - `src/lib/telegram-parser.ts`: Rule-engine & regex parser for Indonesian currency slang:
    - `"15rb"`, `"15 ribu"` -> `15000`
    - `"500k"` -> `500000`
    - `"1.5jt"`, `"1,5jt"` -> `1500000`
    - `"2.5m"`, `"2.5 miliar"` -> `2500000000`
    - `"Rp 50.000"` -> `50000`
    - Natural language intent classification (`expense`, `income`, `transfer`), category extraction, and wallet target resolution (`BCA`, `GoPay`, `Dompet Tunai`).
  - `src/lib/telegram/long-poller.ts`:
    - Handles update deduplication via global in-memory `processedUpdateIds` Set (Idempotency).
    - Synchronizes incoming bot transactions to both `dataStore` and `mockStore`.
    - Handles Starter plan 50 transaction/month limit enforcement.
    - Handles photo struk (Pro-only) and voice note handling.
  - `src/lib/telegram/commands.ts`: Implements `/saldo`, `/hari ini`, `/minggu ini`, `/bulan ini`, `/budget`, `/boost`, `/bantuan`.
  - `src/lib/telegram/reply-formatter.ts`: ASCII progress bar generator `createProgressBar(percentage, totalBlocks = 10)` (e.g. `[███████░░░] 70%`), structured expense/income reply templates with WIB timestamps.
- **Reporting & Binary Generators**:
  - `src/lib/reports/pdf-generator.ts`: `generateFinancialPDF()` using `jspdf` and `jspdf-autotable`. Produces binary `Uint8Array` starting with `%PDF` header.
  - `src/lib/reports/excel-generator.ts`: `generateFinancialExcel()` using `xlsx`. Produces valid XLSX (ZIP magic bytes `PK\x03\x04`) and CSV binary buffers.
- **AI Engine**:
  - `src/lib/ai/provider-manager.ts`: Multi-provider routing with Single and Failover modes (Gemini -> OpenAI -> DeepSeek).
  - `src/lib/ai/advisor.ts`: Evaluates automated financial advisor trigger rules:
    - Single expense >= 20% of category monthly budget
    - Category budget spend touches 80% or 100%
    - Monthly expenses exceed 80% of total income

---

## 4. Test Framework & Automated Test Suite Analysis

### 4.1 Test Architecture
- **Framework & Runner**: No third-party runner like Vitest or Jest is installed in devDependencies. The project uses a custom, zero-dependency Node.js test runner executed through `jiti` (`src/tests/run-all-tests.ts`).
- **Invocation Command**: `node ./node_modules/jiti/bin/jiti.js src/tests/run-all-tests.ts` (configured as `npm test` in `package.json`).
- **Execution Script**: `src/tests/run-all-tests.ts` contains 1,950 lines of automated assertions using Node.js built-in `assert`.
- **Secondary Test Files**:
  - `src/tests/run-tests.mjs` (620 lines): Pure ESM verification script for core parsers, plan limits, and progress bar formatters.
  - `src/tests/test-break.mjs` (29 lines): Regression check for category resolution.
  - `scripts/test-endpoints.js`: HTTP endpoint status checker.
  - `scripts/test-export.js`: Binary export verification script.

### 4.2 Test Coverage Scope in `run-all-tests.ts`
The test suite verifies:
1. **Indonesian Currency Amount Parsing**:
   - `15rb`, `15 ribu` -> `15,000`
   - `1.5jt`, `1,5jt` -> `1,500,000`
   - `500k` -> `500,000`
   - `2.5m` -> `2,500,000,000`
   - `Rp 50.000` -> `50,000`
   - Ambiguous/null handling
2. **AI Transaction Parsing**:
   - Expense: `"beli bakso 15rb"`
   - Income: `"gajian bulanan 5jt"`
   - Ambiguous input: `"halo bot"`
3. **Telegram Reply Formatters**:
   - Visual progress bar generation (`70% -> ███████░░░`)
   - Expense reply layout with Rupiah formatting and budget progress
   - Income reply layout
4. **Telegram Bot Commands**:
   - `/saldo`, `/hari ini`, `/bulan ini`, `/bantuan`
5. **Subscription Plan Limits**:
   - Starter plan cap at 50 transactions/month
   - Photo struk OCR blocked for Starter, permitted for Pro
   - Unlimited transactions for Pro
6. **AI Financial Advisor Triggers**:
   - Large single expense (>=20% of budget) triggers advisor alert
   - Pro-only enforcement
7. **Report Generators**:
   - PDF generation returns valid Uint8Array buffer (>500 bytes) with `%PDF` header
   - Excel generation returns valid XLSX ZIP container (magic bytes `0x50, 0x4B`)
   - CSV generation contains proper header `TATADANA - LAPORAN KEUANGAN PRIBADI`
8. **Wallet Balance Auto-Calculations**:
   - Expense decreases origin wallet balance
   - Transfer shifts balance between source and destination wallets
9. **Turbo Boost & Schedule Acceleration**:
   - Parsing `/boost 10 mnt lebih cepat`, `5 menit lebih cpt`, `/boost percepat`
10. **Admin Approval & Superadmin Compliance**:
    - Approve payment changes status to `approved_manual` and appends audit log
    - Superadmin profile check (`ungaaputrii06@gmail.com` and `ungaaputrii@gmail.com`)

---

## 5. Database Schema & Migration Architecture (`supabase/migrations/`)

Three migration files define the full database schema:

### 5.1 Migration File Inventory
1. `20241010000000_initial_schema.sql` (275 lines):
   - Defines `profiles`, `wallets`, `categories`, `budgets`, `transactions`, `export_history`, `reminders`, `ai_providers`, `ai_settings`, `ai_logs`, `telegram_webhook_logs`, `admin_audit_logs`.
   - Enables RLS on all user tables with `auth.uid() = user_id` policies.
   - Adds `update_wallet_balance_on_transaction()` trigger on `transactions` table.
2. `20261010000000_tatadana_init.sql` (326 lines):
   - Refines tables: `users_profile`, `transaction_items` (multi-item receipt breakdown for Pro), `subscriptions_midtrans`, `audit_logs`.
   - Comprehensive trigger `handle_transaction_balance()` updating wallets, budget spent amounts, and monthly transaction counts on INSERT/DELETE.
   - Default seed data for system categories and AI providers.
3. `20261011000000_recurring_bills_and_budget_periods.sql` (52 lines):
   - Adds `period_type` (`daily`, `weekly`, `monthly`, `yearly`) and `period_date` to `budgets` table with composite index `idx_budgets_user_period`.
   - Creates `recurring_bills` table with RLS policy and `update_updated_at_column()` trigger.

---

## 6. Key Architecture Findings & Recommendations

| Item | Current Finding | Impact / Recommendation |
|---|---|---|
| **Theme Consistency** | `RootLayout` uses Obsidian Black `#090D16` and Electric Blue `#2563EB`, but several subpages (`admin/payments`, `admin/users`, `ThemeToggle`, `TelegramSimulatorModal`) still use residual orange `#FF6B00` and light backgrounds. | Align remaining residual orange components with Electric Blue (`#2563EB`) and Obsidian Slate (`#0F172A`/`#090D16`) to fully satisfy R2 and Acceptance Criteria. |
| **Admin Email Credential** | Acceptance Criteria specifies `ungaaputrii@gmail.com`. Codebase supports both `ungaaputrii@gmail.com` and `ungaaputrii06@gmail.com` (`admin/layout.tsx:84-85`), but `storage-mock.ts:18` defaults to `ungaaputrii06@gmail.com`. | Ensure `ungaaputrii@gmail.com` is primary across all seed data and login checks. |
| **Tailwind Config Duplication** | Both `tailwind.config.js` and `tailwind.config.ts` exist in the root folder. | Next.js and Tailwind bundlers prioritize `.ts`, but having both can cause confusion. Verify that changes are made to `tailwind.config.ts`. |
| **Windows Script Execution Policy** | Running `npm test` directly in PowerShell can trigger `PSSecurityException` on systems with restricted ExecutionPolicy. | Use `npm.cmd test` or direct `node` invocation when running in Windows shells. |
| **Dual Data Store Architecture** | API routes use `mockStore` (`src/lib/supabase/mock-store.ts`), while client components use `dataStore` (`src/lib/storage-mock.ts`). Transactions are bridged in `long-poller.ts` via `syncTransactionToMockStore` and `window.dispatchEvent('tatadana_data_updated')`. | When modifying data structures or adding new endpoints, ensure changes are mirrored across both stores. |

---

## 7. Verification Evidence Index

- **`package.json`**: Checked dependencies and scripts (`lines 5-33`).
- **`tsconfig.json`**: Checked bundler target, path aliases, excludes (`lines 1-28`).
- **`next.config.js`**: Verified experimental flags, headers, cleanup logic (`lines 1-60`).
- **`tailwind.config.ts` & `globals.css`**: Verified Electric Blue palette and print CSS (`globals.css:1-182`).
- **`src/app/`**: Verified 29 `page.tsx` routes and 29 `route.ts` API endpoints.
- **`src/tests/run-all-tests.ts`**: Verified all 10 test groups across 1,950 lines.
- **`supabase/migrations/`**: Verified all 3 migration SQL files including RLS policies and triggers.
