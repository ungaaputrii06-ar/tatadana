## 2026-10-17T11:02:47Z
You are Worker DB 1 (Database & Schema Harmonization Worker).
Working Directory: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_db_1
Original Request Path: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document Path: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\PROJECT.md
Orchestrator Conversation ID: 81e7e5af-8bf3-47d7-a899-7a23396b8a48

Read ORIGINAL_REQUEST.md and PROJECT.md carefully before doing anything else.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Write Ownership:
- supabase/migrations/
- supabase/schema.sql
- src/lib/types.ts (if schema updates are needed)
- src/lib/supabase/mock-store.ts (if store table alignment is needed)

Tasks:
1. Examine existing migrations in supabase/migrations/ and supabase/schema.sql.
2. In supabase/migrations/, create a clean, comprehensive, idempotent migration `20261012000000_tatadana_core_schema_and_rls.sql` that defines and verifies all 10 core tables required by R4:
   - users (and users_profile / profiles alias/view)
   - wallets
   - categories
   - transactions
   - budgets (with period_type: daily, weekly, monthly, yearly)
   - recurring_bills
   - ai_logs (explicitly ENABLE ROW LEVEL SECURITY and add policies!)
   - export_records (and export_history alias)
   - midtrans_payments (and subscriptions_midtrans alias)
   - audit_logs (and admin_audit_logs alias)
3. Ensure every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and robust RLS policies for authenticated users (`auth.uid() = user_id`) and admin roles.
4. Ensure the database trigger `update_wallet_balance_on_transaction()` handles INSERT and DELETE properly (including expense, income, and transfer between wallets).
5. Ensure default seed data (10 default categories, default AI providers) is properly established.
6. Verify type integrity across TypeScript schemas in src/lib/types.ts and mock-store.ts.
7. Document your changes, verify syntax, write handoff.md in your working directory, and notify orchestrator via send_message.
