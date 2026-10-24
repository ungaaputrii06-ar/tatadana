# Dispatch for Team 1: Explorer Login 1

Explore current login routes, auth integration, styling, and formulate concrete blueprint for the new modern responsive login interface.


## 2026-10-23T13:31:45Z
Sender: 09a043b7-e764-4d32-b680-3d43035086f0
Task:
Conduct a comprehensive, read-only technical investigation of the current login system and codebase to produce an exact implementation blueprint for the new TataDana modern & responsive login interface on Next.js 14 App Router.

Scope of Investigation:
1. Current login pages and routes:
   - Check src/app/auth/login/page.tsx and check whether src/app/login/page.tsx exists or needs to be created/re-exported.
   - Inspect existing authentication flow: how bungaputri@gmail.com logs in and redirects to /dashboard, and how ungaaputrii@gmail.com / 1234 triggers the WhatsApp 2FA flow (see src/lib/auth/index.ts and recent changes from orchestrator_3).
   - Inspect existing icons (lucide-react) available in the project, color palette, tailwind config, and UI layout components.
2. Requirements Mapping for Follow-up 2026-10-23T13:28:18Z:
   - R1: Dark navy/obsidian background (#090D16 / #0B1120), vertically & horizontally centered white rounded card (rounded-3xl / rounded-2xl, soft elevation drop shadow), responsive 375px to 1280px+.
   - R2: Role capsule switcher ("Login User" with User icon vs "Login Admin" with ShieldCheck/Shield icon). State transition: changing form title ("Masuk sebagai User" vs "Masuk sebagai Admin"), subtitle, and action button text. Active tab: white bg with blue/accent text, inactive tab: soft gray.
   - R3: Input 1 (Username / Nama Pengguna * with red asterisk and user icon left); Input 2 (Password / Kata Sandi * with lock icon left and interactive eye/eye-off toggle right); Action button: full-width vibrant blue (bg-blue-600 / hover:bg-blue-500) with ArrowRight icon.
   - R4: WhatsApp Admin Bunga Putri help box at bottom of card (soft border separator, left: WhatsApp icon + "Ada Pertanyaan? Tanya Admin Bunga Putri", right: green button bg-emerald-600/bg-green-600 "Chat WA (08987472983)" opening https://wa.me/628987472983 with draft query Halo Admin Bunga Putri, saya butuh bantuan terkait login TataDana.).
   - Route synchronization: ensure both /auth/login and /login render this modern UI and functionality identically.
3. Test suite & verification:
   - Inspect src/tests/run-all-tests.ts, src/tests/milestone5-access-and-whatsapp.ts, and any auth test suites.
   - Identify what tests currently test login and what tests need to be run or added to ensure 100% pass rate.
