## 2026-10-17T14:54:30Z
You are Worker Admin & Superadmin 1 for Milestone 4 of TataDana.
Working Directory: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_admin_superadmin_1
Original Request Path: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document Path: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\PROJECT.md
Orchestrator Conversation ID: 6321f19e-92d2-4704-896d-d7385ea25eb6

Read ORIGINAL_REQUEST.md and PROJECT.md carefully before doing anything else.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Write Ownership:
- src/app/admin/
- src/app/api/admin/
- src/app/auth/
- src/lib/auth/
- src/lib/supabase/
- src/lib/storage-mock.ts
- src/tests/

Tasks:
1. Superadmin Authentication:
   - Ensure login accepts email `ungaaputrii@gmail.com` and password `1234`.
   - Ensure role is set to `superadmin` / `admin`, granting access to `/admin` routes.
2. User Approval & Midtrans Payment Verification:
   - Implement/verify Admin Approve / Reject actions for new user registrations. Status changes instantly.
   - Implement/verify manual Midtrans payment verification & approval for subscription upgrades.
3. Multi-AI Provider Settings & AI Call Logs:
   - Provide admin toggle between single provider and parallel failover mode (Gemini, OpenAI, DeepSeek).
   - Display AI telemetry logs table (prompt, tokens, latency, provider, status) loaded from `ai_logs` / `mockStore.aiLogs`.
4. User Management, Impersonation & Complete Data Export:
   - Admin view of all users with search and filter.
   - User impersonation feature: admin can view user's dashboard without password re-entry, with clear banner and return-to-admin button.
   - Superadmin complete data export (all users, transactions, logs).
5. User Profile Management:
   - Avatar photo change and instant synchronization across dashboard header, sidebar, and profile page.
6. Automated Tests:
   - Add/verify automated test suite for admin features in `src/tests/` and wire into `run-all-tests.ts`.
   - Run `npm.cmd test` to ensure 100% test pass.
7. Write handoff.md in your working directory and notify the orchestrator via send_message.
