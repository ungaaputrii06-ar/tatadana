import assert from 'assert';
import { NextRequest } from 'next/server';
import { POST, GET } from '../app/api/telegram/webhook/route';
import { processTelegramUpdate, clearProcessedUpdateIds } from '../lib/telegram/long-poller';
import { parseIndonesianNominal, parseNaturalLanguageInput, resolveTargetWallet, evaluateBudgetAlert } from '../lib/telegram-parser';
import { parseIndonesianAmount, parseTransactionWithAI, inferCategoryAndType } from '../lib/ai/parser';
import { AIProviderManager } from '../lib/ai/provider-manager';
import { mockStore } from '../lib/supabase/mock-store';
import { dataStore } from '../lib/storage-mock';
import { Wallet } from '../lib/types';

export async function runMilestone2StressTests(): Promise<{ passed: number; failed: number }> {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures: { name: string; error: any }[] = [];

  async function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✅ PASS: [Challenger Stress] ${name}`);
    } catch (err: any) {
      failedTests++;
      failures.push({ name, error: err });
      console.error(`  ❌ FAIL: [Challenger Stress] ${name}`);
      console.error(`     Error: ${err?.message || err}`);
      if (err?.stack) {
        console.error(`     Stack: ${err.stack.split('\n').slice(1, 4).join('\n')}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('⚡ TATADANA M2 EMPIRICAL CHALLENGER STRESS HARNESS ⚡');
  console.log('================================================================');

  // ---------------------------------------------------------------------------
  // SUITE 1: WEBHOOK IDEMPOTENCY & CONCURRENCY STRESS TEST
  // ---------------------------------------------------------------------------
  console.log('\n--- Challenger Suite 1: Webhook Idempotency & Concurrency Stress Test ---');

  await test('Sequential repeat: 100 identical update_id calls result in 1 processed, 99 skipped', async () => {
    clearProcessedUpdateIds();
    const testUpdateId = 880001;
    const initialTxCount = dataStore.transactions.length;

    const payload = {
      update_id: testUpdateId,
      message: {
        chat: { id: 991122 },
        text: 'kopi susu 20k tunai',
      },
    };

    let processedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < 100; i++) {
      const res = await processTelegramUpdate(payload as any);
      if (res.status === 'skipped') {
        skippedCount++;
        assert.strictEqual(res.ok, true);
        assert(res.reply.includes('Idempotency protection active'));
      } else {
        processedCount++;
        assert.strictEqual(res.ok, true);
      }
    }

    assert.strictEqual(processedCount, 1, `Expected exactly 1 processed, got ${processedCount}`);
    assert.strictEqual(skippedCount, 99, `Expected exactly 99 skipped, got ${skippedCount}`);
    assert.strictEqual(
      dataStore.transactions.length,
      initialTxCount + 1,
      'Exactly 1 transaction should be added to dataStore'
    );
  });

  await test('Concurrent burst: 50 simultaneous identical update_id calls result in exactly 1 processed, 49 skipped', async () => {
    clearProcessedUpdateIds();
    const testUpdateId = 880002;
    const initialDataStoreTx = dataStore.transactions.length;
    const initialMockStoreTx = mockStore.transactions.size;

    const payload = {
      update_id: testUpdateId,
      message: {
        chat: { id: 991122 },
        text: 'beli bakso 15rb',
      },
    };

    // Fire 50 requests simultaneously via Promise.all
    const promises = Array.from({ length: 50 }, () =>
      processTelegramUpdate(payload as any)
    );

    const results = await Promise.all(promises);

    const processed = results.filter((r) => r.status !== 'skipped');
    const skipped = results.filter((r) => r.status === 'skipped');

    assert.strictEqual(processed.length, 1, `Must have exactly 1 processed under concurrent storm, got ${processed.length}`);
    assert.strictEqual(skipped.length, 49, `Must have exactly 49 skipped under concurrent storm, got ${skipped.length}`);
    assert.strictEqual(
      dataStore.transactions.length,
      initialDataStoreTx + 1,
      'Zero duplicate transactions in dataStore (exactly 1 transaction added)'
    );
    // In mockStore, each synced transaction creates exactly 1 primary record indexed across users
    // Under 50 concurrent requests, idempotency prevents 49 updates, ensuring exactly 1 transaction (+1 entry)
    assert.strictEqual(
      mockStore.transactions.size,
      initialMockStoreTx + 1,
      'Zero duplicate transactions in mockStore (exactly 1 transaction added)'
    );
  });

  await test('Boundary update_id values: update_id = 0, negative (-999), and MAX_SAFE_INTEGER', async () => {
    clearProcessedUpdateIds();

    // 1. update_id = 0 (falsy number in JS)
    const pZero = {
      update_id: 0,
      message: { chat: { id: 991122 }, text: 'kopi 15k' },
    };
    const resZero1 = await processTelegramUpdate(pZero as any);
    assert.strictEqual(resZero1.status, undefined, 'First update_id=0 should be processed');
    const resZero2 = await processTelegramUpdate(pZero as any);
    assert.strictEqual(resZero2.status, 'skipped', 'Second update_id=0 must be skipped (not bypassed by falsy check)');

    // 2. negative update_id
    const pNeg = {
      update_id: -999,
      message: { chat: { id: 991122 }, text: 'bensin 20k' },
    };
    const resNeg1 = await processTelegramUpdate(pNeg as any);
    assert.strictEqual(resNeg1.status, undefined);
    const resNeg2 = await processTelegramUpdate(pNeg as any);
    assert.strictEqual(resNeg2.status, 'skipped');

    // 3. large update_id
    const pLarge = {
      update_id: Number.MAX_SAFE_INTEGER,
      message: { chat: { id: 991122 }, text: 'makan siang 25k' },
    };
    const resLarge1 = await processTelegramUpdate(pLarge as any);
    assert.strictEqual(resLarge1.status, undefined);
    const resLarge2 = await processTelegramUpdate(pLarge as any);
    assert.strictEqual(resLarge2.status, 'skipped');
  });

  await test('Interleaved concurrent batch: 25 distinct IDs + 25 duplicates', async () => {
    clearProcessedUpdateIds();
    const distinctIds = Array.from({ length: 25 }, (_, i) => 700000 + i);

    // Initial pass: register the 25 distinct IDs
    const pass1 = await Promise.all(
      distinctIds.map((id) =>
        processTelegramUpdate({
          update_id: id,
          message: { chat: { id: 100 }, text: `kopi ${10 + (id % 10)}k` },
        } as any)
      )
    );
    assert.strictEqual(pass1.filter((r) => r.status !== 'skipped').length, 25);

    // Second pass: replay all 25 distinct IDs simultaneously
    const pass2 = await Promise.all(
      distinctIds.map((id) =>
        processTelegramUpdate({
          update_id: id,
          message: { chat: { id: 100 }, text: `kopi ${10 + (id % 10)}k` },
        } as any)
      )
    );
    assert.strictEqual(pass2.filter((r) => r.status === 'skipped').length, 25);
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: LATENCY & RESPONSE HEADER STRESS BENCHMARK
  // ---------------------------------------------------------------------------
  console.log('\n--- Challenger Suite 2: Latency & Response Header Stress Benchmark ---');

  await test('Webhook route POST responds with X-Response-Time-Ms on processed, skipped, and error', async () => {
    // 1. Processed request
    const uniqueId = 910001;
    const req1 = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      body: JSON.stringify({
        update_id: uniqueId,
        message: { chat: { id: 554433 }, text: 'beli bakso 15rb' },
      }),
    });
    const res1 = await POST(req1);
    assert.strictEqual(res1.status, 200);
    const header1 = res1.headers.get('X-Response-Time-Ms');
    assert(header1 !== null, 'Header X-Response-Time-Ms must be present on 200 processed');
    assert(Number(header1) >= 0 && Number(header1) < 1500, `Latency must be < 1500ms, got ${header1}`);

    // 2. Skipped request (idempotent duplicate)
    const req2 = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      body: JSON.stringify({
        update_id: uniqueId,
        message: { chat: { id: 554433 }, text: 'beli bakso 15rb' },
      }),
    });
    const res2 = await POST(req2);
    assert.strictEqual(res2.status, 200);
    const header2 = res2.headers.get('X-Response-Time-Ms');
    assert(header2 !== null, 'Header X-Response-Time-Ms must be present on skipped');
    assert(Number(header2) < 1500);

    // 3. no_message update
    const reqNoMsg = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      body: JSON.stringify({ update_id: 910002 }),
    });
    const resNoMsg = await POST(reqNoMsg);
    const headerNoMsg = resNoMsg.headers.get('X-Response-Time-Ms');
    assert(headerNoMsg !== null, 'Header X-Response-Time-Ms must be present on no_message');

    // 4. Malformed JSON (triggering catch block)
    const reqErr = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      body: 'invalid-json-{',
    });
    const resErr = await POST(reqErr);
    assert.strictEqual(resErr.status, 500);
    const headerErr = resErr.headers.get('X-Response-Time-Ms');
    assert(headerErr !== null, 'Header X-Response-Time-Ms must be present on error');
  });

  await test('Latency Benchmark: 100 consecutive webhook calls meet sub-1.5s requirement', async () => {
    const latencies: number[] = [];
    const origLog = console.log;
    console.log = () => {};

    try {
      for (let i = 0; i < 100; i++) {
        const uId = 920000 + i;
        const t0 = performance.now();
        const req = new NextRequest('http://localhost:3000/api/telegram/webhook', {
          method: 'POST',
          body: JSON.stringify({
            update_id: uId,
            message: { chat: { id: 554433 }, text: `beli cemilan ${15 + (i % 20)}k` },
          }),
        });
        const res = await POST(req);
        const wallMs = performance.now() - t0;
        latencies.push(wallMs);

        const headerMs = Number(res.headers.get('X-Response-Time-Ms'));
        assert(wallMs < 1500, `Call #${i} exceeded 1.5s threshold: ${wallMs.toFixed(2)}ms`);
        assert(headerMs < 1500, `Header reported >= 1500ms: ${headerMs}ms`);
      }
    } finally {
      console.log = origLog;
    }

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    console.log(`     Latency Stats over 100 calls -> Min: ${min.toFixed(2)}ms | Avg: ${avg.toFixed(2)}ms | P95: ${p95.toFixed(2)}ms | Max: ${max.toFixed(2)}ms`);
    assert(max < 1500, `Worst-case latency must be < 1.5s, was ${max.toFixed(2)}ms`);
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: INDONESIAN SLANG & NATURAL LANGUAGE PARSING CORNER CASES
  // ---------------------------------------------------------------------------
  console.log('\n--- Challenger Suite 3: Indonesian Slang & Natural Language Parsing Corner Cases ---');

  await test('Core denominations and variations ("15rb", "500k", "1.5jt", "2,5m", "Rp 50.000")', () => {
    const testCases: [string, number][] = [
      ['15rb', 15000],
      ['15 ribu', 15000],
      ['15000', 15000],
      ['500k', 500000],
      ['500 k', 500000],
      ['1.5jt', 1500000],
      ['1,5jt', 1500000],
      ['1.5 juta', 1500000],
      ['1,5 juta', 1500000],
      ['2.5m', 2500000000],
      ['2,5m', 2500000000],
      ['2.5 miliar', 2500000000],
      ['2,5 milyar', 2500000000],
      ['Rp 50.000', 50000],
      ['Rp. 50.000', 50000],
      ['rp 50000', 50000],
      ['Rp50.000', 50000],
    ];

    for (const [input, expected] of testCases) {
      const actual1 = parseIndonesianNominal(input);
      const actual2 = parseIndonesianAmount(input);
      assert.strictEqual(actual1, expected, `parseIndonesianNominal failed for "${input}": got ${actual1}, expected ${expected}`);
      assert.strictEqual(actual2, expected, `parseIndonesianAmount failed for "${input}": got ${actual2}, expected ${expected}`);
    }
  });

  await test('Mixed casing and whitespace variations', () => {
    const mixedCases: [string, number][] = [
      ['15Rb', 15000],
      ['15RIBU', 15000],
      ['500K', 500000],
      ['1.5JT', 1500000],
      ['1,5Juta', 1500000],
      ['2.5M', 2500000000],
      ['2,5MILiAR', 2500000000],
      ['RP 50.000', 50000],
      ['rP 50.000', 50000],
      ['Rp.   50.000', 50000],
      ['  500k  ', 500000],
      ['  1.5  jt  ', 1500000],
    ];

    for (const [input, expected] of mixedCases) {
      const actual = parseIndonesianNominal(input);
      assert.strictEqual(actual, expected, `Failed mixed casing for "${input}": got ${actual}`);
    }
  });

  await test('Natural language sentences ("beli bakso 15rb", "kopi 25k", "gajian 5jt")', async () => {
    // 1. "beli bakso 15rb" -> Expense, 15000, Makanan & Minuman
    const p1 = parseNaturalLanguageInput('beli bakso 15rb');
    assert.strictEqual(p1.type, 'expense');
    assert.strictEqual(p1.amount, 15000);
    assert.strictEqual(p1.categoryName, 'Makanan & Minuman');

    // 2. "kopi 25k" -> Expense, 25000, Makanan & Minuman
    const p2 = parseNaturalLanguageInput('kopi 25k');
    assert.strictEqual(p2.type, 'expense');
    assert.strictEqual(p2.amount, 25000);
    assert.strictEqual(p2.categoryName, 'Makanan & Minuman');

    // 3. "gajian 5jt" -> Income, 5000000, Gaji & Pendapatan
    const p3 = parseNaturalLanguageInput('gajian 5jt');
    assert.strictEqual(p3.type, 'income');
    assert.strictEqual(p3.amount, 5000000);

    // Also test via parseTransactionWithAI
    const ai1 = await parseTransactionWithAI('beli bakso 15rb');
    assert.strictEqual(ai1.type, 'expense');
    assert.strictEqual(ai1.amount, 15000);
    assert.strictEqual(ai1.category, 'Makanan & Minuman');

    const ai2 = await parseTransactionWithAI('kopi 25k');
    assert.strictEqual(ai2.type, 'expense');
    assert.strictEqual(ai2.amount, 25000);
    assert.strictEqual(ai2.category, 'Makanan & Minuman');

    const ai3 = await parseTransactionWithAI('gajian 5jt');
    assert.strictEqual(ai3.type, 'income');
    assert.strictEqual(ai3.amount, 5000000);
    assert.strictEqual(ai3.category, 'Gaji & Upah');
  });

  await test('Indonesian culinary and keyword extensions in parser.ts', () => {
    const foodItems = [
      'nasi padang 25rb',
      'soto ayam lamongan 18k',
      'sate kambing 35rb',
      'warteg berkah 15k',
      'jajan cilok 5k',
      'ayam geprek 20k',
      'mie ayam bakso 18rb',
    ];

    for (const item of foodItems) {
      const { type, category } = inferCategoryAndType(item);
      assert.strictEqual(type, 'expense', `Expected expense for "${item}"`);
      assert.strictEqual(category, 'Makanan & Minuman', `Expected Makanan & Minuman for "${item}", got "${category}"`);
    }
  });

  await test('Multi-wallet destination resolution (Tunai, BCA, Mandiri, GoPay, OVO, DANA)', () => {
    const wallets: Wallet[] = [
      { id: 'w-cash', name: 'Dompet Tunai', type: 'cash', balance: 100000 },
      { id: 'w-bca', name: 'BCA Prioritas', type: 'bank', balance: 5000000, isDefault: true },
      { id: 'w-mandiri', name: 'Mandiri Tabungan', type: 'bank', balance: 2000000 },
      { id: 'w-gopay', name: 'GoPay', type: 'ewallet', balance: 150000 },
      { id: 'w-ovo', name: 'OVO', type: 'ewallet', balance: 80000 },
      { id: 'w-dana', name: 'DANA', type: 'ewallet', balance: 60000 },
    ];

    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'tunai').id, 'w-cash');
    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'cash').id, 'w-cash');
    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'bca').id, 'w-bca');
    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'mandiri').id, 'w-mandiri');
    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'gopay').id, 'w-gopay');
    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'go-pay').id, 'w-gopay');
    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'ovo').id, 'w-ovo');
    assert.strictEqual(resolveTargetWallet(wallets, undefined, 'dana').id, 'w-dana');

    // Default fallback when wallet not mentioned
    assert.strictEqual(resolveTargetWallet(wallets).id, 'w-bca');
  });

  await test('Boundary & corner cases: zero, negative values, and non-transactional text', async () => {
    // 1. Zero nominal
    const zeroRes = parseIndonesianNominal('0');
    assert(zeroRes === null || zeroRes === 0);
    const zeroAi = await parseTransactionWithAI('beli barang 0');
    assert.strictEqual(zeroAi.is_ambiguous, true, 'Zero amount transaction must be treated as ambiguous/invalid');

    // 2. Negative numbers
    const negAi = await parseTransactionWithAI('pengeluaran -50k');
    assert(negAi.amount >= 0, 'Amount must never be negative');

    // 3. Non-transactional text
    const greetings = ['halo bot', 'selamat pagi', 'siapa kamu', 'tes 123', 'p', 'ping'];
    for (const g of greetings) {
      const res = await parseTransactionWithAI(g);
      assert.strictEqual(res.is_ambiguous, true, `Greeting "${g}" must be marked is_ambiguous=true`);
      assert.strictEqual(res.confidence, 0, `Greeting "${g}" must have confidence=0`);
      assert(res.suggested_format && res.suggested_format.length > 0, `Greeting "${g}" must provide suggested_format`);
    }

    // 4. Random gibberish without amounts
    const gibberish = ['apa kabar hari ini', 'apakah kamu suka kopi', 'catat'];
    for (const text of gibberish) {
      const res = await parseTransactionWithAI(text);
      assert.strictEqual(res.is_ambiguous, true, `Gibberish "${text}" must be is_ambiguous=true`);
    }
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: AI PROVIDER FAILOVER & TELEMETRY STRESS TEST
  // ---------------------------------------------------------------------------
  console.log('\n--- Challenger Suite 4: AI Provider Failover & Telemetry Stress Test ---');

  await test('Active providers priority ordering and configuration integrity', () => {
    const providers = AIProviderManager.getActiveProviders();
    assert(providers.length >= 3, 'Must have at least 3 configured providers');

    for (let i = 0; i < providers.length - 1; i++) {
      assert(providers[i].priority <= providers[i + 1].priority, 'Providers must be sorted by priority ascending');
    }

    const providerNames = providers.map((p) => p.name);
    assert(providerNames.includes('gemini'), 'Must contain gemini provider');
    assert(providerNames.includes('openai'), 'Must contain openai provider');
    assert(providerNames.includes('deepseek'), 'Must contain deepseek provider');
  });

  await test('Priority Failover: Primary provider error triggers next provider and logs telemetry', async () => {
    const initialLogCount = mockStore.aiLogs.length;

    await AIProviderManager.executeTextGeneration('Test prompt failover', 'telegram_text');

    const newLogCount = mockStore.aiLogs.length;
    assert(newLogCount > initialLogCount, 'New telemetry logs must be recorded during failover');

    const recentLogs = mockStore.aiLogs.slice(0, newLogCount - initialLogCount);
    for (const log of recentLogs) {
      assert(log.latency_ms >= 0, 'Log must contain latency_ms >= 0');
      assert(log.prompt_tokens > 0, 'Log must contain prompt_tokens > 0');
      assert(['success', 'failed', 'fallback_triggered'].includes(log.status), `Valid status, got ${log.status}`);
      assert(log.error_message !== undefined, 'Failed provider logs must specify error_message');
    }
  });

  await test('Structured extraction resilient fallback when all providers fail', async () => {
    const parsed = await AIProviderManager.extractStructuredTransaction('beli nasi padang 25rb tunai');

    assert.strictEqual(parsed.type, 'expense');
    assert.strictEqual(parsed.amount, 25000);
    assert.strictEqual(parsed.category, 'Makanan & Minuman');
    assert.strictEqual(parsed.wallet, 'Dompet Tunai');
    assert.strictEqual(parsed.is_ambiguous, false);
  });

  await test('Telemetry synchronization: logs are written to both mockStore.aiLogs and dataStore.aiLogs', async () => {
    const mockLenBefore = mockStore.aiLogs.length;
    const dataLenBefore = dataStore.aiLogs.length;

    await AIProviderManager.executeTextGeneration('Telemetry sync test prompt', 'telegram_text');

    assert(mockStore.aiLogs.length > mockLenBefore, 'mockStore.aiLogs must receive new log');
    assert(dataStore.aiLogs.length > dataLenBefore, 'dataStore.aiLogs must receive new log');

    assert.strictEqual(mockStore.aiLogs[0].id, dataStore.aiLogs[0].id, 'Latest log IDs must be synchronized');
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: BUDGET THRESHOLD TRIGGERS (80% AND 100%)
  // ---------------------------------------------------------------------------
  console.log('\n--- Challenger Suite 5: Budget Threshold Triggers (80% & 100%) ---');

  await test('evaluateBudgetAlert threshold boundaries (79%, 80%, 99%, 100%, 120%)', () => {
    // 79%: No alert
    const r79 = evaluateBudgetAlert(790000, 1000000);
    assert.strictEqual(r79.percentage, 79);
    assert.strictEqual(r79.isOver80, false);
    assert.strictEqual(r79.isOver100, false);
    assert.strictEqual(r79.alertMessage, undefined);

    // 80%: Alert 80 triggered, Alert 100 NOT triggered
    const r80 = evaluateBudgetAlert(800000, 1000000);
    assert.strictEqual(r80.percentage, 80);
    assert.strictEqual(r80.isOver80, true);
    assert.strictEqual(r80.isOver100, false);
    assert(r80.alertMessage && r80.alertMessage.includes('80%+'));

    // 99%: Alert 80 triggered, Alert 100 NOT triggered
    const r99 = evaluateBudgetAlert(990000, 1000000);
    assert.strictEqual(r99.percentage, 99);
    assert.strictEqual(r99.isOver80, true);
    assert.strictEqual(r99.isOver100, false);
    assert(r99.alertMessage && r99.alertMessage.includes('80%+'));

    // 100%: Alert 100 triggered (and isOver80 is also true)
    const r100 = evaluateBudgetAlert(1000000, 1000000);
    assert.strictEqual(r100.percentage, 100);
    assert.strictEqual(r100.isOver80, true);
    assert.strictEqual(r100.isOver100, true);
    assert(r100.alertMessage && r100.alertMessage.includes('100%+'));

    // 120%: Over-budget
    const r120 = evaluateBudgetAlert(1200000, 1000000);
    assert.strictEqual(r120.percentage, 120);
    assert.strictEqual(r120.isOver80, true);
    assert.strictEqual(r120.isOver100, true);
    assert(r120.alertMessage && r120.alertMessage.includes('100%+'));
  });

  await test('mockStore.addTransaction dynamic threshold transition: 0% -> 85% -> 110%', () => {
    const userId = 'user-starter-123';
    const testCatId = 'cat-test-stress';

    const testBudget = {
      id: 'budget-stress-test',
      user_id: userId,
      category_id: testCatId,
      monthly_amount: 100000,
      monthlyAmount: 100000,
      spent_amount: 0,
      spentAmount: 0,
      month: 10,
      year: 2026,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockStore.budgets.set(testBudget.id, testBudget as any);

    // Step 1: Add 50,000 (50%) -> no alerts
    mockStore.addTransaction({
      user_id: userId,
      wallet_id: 'wallet-bca',
      category_id: testCatId,
      type: 'expense',
      amount: 50000,
      notes: 'Test expense 50k',
      source: 'web_manual',
    });
    assert.strictEqual(testBudget.spent_amount, 50000);
    assert.strictEqual(testBudget.alert_80_sent, false);
    assert.strictEqual(testBudget.alert_100_sent, false);

    // Step 2: Add 35,000 (Total 85,000 = 85%) -> alert_80_sent becomes true
    mockStore.addTransaction({
      user_id: userId,
      wallet_id: 'wallet-bca',
      category_id: testCatId,
      type: 'expense',
      amount: 35000,
      notes: 'Test expense 35k',
      source: 'web_manual',
    });
    assert.strictEqual(testBudget.spent_amount, 85000);
    assert.strictEqual(testBudget.alert_80_sent, true);
    assert.strictEqual(testBudget.alert_100_sent, false);

    // Step 3: Add 25,000 (Total 110,000 = 110%) -> alert_100_sent becomes true
    mockStore.addTransaction({
      user_id: userId,
      wallet_id: 'wallet-bca',
      category_id: testCatId,
      type: 'expense',
      amount: 25000,
      notes: 'Test expense 25k',
      source: 'web_manual',
    });
    assert.strictEqual(testBudget.spent_amount, 110000);
    assert.strictEqual(testBudget.alert_80_sent, true);
    assert.strictEqual(testBudget.alert_100_sent, true);

    // Step 4: Income transactions do NOT increment expense budget spent amount
    mockStore.addTransaction({
      user_id: userId,
      wallet_id: 'wallet-bca',
      category_id: testCatId,
      type: 'income',
      amount: 200000,
      notes: 'Income test',
      source: 'web_manual',
    });
    assert.strictEqual(testBudget.spent_amount, 110000, 'Income must not alter expense budget spent amount');
  });

  await test('dataStore.addTransaction threshold transition: 0% -> 80% -> 100%', () => {
    let budget = dataStore.budgets.find((b) => b.categoryId === 'cat_stress');
    if (!budget) {
      budget = {
        id: 'b_stress',
        userId: dataStore.user.id,
        categoryId: 'cat_stress',
        categoryName: 'Stress Test',
        categoryEmoji: '⚡',
        monthlyAmount: 200000,
        monthly_amount: 200000,
        spentAmount: 0,
        spent_amount: 0,
        monthYear: '2026-10',
        alert_80_sent: false,
        alert_100_sent: false,
      };
      dataStore.budgets.push(budget);
    } else {
      budget.spentAmount = 0;
      budget.spent_amount = 0;
      budget.alert_80_sent = false;
      budget.alert_100_sent = false;
    }

    const defaultWallet = dataStore.wallets[0];

    // Add 160,000 (80%)
    dataStore.addTransaction({
      userId: dataStore.user.id,
      walletId: defaultWallet.id,
      walletName: defaultWallet.name,
      categoryId: 'cat_stress',
      categoryName: 'Stress Test',
      categoryEmoji: '⚡',
      type: 'expense',
      amount: 160000,
      notes: 'Add 160k',
      transactionDate: new Date().toISOString(),
      source: 'web_manual',
    });
    assert.strictEqual(budget.spentAmount, 160000);
    assert.strictEqual(budget.alert_80_sent, true);
    assert.strictEqual(budget.alert_100_sent, false);

    // Add 40,000 (Total 200,000 = 100%)
    dataStore.addTransaction({
      userId: dataStore.user.id,
      walletId: defaultWallet.id,
      walletName: defaultWallet.name,
      categoryId: 'cat_stress',
      categoryName: 'Stress Test',
      categoryEmoji: '⚡',
      type: 'expense',
      amount: 40000,
      notes: 'Add 40k',
      transactionDate: new Date().toISOString(),
      source: 'web_manual',
    });
    assert.strictEqual(budget.spentAmount, 200000);
    assert.strictEqual(budget.alert_80_sent, true);
    assert.strictEqual(budget.alert_100_sent, true);
  });

  console.log('\n================================================================');
  console.log(`CHALLENGER STRESS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} tests`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error('\n🚨 FAILURES DETECTED IN CHALLENGER SUITE:');
    for (const f of failures) {
      console.error(`❌ [${f.name}]:\n   ${f.error?.stack || f.error?.message || f.error}\n`);
    }
    throw new Error(`${failedTests} challenger stress tests failed`);
  }

  return { passed: passedTests, failed: failedTests };
}
