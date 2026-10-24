## 2026-10-23T13:40:39Z

You are Team 2: Worker Login 1 (`teamwork_preview_worker`).
Your working directory is:
`C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_login_1`

Read the authoritative requirements and exploration report:
- `C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically `## Follow-up — 2026-10-23T13:28:18Z`)
- `C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\PROJECT.md`
- `C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\explorer_login_1\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You own exclusive write permissions for:
- `src/app/login/page.tsx`
- `src/app/auth/login/page.tsx`
- `src/tests/milestone6-login-interface.ts`
- `src/tests/run-all-tests.ts`

Your Tasks:
1. Update `src/app/login/page.tsx` to directly re-export `AuthLoginPage` from `src/app/auth/login/page` to achieve 100% route visual & behavioral parity and eliminate redundant light-mode flash (`#F8F9FA`).
2. Polish `src/app/auth/login/page.tsx`:
   - Ensure the layout is a full-screen dark navy/obsidian background (`#090D16`), with a vertically & horizontally centered white rounded card (`rounded-3xl` / `rounded-2xl`, soft elevation drop shadow `shadow-2xl shadow-black/50`).
   - Ensure the capsule switcher has two tabs: "Login User" (with `User` icon) and "Login Admin" (with `ShieldCheck` or `Shield` icon). Active tab has white background with blue/accent text, inactive tab soft gray.
   - Switching tabs dynamically changes form title ("Masuk sebagai User" vs "Masuk sebagai Admin"), subtitle, and main button text.
   - Input 1: "Username / Nama Pengguna *" with required red asterisk, user icon inside left.
   - Input 2: "Password / Kata Sandi *" with required asterisk, lock icon on left, eye icon on right with interactive password visibility toggle (`password` <-> `text`).
   - Action button: Full width, vibrant blue (`bg-blue-600` / `hover:bg-blue-500`), "Masuk sebagai User" or "Masuk sebagai Admin", with right arrow (`ArrowRight`).
   - Auth integration: User login (`bungaputri@gmail.com` / `admin1234`) redirects to `/dashboard`, superadmin login (`ungaaputrii@gmail.com` / `1234`) connects to WhatsApp 2FA flow before entering `/admin`.
   - Error query handling: if `searchParams.get('error') === 'unauthorized_admin_access'`, show error message `"Akses ditolak: Anda harus masuk sebagai Superadmin resmi untuk mengakses panel admin."`.
   - WhatsApp Admin Bunga Putri help box at bottom of card (separated by soft border):
     - Left: WhatsApp icon + "Ada Pertanyaan? Tanya Admin Bunga Putri"
     - Right: WhatsApp green button (`bg-emerald-600` / `bg-green-600`) "Chat WA (08987472983)" opening `https://wa.me/628987472983` in new tab with prefilled question draft message `Halo Admin Bunga Putri, saya butuh bantuan terkait login TataDana.`.
   - Fully responsive from 375px mobile to 1280px+ desktop.
3. Create automated test suite `src/tests/milestone6-login-interface.ts`:
   - Test route parity: both `/auth/login` and `/login` re-export/render the same component.
   - Test capsule role switcher logic: labels, state toggling, title/button text changes.
   - Test password visibility toggle logic.
   - Test WhatsApp URL formatting: phone number `628987472983`, encoded message draft.
   - Test authentication workflows: user login redirection vs admin 2FA trigger.
   - Register the test suite in `src/tests/run-all-tests.ts`.
4. Verification:
   - Run the full test suite: `node ./node_modules/jiti/bin/jiti.js src/tests/run-all-tests.ts`
   - Run build: `npm run build`
   - Verify all tests pass with 100% success rate and zero regressions.
5. Report:
   - Write full handoff report to:
     `C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\worker_login_1\handoff.md`
   - Send message back to orchestrator with summary of changes, build/test results, and handoff path.
