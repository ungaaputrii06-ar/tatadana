# E2E Test Infra: TataDana SaaS Personal Finance Platform

## Test Philosophy
- Opaque-box, requirement-driven verification derived directly from `ORIGINAL_REQUEST.md`.
- Zero tolerance for mocking facades or hardcoded bypasses.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.

## Test Architecture
- **Test Runner**: Node.js execution via `jiti` (`npm test` / `node ./node_modules/jiti/bin/jiti.js src/tests/run-all-tests.ts`).
- **Pass/Fail Semantics**: Strict assertion verification; exit code 0 on complete pass, non-zero on assertion failure.
- **Assertion Coverage**: Over 1,950 assertion checkpoints across currency parsing, webhook idempotency, balance arithmetic, PDF/Excel generation, role security, and plan enforcement.

## Test Tiers & Coverage

### Tier 1 — Feature Coverage (Happy Path, >=5 per feature area)
- Indonesian slang nominals: "15rb", "500k", "1.5jt", "2.5m", "Rp 50.000", "20ribu".
- Webhook update reception and response structure.
- Bot command responses (`/start`, `/saldo`, `/bantuan`).
- Wallet balance calculation on income, expense, and transfers.
- Multi-period budget creations (Daily, Weekly, Monthly).
- PDF and Excel export generation with WIB timestamps.
- Admin login and authentication for `ungaaputrii@gmail.com` with password `1234`.

### Tier 2 — Boundary & Corner Cases (>=5 per feature area)
- Mixed punctuation and decimals: "1,5jt", "1.5 jt", "Rp. 25.000,-", "0.5k".
- Webhook idempotency: repeated submissions of the exact same `update_id` must be skipped without duplicate balance deductions.
- Multi-day and month-boundary budget rollovers.
- Exceeding budget thresholds: triggers for 80% and 100% alerts.
- Empty transaction lists in PDF/Excel exports.
- Subscriptions & limits: Starter plan (50 tx/month) cutoff vs Pro plan unlimited.

### Tier 3 — Cross-Feature Combinations (Pairwise Coverage)
- Recording transaction via Bot -> verifying balance update in Multi-Wallet -> checking budget progress bar update -> verifying presence in Laporan & PDF export.
- Admin payment approval -> instant user plan upgrade from Starter to Pro -> unlimited transaction entry via Telegram webhook.
- Inter-wallet transfer -> verifying source wallet deduction and destination wallet increment -> checking audit trail.

### Tier 4 — Real-World Application Scenarios
- Realistic Indonesian monthly budget lifecycle: Salary deposit ("gajian 10jt ke BCA"), daily meals ("makan siang 35k"), coffee ("kopi 25rb"), rent ("bayar kos 1.5jt"), GoPay top-up, budget warning triggers, end-of-month PDF report generation.
- Superadmin management scenario: Registration -> pending payment -> manual Midtrans approval -> impersonation verification -> export all data.

### Tier 5 — Adversarial Coverage Hardening (Challenger & Auditor Verification)
- Forensic integrity checks verifying genuine algorithmic parsing, real binary generation (valid magic bytes), and absence of hardcoded responses.
