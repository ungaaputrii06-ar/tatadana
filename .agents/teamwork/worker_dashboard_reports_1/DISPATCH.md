## 2026-10-17T13:35:58Z
You are Worker Dashboard & Reports 1 for Milestone 3 of TataDana.
Working Directory: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_dashboard_reports_1
Original Request Path: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document Path: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\PROJECT.md
Orchestrator Conversation ID: 6321f19e-92d2-4704-896d-d7385ea25eb6

Read ORIGINAL_REQUEST.md and PROJECT.md carefully before doing anything else.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Write Ownership:
- src/app/
- src/components/
- src/lib/reports/
- src/lib/pdf/
- src/lib/excel/
- src/tests/

Tasks:
1. Modern Theming & Generative UI:
   - Ensure strict dark mode palette: Electric Blue (#2563EB, #00D2FF) and Obsidian Slate/Black (#090D16, #0F172A).
   - Eliminate any residual orange (#FF6B00) across all UI components and styling.
   - Verify responsive layout from 375px mobile to 1280px+ desktop.
2. Multi-Wallet & Inter-Wallet Transfers:
   - Support BCA, Mandiri, GoPay, OVO, Dompet Tunai with real-time balance calculations.
   - Verify transfer modal/action adjusting source and destination wallet balances accurately.
3. Multi-Period Budgets:
   - Daily, Weekly, and Monthly budget allocations per category.
   - Visual progress bar with threshold indicators (80% warning and 100% alert).
4. Native Reports & On-Demand Exports:
   - Filterable/searchable transactions by category, wallet, and date range.
   - Real PDF export generating valid binary (%PDF header) with WIB (Asia/Jakarta, UTC+7) timestamps.
   - Real Excel export (.xlsx) generating valid binary (PK ZIP header) with WIB timestamps.
   - Persistent export download history.
5. Cashflow Calendar & Tata AI Drawer:
   - Interactive cashflow calendar showing daily income/expense and upcoming bills.
   - Tata AI Quick Entry modal/drawer with date picker, transaction type, and source wallet selection (BCA, GoPay, Dompet Tunai, Mandiri).
   - In-app Bot Simulator with interactive chat, receipt OCR simulation, and voice note simulation.
   - Ensure two-way synchronization between Bot transactions and web views.
6. Testing & Verification:
   - Add/verify automated tests covering exports, wallet transfers, multi-period budgets, and theme compliance.
   - Run `npm.cmd test` to ensure 100% test pass.
7. Write handoff.md in your working directory and notify the orchestrator via send_message.
