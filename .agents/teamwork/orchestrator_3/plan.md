# Execution Plan — TataDana R1-R5 Security & Admin Hardening

## Context & Objectives
Execute follow-up requirements from user request timestamped 2026-10-23T11:53:36Z using a team of 5 specialized agents:
- **R1. Proteksi Hak Akses Admin Panel (Admin Access Control & Role Guard)**:
  - Panel admin (`/admin` and all subroutes `/admin/users`, `/admin/payments`, `/admin/ai-providers`, `/admin/impersonate`, etc.) MUST only be accessible by official Superadmin (`ungaaputrii@gmail.com`).
  - Regular users (e.g. `bungaputri@gmail.com` or newly registered users) are strictly forbidden; system redirects them to `/dashboard` or `/auth/login` with an unauthorized access warning toast/alert.
  - Direct URL access to `/admin/*` without an authenticated superadmin session is 100% blocked.
- **R2. Pendaftaran Pengguna Wajib Verifikasi WhatsApp OTP**:
  - New user registration (`/auth/register`) strictly requires phone/WhatsApp verification before the account is activated.
  - System issues 6-digit OTP code to WhatsApp / `/api/auth/otp`, user verifies 6 digits before onboarding/dashboard access.
- **R3. Pencatatan Otomatis User yang Mendaftar di Admin Panel**:
  - Newly registered & verified users immediately recorded in database (`dataStore.users` / `mockStore.profiles`) in real-time.
  - `/admin/users` and admin dashboard display registered users with WhatsApp Verified badge, phone number, email, registration date, and subscription tier.
- **R4. Fitur Inspeksi Profil Pengguna di Admin Dashboard**:
  - Modal / drawer User Profile Inspector in `/admin` and `/admin/users`.
  - Displays: Full Name, Avatar Photo, Email, WhatsApp Phone, WhatsApp Verification status, Joined Date, Plan (Starter / Pro), Wallets & Balances summary, Recent Transaction history.
- **R5. Verifikasi WhatsApp 2FA saat Superadmin Login**:
  - Superadmin login (`ungaaputrii@gmail.com` / `1234`) does NOT grant immediate access.
  - Requires 2FA via WhatsApp OTP sent to admin WhatsApp (+6281288889999 / +6281298765432). Admin must validate OTP before superadmin session is established and redirected to `/admin`.
- **Tests & Stability**:
  - All unit & integration tests in `src/tests/run-all-tests.ts` pass 100%.
  - Next.js 14 App Router server runs cleanly on port 3000 without regression errors.

---

## 5-Agent Specialist Team Composition
1. **Agent 1: Explorer** (`teamwork_preview_explorer`):
   - Working Directory: `.agents/teamwork/explorer_security_1`
   - Role: Deep technical survey of current codebase (`src/app/admin/layout.tsx`, middleware, auth APIs `/api/auth/otp*`, `/auth/register`, `/auth/login`, stores `dataStore` & `mockStore`, `/admin/users`, profile inspector UI, `src/tests/run-all-tests.ts`).
   - Deliverable: Comprehensive architecture blueprint and implementation contract in `handoff.md`.

2. **Agent 2: Worker** (`teamwork_preview_worker`):
   - Working Directory: `.agents/teamwork/worker_security_1`
   - Role: Full-stack implementation of R1, R2, R3, R4, R5, UI components, API handlers, real-time sync, and integration test expansion in `src/tests/run-all-tests.ts`. Run build and tests.
   - Deliverable: Working implementation, 0 build errors, 100% test pass rate documented in `handoff.md`.

3. **Agent 3: Reviewer** (`teamwork_preview_reviewer`):
   - Working Directory: `.agents/teamwork/reviewer_security_1`
   - Role: Independent code review and layout compliance check. Validates role guards, redirect handlers, OTP verification endpoints, inspector modal/drawer, 2FA auth state, and build/test logs.
   - Deliverable: Review verdict (`APPROVE` or `REQUEST_CHANGES`) in `handoff.md`.

4. **Agent 4: Challenger** (`teamwork_preview_challenger`):
   - Working Directory: `.agents/teamwork/challenger_security_1`
   - Role: Empirical stress testing and adversarial edge-case verification (e.g. non-admin access bypass attempts, invalid/expired OTP attacks, superadmin 2FA bypass attempts, data sync race conditions). Runs test execution.
   - Deliverable: Challenger empirical verdict (`APPROVE` or `CHALLENGE_FAILED`) in `handoff.md`.

5. **Agent 5: Forensic Auditor** (`teamwork_preview_auditor`):
   - Working Directory: `.agents/teamwork/auditor_security_1`
   - Role: Anti-cheating and integrity verification. Validates authentic logic, real OTP checks, no dummy facades, genuine database updates, and authentic test execution.
   - Deliverable: Audit verdict (`CLEAN` or `INTEGRITY VIOLATION`) in `handoff.md`.

---

## Gate & Pass Criteria
Strict logical AND:
1. Build (`npm run build`) and test suite (`src/tests/run-all-tests.ts`) exit with code 0 (100% pass).
2. Reviewer verdict: `APPROVE`.
3. Challenger verdict: `APPROVE`.
4. Forensic Auditor verdict: `CLEAN` (binary veto).
5. All 5 subagents complete work cleanly and report handoffs.
