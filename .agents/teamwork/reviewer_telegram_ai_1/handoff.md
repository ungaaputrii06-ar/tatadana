# Handoff Report — Reviewer Telegram & AI 1

## Review & Challenge Summary
**Verdict**: REQUEST_CHANGES
**Overall Risk Assessment**: HIGH (Data Store Duplication & Test Suite Exit Code 1)

---

## 1. Observation

### Observation 1: Test Suite Failure in `npm.cmd test`
Running the official project test command `npm.cmd test` resulted in exit code 1 with the following verbatim failure output:
```
--- 26. Challenger Milestone 2 Empirical Stress Tests ---
================================================================
⚡ TATADANA M2 EMPIRICAL CHALLENGER STRESS HARNESS ⚡
================================================================

--- Challenger Suite 1: Webhook Idempotency & Concurrency Stress Test ---
  ✅ PASS: [Challenger Stress] Sequential repeat: 100 identical update_id calls result in 1 processed, 99 skipped
  ❌ FAIL: [Challenger Stress] Concurrent burst: 50 simultaneous identical update_id calls result in exactly 1 processed, 49 skipped
     Error: Zero duplicate transactions in mockStore
     Stack: AssertionError [ERR_ASSERTION]: Zero duplicate transactions in mockStore
33 !== 32
    at C:\Users\User\.gemini\antigravity\scratch\tatadana\src\tests\challenger-milestone2-stress.ts:112:21
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)

🚨 FAILURES DETECTED IN CHALLENGER SUITE:
❌ [Concurrent burst: 50 simultaneous identical update_id calls result in exactly 1 processed, 49 skipped]:
   AssertionError [ERR_ASSERTION]: Zero duplicate transactions in mockStore
33 !== 32

====================================================
🎉 TEST SUMMARY: 147 PASSED, 1 FAILED
====================================================
```

### Observation 2: Duplicate Transaction Insertion in `syncTransactionToMockStore`
In `src/lib/telegram/long-poller.ts`, lines 89-118:
```typescript
89:    const mockCatId = resolveMockCategoryId(params.categoryName, params.type);
90:    const primaryUid = 'user-starter-123';
91:
92:    const mockTx = mockStore.addTransaction({
93:      id: params.id,
94:      user_id: primaryUid,
95:      wallet_id: mockWallet.id,
96:      category_id: mockCatId,
97:      type: params.type,
98:      amount: params.amount,
99:      notes: params.notes,
100:      source: params.source as any,
101:      receipt_image_url: params.receiptImageUrl,
102:      items: params.items as any,
103:      receipt_items: params.items as any,
104:      voice_transcript: params.voiceTranscript,
105:    });
106:
107:    if (params.userId && params.userId !== primaryUid) {
108:      const aliasId = `tx-sync-${mockTx.id}`;
109:      mockStore.transactions.set(aliasId, {
110:        ...mockTx,
111:        id: aliasId,
112:        user_id: params.userId,
113:        userId: params.userId,
114:      });
115:      const uList = mockStore.userTxIndex.get(params.userId) || [];
116:      uList.unshift(aliasId);
117:      mockStore.userTxIndex.set(params.userId, uList);
118:      mockStore.userTxCache.delete(params.userId);
119:    }
```
When `dataStore.user.id` is `'adm_unga_01'` (or any user ID other than `'user-starter-123'`), `mockStore.addTransaction` inserts `mockTx` into `mockStore.transactions` (`mockStore.transactions.set(mockTx.id, ...)`). Immediately following that, lines 108-114 create a second transaction object with `aliasId = tx-sync-${mockTx.id}` and insert that into `mockStore.transactions` as well. As a result, for every single Telegram transaction, `mockStore.transactions.size` increases by +2 instead of +1.

### Observation 3: Webhook Idempotency & Latency Implementation
- In `src/lib/telegram/long-poller.ts`, lines 137-150:
  `processedUpdateIds` tracks processed Telegram update IDs in a `Set<number>`.
  When `updateId !== undefined && updateId !== null`, if `processedUpdateIds.has(updateId)` is true, it immediately returns `{ ok: true, status: 'skipped', reply: 'Update ID already processed (Idempotency protection active)' }` without invoking any transaction creation or balance deductions.
- In `src/app/api/telegram/webhook/route.ts`:
  Lines 20, 36, 51, 70, 82: `latencyMs = Date.now() - startTime;`
  `X-Response-Time-Ms` header is attached to all HTTP responses (200 processed, 200 skipped, 200 no_message, and 500 error).
  Empirical benchmark over 100 consecutive calls demonstrated Min: 0.71ms, Avg: 1.23ms, P95: 1.72ms, Max: 2.09ms (well within the < 1.5s sub-second SLA).

### Observation 4: Indonesian Slang & Nominal Parsing
- In `src/lib/telegram-parser.ts` (`parseIndonesianNominal`) and `src/lib/ai/parser.ts` (`parseIndonesianAmount`):
  Regex matching handles:
  - "15rb", "15 ribu" -> 15,000
  - "500k", "500 k" -> 500,000
  - "1.5jt", "1,5jt", "1.5 juta" -> 1,500,000
  - "2.5m", "2,5m", "2.5 miliar", "2,5 milyar" -> 2,500,000,000
  - "Rp 50.000", "Rp. 50.000", "50000" -> 50,000
  - "beli bakso 15rb" -> 15,000 (expense, Makanan & Minuman)
  - "kopi 25k" -> 25,000 (expense, Makanan & Minuman)
  - "gajian 5jt" -> 5,000,000 (income, Gaji & Pendapatan / Gaji & Upah)
- Multi-wallet resolution in `resolveTargetWallet` (`telegram-parser.ts`) and `inferWallet` (`ai/parser.ts`):
  Correctly resolves `tunai` -> Dompet Tunai, `bca` -> BCA Prioritas / BCA Utama, `mandiri` -> Mandiri, `gopay` -> GoPay, `ovo` -> OVO, `dana` -> DANA.

### Observation 5: AI Provider Adapters & Telemetry
- In `src/lib/ai/provider-manager.ts`:
  - `callGemini`: Uses `GeminiService` with Google Generative AI REST API endpoint.
  - `callOpenAI`: Dispatches POST request to `https://api.openai.com/v1/chat/completions` with bearer token and `gpt-4o-mini`.
  - `callDeepSeek`: Dispatches POST request to `https://api.deepseek.com/chat/completions` with bearer token and `deepseek-chat`.
  - Priority failover: Retrieves active providers sorted by `priority` ascending (Gemini priority 1 -> OpenAI priority 2 -> DeepSeek priority 3).
  - Telemetry: Latency, token estimates, provider name, feature, and status are recorded in both `mockStore.aiLogs` and `dataStore.aiLogs`.
  - `extractStructuredTransaction`: Extracts structured JSON `{ jenis, nominal, kategori, catatan, dompet, is_ambiguous }` with heuristic fallback to `parseTransactionWithAI`.

### Observation 6: Bot Commands & Budget Alerts
- Bot commands `/start`, `/saldo`, `/hari ini`, `/bulan ini`, `/bantuan` are supported in both `src/lib/telegram/commands.ts` and `src/lib/telegram-parser.ts`.
- Budget alerts:
  - `evaluateBudgetAlert` calculates `percentage = Math.round((spent / monthly) * 100)`. Sets `isOver80 = true` at >=80% and `isOver100 = true` at >=100%.
  - `mockStore.addTransaction` dynamically recalculates budget spent amount on expense insertion and sets `alert_80_sent = true` at ratio >= 0.8 and `alert_100_sent = true` at ratio >= 1.0.
  - `dataStore.addTransaction` dynamically updates budget spent amount and sets `alert_80_sent = true` and `alert_100_sent = true`.

---

## 2. Logic Chain

1. **Test Suite Verification**:
   - The dispatch instructions and acceptance criteria require all tests to pass: "Run `npm.cmd test` to confirm all 147 tests pass."
   - When running `npm.cmd test`, the suite executes 26 suites (including empirical challenger stress tests). 18 challenger tests pass, but 1 test fails:
     `Concurrent burst: 50 simultaneous identical update_id calls result in exactly 1 processed, 49 skipped`
     with `AssertionError [ERR_ASSERTION]: Zero duplicate transactions in mockStore (33 !== 32)`.
   - The test runner terminates with exit code 1. Therefore, the work product does not pass the required automated test gate.

2. **Root Cause Analysis of Store Duplication**:
   - In `long-poller.ts` lines 89-118, when an update is processed for a user whose ID differs from `'user-starter-123'` (such as `ungaAdminUser` / `'adm_unga_01'`), `syncTransactionToMockStore` attempts to make the transaction accessible to both users.
   - However, instead of simply indexing `mockTx.id` under both users in `userTxIndex`, it executes:
     `mockStore.transactions.set(aliasId, { ...mockTx, id: aliasId, user_id: params.userId })`.
   - This directly creates two distinct transaction records in `mockStore.transactions` for a single real-world event.
   - Any query iterating over `mockStore.transactions` (such as total transaction count, global export, or audit logs) reflects duplicate transactions.
   - In the challenger test, `mockStore.transactions.size` was expected to be `initialMockStoreTx + 1` (31 + 1 = 32), but because 2 records were inserted, the actual size became 33.

3. **Required Fix Direction**:
   - In `src/lib/telegram/long-poller.ts`:
     When syncing to `mockStore`, do NOT create and insert a second transaction object with `aliasId` into `mockStore.transactions`.
     If dual-user visibility is desired, only add `mockTx.id` to `mockStore.userTxIndex.get(params.userId)`:
     ```typescript
     if (params.userId && params.userId !== primaryUid) {
       const uList = mockStore.userTxIndex.get(params.userId) || [];
       uList.unshift(mockTx.id);
       mockStore.userTxIndex.set(params.userId, uList);
       mockStore.userTxCache.delete(params.userId);
     }
     ```
     This keeps `mockStore.transactions.size` strictly at +1 while preserving index lookup for both user accounts.

---

## 3. Findings

### [Critical] Finding 1: Duplicate Transaction Records Inserted in `mockStore` During Telegram Sync
- **What**: `syncTransactionToMockStore` inserts two transaction objects into `mockStore.transactions` for every Telegram transaction when `params.userId !== 'user-starter-123'`.
- **Where**: `src/lib/telegram/long-poller.ts`, lines 107-114:
  ```typescript
  if (params.userId && params.userId !== primaryUid) {
    const aliasId = `tx-sync-${mockTx.id}`;
    mockStore.transactions.set(aliasId, {
      ...mockTx,
      id: aliasId,
      user_id: params.userId,
      userId: params.userId,
    });
  ```
- **Why**: Violates single source of truth and data integrity. Every Telegram transaction processed under `adm_unga_01` generates two transaction entities in the database (`mockTx.id` and `tx-sync-${mockTx.id}`). This causes `npm.cmd test` to fail on concurrent burst verification (`33 !== 32`).
- **Suggestion**: Remove `mockStore.transactions.set(aliasId, ...)`. If multi-user indexing is needed, index `mockTx.id` into `mockStore.userTxIndex` without creating a duplicate record in `mockStore.transactions`.

---

## 4. Adversarial Challenge Report

### Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Sequential replay: 100 identical `update_id`s | 1 processed, 99 skipped | 1 processed, 99 skipped | ✅ PASS |
| Boundary `update_id`s: 0, negative (-999), MAX_SAFE_INTEGER | Handled without crash; skipped on replay | Handled cleanly; 0 recognized, skipped on replay | ✅ PASS |
| Interleaved batch: 25 distinct IDs + 25 replay duplicates | 25 processed, 25 skipped | 25 processed, 25 skipped | ✅ PASS |
| Webhook Latency: 100 consecutive POST calls | All < 1500ms; `X-Response-Time-Ms` present | Min: 0.71ms, Avg: 1.23ms, P95: 1.72ms, Max: 2.09ms | ✅ PASS |
| Nominal Parsing: "15rb", "500k", "1.5jt", "2,5m", "Rp 50.000" | Exact numeric values | 15000, 500000, 1500000, 2500000000, 50000 | ✅ PASS |
| Natural language sentences ("beli bakso 15rb", "kopi 25k", "gajian 5jt") | Correct amount, type, category | Expense 15k Makanan, Expense 25k Makanan, Income 5jt Gaji | ✅ PASS |
| Multi-wallet keyword detection | Routes to Tunai, BCA, Mandiri, GoPay, OVO, DANA | Accurately resolved | ✅ PASS |
| AI Provider Failover: Gemini error with mock key | Fall over to secondary, log telemetry to `aiLogs` | Caught error, attempted next provider, logged to `mockStore` & `dataStore` | ✅ PASS |
| Budget Alert Thresholds: 79%, 80%, 100% | 80% alert at >=80%, 100% alert at >=100% | Accurately triggered in `evaluateBudgetAlert` and `mockStore.addTransaction` | ✅ PASS |
| Concurrent Burst: 50 simultaneous identical `update_id`s | Exactly 1 processed, 49 skipped; `mockStore.transactions.size` +1 | Exactly 1 processed, 49 skipped; BUT `mockStore.transactions.size` +2 (duplicate insertion) | ❌ FAIL |

---

## 5. Caveats
- No live external API keys (Gemini, OpenAI, DeepSeek) are configured in the environment; mock keys trigger expected error paths and fallback logic, which is appropriate for sandbox and test environments.
- As per constraint rules, the reviewer does not apply code fixes directly to production files.

---

## 6. Conclusion
Verdict: **REQUEST_CHANGES**

While the core functionality of Milestone 2 (idempotency filtering, latency headers, nominal parsing, multi-wallet routing, AI failover, and budget alerts) is substantially implemented, the transaction synchronization pipeline in `src/lib/telegram/long-poller.ts` contains a data duplication defect where two transaction records are inserted into `mockStore.transactions` for each event. This triggers a test failure in `npm.cmd test` under concurrent burst verification.

Once Worker Telegram & AI eliminates the duplicate insertion (`mockStore.transactions.set(aliasId, ...)`), `npm.cmd test` will pass cleanly and Milestone 2 can be approved.

---

## 7. Verification Method
1. Inspect `src/lib/telegram/long-poller.ts` lines 106-118 to verify the removal of duplicate `mockStore.transactions.set(aliasId, ...)`.
2. Run the automated test command:
   ```powershell
   npm.cmd test
   ```
3. Invalidation conditions: Any test failure or `npm.cmd test` exit code != 0.
