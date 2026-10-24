# Worker Security 1 Dispatch

## 2026-10-23T12:07:00Z
Sender: fdc4f748-e131-4951-a4f1-58786f10a11a
Recipient: worker_security_1

You are Worker Security 1 (Agent 2 of 5).
Working Directory: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_security_1
Original Request Path: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\PROJECT.md
Explorer Blueprint: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_security_1\handoff.md
Parent Orchestrator ID: fdc4f748-e131-4951-a4f1-58786f10a11a

MANDATORY: Read ORIGINAL_REQUEST.md and explorer_security_1/handoff.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Write Ownership:
- src/app/admin/layout.tsx
- src/app/admin/page.tsx
- src/app/admin/users/page.tsx
- src/components/admin/UserProfileModal.tsx
- src/app/auth/login/page.tsx
- src/app/auth/register/page.tsx
- src/app/api/auth/otp/route.ts
- src/lib/auth/index.ts
- src/lib/supabase/mock-store.ts
- src/lib/storage-mock.ts
- src/tests/milestone5-access-and-whatsapp.ts
- src/tests/run-all-tests.ts

Implementation Tasks:
1. R1: In `src/app/admin/layout.tsx`:
   - Add blocking loading screen when `isAuthorized === null` before hydration completes.
   - Harden `checkAuthorization()` to strictly check `isSuperadminEmail(email)` AND role (`superadmin` or `admin`), removing state-bleeding `||` fallback on `dataStore.user`.
   - Add automatic redirect hook when `isAuthorized === false` redirecting unauthorized users to `/dashboard` (if regular user) or `/auth/login` (if not logged in) with unauthorized access notification.
2. R2: Verify `/auth/register` and `/api/auth/otp` requiring 6-digit WhatsApp OTP before account is activated.
3. R3: In `src/lib/supabase/mock-store.ts` and `src/lib/storage-mock.ts`:
   - Harmonize audit log action name to `'USER_REGISTER_WHATSAPP_VERIFIED'` (and accept both in `milestone5-access-and-whatsapp.ts`).
   - Ensure registered users are saved with `is_whatsapp_verified: true`, phone number, email, plan, and visible on `/admin/users` and `/admin`.
4. R4: Verify `src/components/admin/UserProfileModal.tsx` renders all 9 profile details and is triggered by "Profil" button in both `/admin` and `/admin/users`.
5. R5: In `src/lib/auth/index.ts` and `src/app/auth/login/page.tsx`:
   - Support dual admin WhatsApp numbers (+6281288889999 and +6281298765432).
   - Ensure login with `ungaaputrii@gmail.com` / `1234` requires 2FA WhatsApp OTP verification before granting session.
6. Verification:
   - Run tests: `node ./node_modules/jiti/bin/jiti.js src/tests/run-all-tests.ts` (or `npm test`) and verify 100% pass (0 failures).
   - Run build: `npm.cmd run build` (or `npm run build`) and verify code 0.
7. Write `handoff.md` in `worker_security_1` with full evidence logs and notify Parent Orchestrator.
