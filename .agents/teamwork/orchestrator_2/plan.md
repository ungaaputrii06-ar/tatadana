# Execution Plan — TataDana Project Orchestration (orchestrator_2)

## Goal
Deliver full TataDana SaaS personal finance platform meeting 100% acceptance criteria across all 5 milestones with a coordinated 15-person team, passing all tests, build checks, and forensic audit.

## Milestones & Schedule
- **Phase 0 & M1 (Completed by orchestrator_1)**:
  - Codebase survey & architecture mapping (3 agents) - DONE
  - Supabase DB Schema & RLS Migrations (worker_db_1, reviewer_db_1) - DONE (134/134 unit tests passing)

- **Milestone 2: Indonesian NL AI Parser & Telegram Webhook**:
  - Dispatch `worker_telegram_ai_2`:
    - Harden `/api/telegram/webhook`: Strict idempotency (skip duplicate `update_id`), sub-1.5s latency (`X-Response-Time-Ms`), error handling.
    - Polish `src/lib/ai/parser.ts` & `src/lib/telegram-parser.ts`: Ensure robust Indonesian slang/nominal parsing ("15rb", "500k", "1.5jt", "2.5m", "Rp 50.000", "beli bakso 15rb", "kopi 25k", "gajian 5jt"), category and wallet mapping.
    - Implement resilient `AIProviderManager` in `src/lib/ai/provider-manager.ts`: Gemini, OpenAI, DeepSeek with priority failover, structured JSON extraction, and telemetry logging to `ai_logs` / `mockStore.aiLogs`.
    - Bot commands (`/start`, `/bantuan`, `/saldo`, `/hari ini`, `/bulan ini`) and budget threshold notifications (80% & 100%).
    - Run tests to ensure all unit tests pass.
  - Dispatch `reviewer_telegram_ai_1`: Review code quality, idempotency, latency, and parser accuracy.
  - Dispatch `challenger_telegram_ai_1`: Empirically stress-test parser and webhook idempotency.
  - Dispatch `auditor_telegram_ai_1`: Forensic integrity verification.
  - Gate check for M2.

- **Milestone 3: User Dashboard, Multi-Wallet, Budget, Reports & Exports**:
  - Dispatch `worker_dashboard_reports_1`:
    - Ensure Electric Blue & Obsidian Slate/Black dark theme consistency (eliminate any residual orange `#FF6B00`).
    - Verify responsive layout (375px mobile to 1280px+ desktop).
    - Multi-wallet (BCA, Mandiri, GoPay, OVO, Dompet Tunai) with real-time balance and inter-wallet transfer.
    - Multi-period budgets (daily, weekly, monthly) with visual progress bars.
    - Native reports page with search, filters (category, wallet, date range), and on-demand PDF (`jspdf`) & Excel (`xlsx`) exports with WIB timestamps.
    - Cashflow calendar and Tata AI Web Drawer with date picker, transaction type, and source wallet.
    - In-app Bot Simulator (interactive chat, receipt OCR simulation, voice note simulation).
    - Two-way sync between Bot and Web transactions.
  - Dispatch `reviewer_dashboard_reports_1`: Full review of UI/UX, exports, and data flow.
  - Gate check for M3.

- **Milestone 4: Superadmin Controls, Multi-AI Settings & Impersonation**:
  - Dispatch `worker_admin_superadmin_1`:
    - Superadmin auth: Login with `ungaaputrii@gmail.com` and password `1234`.
    - User approval/rejection workflows and Midtrans manual payment verification.
    - Admin multi-AI provider settings (toggle single/failover) and AI call logs inspection.
    - User impersonation (view user dashboard without re-authenticating).
    - User management and complete data export.
    - Profile management with instant avatar sync.
  - Dispatch `reviewer_admin_superadmin_1`: Verify security, permissions, and admin capabilities.
  - Gate check for M4.

- **Milestone 5: E2E Verification, Adversarial Hardening & Forensic Audit**:
  - Dispatch `challenger_e2e_1`: Run comprehensive opaque-box E2E test suite (Tiers 1-4) and adversarial stress tests.
  - Dispatch `auditor_final_1`: Run complete forensic audit for zero hardcoding/cheating.
  - Final synthesis, gate pass, and handoff report to caller.
