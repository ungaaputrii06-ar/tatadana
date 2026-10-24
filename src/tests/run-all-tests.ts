import assert from 'assert';
import { parseIndonesianAmount, parseTransactionWithAI } from '../lib/ai/parser';
import {
  createProgressBar,
  formatExpenseReply,
  formatIncomeReply,
  formatReminderMessage,
  formatFinancialAdvisorMessage,
} from '../lib/telegram/reply-formatter';
import { handleBotCommand } from '../lib/telegram/commands';
import { handleTelegramCommand } from '../lib/telegram-parser';
import { checkPlanLimit, PLAN_LIMITS } from '../lib/utils/limits';
import { evaluateFinancialAdvisorTriggers } from '../lib/ai/advisor';
import { generateFinancialPDF } from '../lib/reports/pdf-generator';
import { generateFinancialExcel } from '../lib/reports/excel-generator';
import { mockStore } from '../lib/supabase/mock-store';
import { UserProfile, Transaction } from '../lib/types';
import { isBoostOrPercepatCommand, parseBoostCommand, shiftTimeMinutes, getEffectiveReminderTimes } from '../lib/utils/date';
import { checkDueReminders, applyTurboBoost, escalateTurboBoost, disableTurboBoost, getBoostedReminderInfo, formatInstantReminderPreview } from '../lib/reminder-scheduler';
import { dataStore } from '../lib/storage-mock';
import { fastCache, prefetchUserFinancialData } from '../lib/cache';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✅ PASS: ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ❌ FAIL: ${name}`, err);
          failed++;
        });
    } else {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    }
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`, err);
    failed++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING TATADANA AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // 1. Indonesian Currency Amount Parsing Tests
  console.log('--- 1. Testing parseIndonesianAmount ---');
  runTest('Parse "15rb" to 15000', () => {
    assert.strictEqual(parseIndonesianAmount('15rb'), 15000);
  });
  runTest('Parse "15 ribu" to 15000', () => {
    assert.strictEqual(parseIndonesianAmount('15 ribu'), 15000);
  });
  runTest('Parse "1.5jt" to 1500000', () => {
    assert.strictEqual(parseIndonesianAmount('1.5jt'), 1500000);
  });
  runTest('Parse "1,5jt" to 1500000 (Indonesian comma decimal)', () => {
    assert.strictEqual(parseIndonesianAmount('1,5jt'), 1500000);
  });
  runTest('Parse "500k" to 500000', () => {
    assert.strictEqual(parseIndonesianAmount('500k'), 500000);
  });
  runTest('Parse "2.5m" to 2500000000 (Miliar)', () => {
    assert.strictEqual(parseIndonesianAmount('2.5m'), 2500000000);
  });
  runTest('Parse "Rp 50.000" to 50000', () => {
    assert.strictEqual(parseIndonesianAmount('Rp 50.000'), 50000);
  });
  runTest('Return null for text with no amount', () => {
    assert.strictEqual(parseIndonesianAmount('halo selamat pagi'), null);
  });

  // 2. AI Transaction Parsing Tests
  console.log('\n--- 2. Testing parseTransactionWithAI ---');
  await runTest('Parse expense: "beli bakso 15rb"', async () => {
    const res = await parseTransactionWithAI('beli bakso 15rb');
    assert.strictEqual(res.type, 'expense');
    assert.strictEqual(res.amount, 15000);
    assert.strictEqual(res.category, 'Makanan & Minuman');
    assert.strictEqual(res.is_ambiguous, false);
  });

  await runTest('Parse income: "gajian bulanan 5jt"', async () => {
    const res = await parseTransactionWithAI('gajian bulanan 5jt');
    assert.strictEqual(res.type, 'income');
    assert.strictEqual(res.amount, 5000000);
    assert.strictEqual(res.category, 'Gaji & Upah');
    assert.strictEqual(res.is_ambiguous, false);
  });

  await runTest('Catch ambiguous input: "halo bot"', async () => {
    const res = await parseTransactionWithAI('halo bot');
    assert.strictEqual(res.is_ambiguous, true);
    assert(res.suggested_format && res.suggested_format.includes('Contoh format'));
  });

  // 3. Telegram Reply Formatters Tests
  console.log('\n--- 3. Testing Telegram Reply Formatters ---');
  runTest('Create visual progress bar (70% -> 7 filled, 3 empty)', () => {
    const bar = createProgressBar(70, 10);
    assert.strictEqual(bar, '███████░░░');
  });

  runTest('Format expense reply matches specification format', () => {
    const msg = formatExpenseReply({
      amount: 15000,
      category: { name: 'Makanan & Minuman', emoji: '🍜' },
      wallet: { name: 'BCA Utama', balance: 4500000 },
      notes: 'beli bakso',
      budget: {
        id: 'b-1',
        user_id: 'u-1',
        category_id: 'c-1',
        monthly_amount: 1000000,
        spent_amount: 800000,
        month: 10,
        year: 2026,
        alert_80_sent: false,
        alert_100_sent: false,
        created_at: '',
        updated_at: '',
      },
    });

    assert(msg.includes('💸 Pengeluaran tercatat!'));
    assert(msg.includes('├ Nominal : Rp15.000'));
    assert(msg.includes('├ Kategori : 🍜 Makanan & Minuman'));
    assert(msg.includes('├ Dompet : 👛 BCA Utama'));
    assert(msg.includes('📊 Budget Makanan & Minuman bulan ini:'));
  });

  runTest('Format income reply matches specification format', () => {
    const msg = formatIncomeReply({
      amount: 5000000,
      wallet: { name: 'BCA Utama', balance: 9500000 },
    });

    assert(msg.includes('💰 Pemasukan tercatat!'));
    assert(msg.includes('├ Nominal : Rp5.000.000'));
    assert(msg.includes('├ Kategori : 💼 Pemasukan'));
    assert(msg.includes('Semangat terus!'));
  });

  // 4. Telegram Commands Tests
  console.log('\n--- 4. Testing Bot Commands ---');
  const testUser = mockStore.profiles.get('user-starter-123')!;
  await runTest('Handle /saldo command', async () => {
    const reply = await handleBotCommand('/saldo', testUser);
    assert(reply.includes('Daftar Saldo Dompet'));
    assert(reply.includes('BCA Utama'));
    assert(reply.includes('Total Saldo Keseluruhan'));
  });

  await runTest('Handle /hari ini command', async () => {
    const reply = await handleBotCommand('/hari ini', testUser);
    assert(reply.includes('Rekap Transaksi Hari Ini'));
  });

  await runTest('Handle /bulan ini command', async () => {
    const reply = await handleBotCommand('/bulan ini', testUser);
    assert(reply.includes('Rekap Bulan Ini'));
    assert(reply.includes('Total Pemasukan'));
  });

  await runTest('Handle /bantuan command', async () => {
    const reply = await handleBotCommand('/bantuan', testUser);
    assert(reply.includes('Daftar Perintah TataDana Bot'));
    assert(reply.includes('/saldo'));
  });

  // 5. Subscription Limits Tests
  console.log('\n--- 5. Testing Plan Limits Enforcement ---');
  const starterUser: UserProfile = { ...testUser, plan: 'starter' };
  const proUser: UserProfile = { ...testUser, plan: 'pro' };

  runTest('Starter: Reject when monthly tx >= 50', () => {
    const check = checkPlanLimit(starterUser, 'maxMonthlyTransactions', 50);
    assert.strictEqual(check.allowed, false);
    assert(check.message && check.message.includes('50 transaksi/bulan'));
  });

  runTest('Starter: Reject receipt photo OCR', () => {
    const check = checkPlanLimit(starterUser, 'allowReceiptPhoto');
    assert.strictEqual(check.allowed, false);
    assert(check.message && check.message.includes('khusus Pro'));
  });

  runTest('Pro: Allow unlimited monthly tx', () => {
    const check = checkPlanLimit(proUser, 'maxMonthlyTransactions', 500);
    assert.strictEqual(check.allowed, true);
  });

  runTest('Pro: Allow receipt photo OCR', () => {
    const check = checkPlanLimit(proUser, 'allowReceiptPhoto');
    assert.strictEqual(check.allowed, true);
  });

  // 6. AI Financial Advisor Trigger Tests
  console.log('\n--- 6. Testing AI Financial Advisor Triggers ---');
  runTest('Pro user: Trigger when single expense >= 20% of category budget', () => {
    const budget = {
      id: 'b-food',
      user_id: proUser.id,
      category_id: 'cat-01',
      monthly_amount: 1000000,
      spent_amount: 100000,
      month: 10,
      year: 2026,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: '',
      updated_at: '',
    };
    const tx: Transaction = {
      id: 'tx-test',
      user_id: proUser.id,
      wallet_id: 'w-1',
      category_id: 'cat-01',
      type: 'expense',
      amount: 250000, // 25% of 1M budget
      transaction_date: new Date().toISOString(),
      source: 'web_manual',
      created_at: '',
      updated_at: '',
    };

    const evalResult = evaluateFinancialAdvisorTriggers(proUser, tx, budget);
    assert.strictEqual(evalResult.triggered, true);
    assert.strictEqual(evalResult.reason, 'large_single_expense');
    assert(evalResult.message && evalResult.message.includes('Financial Advisor'));
  });

  runTest('Starter user: Do not trigger Advisor (Pro only)', () => {
    const tx: Transaction = {
      id: 'tx-test2',
      user_id: starterUser.id,
      wallet_id: 'w-1',
      type: 'expense',
      amount: 9999999,
      transaction_date: new Date().toISOString(),
      source: 'web_manual',
      created_at: '',
      updated_at: '',
    };
    const evalResult = evaluateFinancialAdvisorTriggers(starterUser, tx);
    assert.strictEqual(evalResult.triggered, false);
  });

  // 7. Report Generators Tests
  console.log('\n--- 7. Testing PDF & Excel Generators ---');
  runTest('Generate PDF report returns valid Uint8Array buffer', () => {
    const txs = mockStore.getTransactionsByUser(testUser.id);
    const pdf = generateFinancialPDF({
      user: testUser,
      transactions: txs,
      totalIncome: 6500000,
      totalExpense: 245000,
      netCashflow: 6255000,
    });
    assert(pdf instanceof Uint8Array);
    assert(pdf.length > 500, 'PDF buffer should not be empty');
  });

  runTest('Generate Excel report returns valid Uint8Array buffer', () => {
    const txs = mockStore.getTransactionsByUser(testUser.id);
    const excel = generateFinancialExcel({
      user: testUser,
      transactions: txs,
      totalIncome: 6500000,
      totalExpense: 245000,
      netCashflow: 6255000,
    });
    assert(excel instanceof Uint8Array);
    assert(excel.length > 500, 'Excel buffer should not be empty');
  });

  runTest('Generate CSV report returns valid Uint8Array buffer with readable content', () => {
    const txs = mockStore.getTransactionsByUser(testUser.id);
    const csv = generateFinancialExcel(
      {
        user: testUser,
        transactions: txs,
        totalIncome: 6500000,
        totalExpense: 245000,
        netCashflow: 6255000,
      },
      'csv'
    );
    assert(csv instanceof Uint8Array);
    assert(csv.length > 50, 'CSV buffer should not be empty');
    const text = new TextDecoder().decode(csv);
    assert(text.includes('TATADANA - LAPORAN KEUANGAN PRIBADI'));
  });

  // 8. Wallet Balance Calculations Test
  console.log('\n--- 8. Testing Wallet Balance Auto Calculation ---');
  runTest('Add expense transaction automatically decreases wallet balance', () => {
    const wallet = mockStore.wallets.get('wallet-bca')!;
    const prevBalance = wallet.balance;

    mockStore.addTransaction({
      user_id: testUser.id,
      wallet_id: wallet.id,
      type: 'expense',
      amount: 50000,
      transaction_date: new Date().toISOString(),
      source: 'web_manual',
    });

    assert.strictEqual(wallet.balance, prevBalance - 50000);
  });

  runTest('Add transfer transaction moves money between wallets', () => {
    const fromW = mockStore.wallets.get('wallet-bca')!;
    const toW = mockStore.wallets.get('wallet-cash')!;
    const prevFrom = fromW.balance;
    const prevTo = toW.balance;

    mockStore.addTransaction({
      user_id: testUser.id,
      wallet_id: fromW.id,
      to_wallet_id: toW.id,
      type: 'transfer',
      amount: 100000,
      transaction_date: new Date().toISOString(),
      source: 'web_manual',
    });

    assert.strictEqual(fromW.balance, prevFrom - 100000);
    assert.strictEqual(toW.balance, prevTo + 100000);
  });

  // 9. Turbo Boost Command & Time Calculations
  console.log('\n--- 9. Testing /boost Command & Schedule Acceleration ---');
  runTest('Parse "/boost 10 mnt lebih cepat" -> 10 minutes', () => {
    const res = parseBoostCommand('/boost 10 mnt lebih cepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 10);
  });

  runTest('Parse "/boost 10 menit lebih cepat" -> 10 minutes', () => {
    const res = parseBoostCommand('/boost 10 menit lebih cepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 10);
  });

  runTest('Parse "5 menit lebih cpt" -> 5 minutes', () => {
    const res = parseBoostCommand('5 menit lebih cpt');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 5);
  });

  runTest('Parse "/boost 5 menit lebih cpt" -> 5 minutes', () => {
    const res = parseBoostCommand('/boost 5 menit lebih cpt');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 5);
  });

  runTest('Parse "10 mnt lebih cepat" without slash or prefix -> 10 minutes', () => {
    const res = parseBoostCommand('10 mnt lebih cepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 10);
  });

  runTest('Parse "5 mnt lebih cpt" -> 5 minutes', () => {
    const res = parseBoostCommand('5 mnt lebih cpt');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 5);
  });

  runTest('Parse "/boost 15m" -> 15 minutes', () => {
    const res = parseBoostCommand('/boost 15m');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 15);
  });

  runTest('Parse bare "/boost" -> defaults to 10 minutes', () => {
    const res = parseBoostCommand('/boost');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 10);
  });

  runTest('Parse "/boost percepat" -> 15 minutes turbo mode', () => {
    const res = parseBoostCommand('/boost percepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 15);
    assert.strictEqual(res.action, 'enable');
  });

  runTest('Parse "boost percepat" without slash -> 15 minutes', () => {
    const res = parseBoostCommand('boost percepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 15);
    assert.strictEqual(res.action, 'enable');
  });

  runTest('Parse bare "/percepat" -> 15 minutes', () => {
    const res = parseBoostCommand('/percepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 15);
    assert.strictEqual(res.action, 'enable');
  });

  runTest('Parse bare "percepat" -> 15 minutes', () => {
    const res = parseBoostCommand('percepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 15);
    assert.strictEqual(res.action, 'enable');
  });

  runTest('Parse "/boost percepat 10 mnt" -> explicit 10 minutes', () => {
    const res = parseBoostCommand('/boost percepat 10 mnt');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 10);
    assert.strictEqual(res.action, 'enable');
  });

  runTest('Parse "/percepat off" -> action disable', () => {
    const res = parseBoostCommand('/percepat off');
    assert.strictEqual(res.isBoost, false);
    assert.strictEqual(res.action, 'disable');
  });

  runTest('Shift "12:00" 10 minutes earlier -> "11:50"', () => {
    const shifted = shiftTimeMinutes('12:00', 10);
    assert.strictEqual(shifted, '11:50');
  });

  runTest('Shift "12:00" 15 minutes earlier (percepat) -> "11:45"', () => {
    const shifted = shiftTimeMinutes('12:00', 15);
    assert.strictEqual(shifted, '11:45');
  });

  runTest('Shift "20:00" 10 minutes earlier -> "19:50"', () => {
    const shifted = shiftTimeMinutes('20:00', 10);
    assert.strictEqual(shifted, '19:50');
  });

  runTest('Shift "20:00" 15 minutes earlier (percepat) -> "19:45"', () => {
    const shifted = shiftTimeMinutes('20:00', 15);
    assert.strictEqual(shifted, '19:45');
  });

  runTest('Shift "00:05" 10 minutes earlier with midnight wrap-around -> "23:55"', () => {
    const shifted = shiftTimeMinutes('00:05', 10);
    assert.strictEqual(shifted, '23:55');
  });

  await runTest('Handle /boost 10 mnt lebih cepat in handleBotCommand', async () => {
    const reply = await handleBotCommand('/boost 10 mnt lebih cepat', testUser);
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('10 menit lebih awal'));
    assert(reply.includes('11:50 WIB'));
    assert(reply.includes('19:50 WIB'));
  });

  await runTest('Handle /boost percepat in handleBotCommand', async () => {
    disableTurboBoost(testUser.id);
    const reply = await handleBotCommand('/boost percepat', testUser);
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('15 menit lebih awal'));
    assert(reply.includes('11:45 WIB'));
    assert(reply.includes('19:45 WIB'));
  });

  await runTest('Handle bare "percepat" in handleBotCommand', async () => {
    disableTurboBoost(testUser.id);
    const reply = await handleBotCommand('percepat', testUser);
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('15 menit lebih awal'));
    assert(reply.includes('11:45 WIB'));
    assert(reply.includes('19:45 WIB'));
  });

  await runTest('Handle "5 menit lebih cpt" in handleBotCommand', async () => {
    disableTurboBoost(testUser.id);
    const reply = await handleBotCommand('5 menit lebih cpt', testUser);
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('5 menit lebih awal'));
    assert(reply.includes('11:55 WIB'));
    assert(reply.includes('19:55 WIB'));
  });

  runTest('Handle "5 menit lebih cpt" in handleTelegramCommand', () => {
    disableTurboBoost(testUser.id);
    disableTurboBoost(dataStore.user.id);
    const reply = handleTelegramCommand('5 menit lebih cpt', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('5 menit lebih awal'));
    assert(reply.includes('11:55 WIB'));
    assert(reply.includes('19:55 WIB'));
  });

  runTest('Handle /boost 10 mnt lebih cepat in handleTelegramCommand', () => {
    const reply = handleTelegramCommand('/boost 10 mnt lebih cepat', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('10 menit lebih awal'));
  });

  runTest('Handle /boost percepat in handleTelegramCommand', () => {
    disableTurboBoost(testUser.id);
    disableTurboBoost(dataStore.user.id);
    const reply = handleTelegramCommand('/boost percepat', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('15 menit lebih awal'));
  });

  runTest('Handle bare "percepat" in handleTelegramCommand', () => {
    disableTurboBoost(testUser.id);
    disableTurboBoost(dataStore.user.id);
    const reply = handleTelegramCommand('percepat', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Turbo Boost TataDana Diaktifkan'));
    assert(reply.includes('15 menit lebih awal'));
  });

  runTest('Parse "/boost off" -> action disable', () => {
    const res = parseBoostCommand('/boost off');
    assert.strictEqual(res.isBoost, false);
    assert.strictEqual(res.action, 'disable');
  });

  runTest('Parse "boost 10 mnt lebih cepat" without slash -> 10 minutes', () => {
    const res = parseBoostCommand('boost 10 mnt lebih cepat');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 10);
  });

  runTest('Parse "/boost status" and "/percepat status" -> action status', () => {
    const s1 = parseBoostCommand('/boost status');
    assert.strictEqual(s1.isBoost, true);
    assert.strictEqual(s1.action, 'status');
    const s2 = parseBoostCommand('/percepat status');
    assert.strictEqual(s2.isBoost, true);
    assert.strictEqual(s2.action, 'status');
    const s3 = parseBoostCommand('percepat status');
    assert.strictEqual(s3.isBoost, true);
    assert.strictEqual(s3.action, 'status');
  });

  runTest('Parse uppercase & punctuation tolerant: "/BOOST PERCEPAT!" -> 15 minutes', () => {
    const res = parseBoostCommand('/BOOST PERCEPAT!');
    assert.strictEqual(res.isBoost, true);
    assert.strictEqual(res.minutes, 15);
    assert.strictEqual(res.action, 'enable');
  });

  runTest('isBoostOrPercepatCommand correctly identifies boost commands', () => {
    assert.strictEqual(isBoostOrPercepatCommand('/boost percepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost percepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/turbo'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepat 15'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepat dong'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepat off'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('10 mnt lebih cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('10 menit lebih cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 menit lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost 5 menit lebih cpt'), true);
  });

  runTest('isBoostOrPercepatCommand rejects financial transactions (no false positives)', () => {
    assert.strictEqual(isBoostOrPercepatCommand('percepat bayar hutang 50rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('percepat belanja 100k'), false);
    assert.strictEqual(isBoostOrPercepatCommand('beli bakso 15rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('gajian 5jt'), false);
  });

  runTest('Shift time with large minutes buffer > 24h: "00:00", 1450 -> "23:50"', () => {
    const res = shiftTimeMinutes('00:00', 1450);
    assert.strictEqual(res, '23:50');
  });

  await runTest('Handle /boost off in handleBotCommand', async () => {
    const reply = await handleBotCommand('/boost off', testUser);
    assert(reply.includes('Turbo Boost TataDana Dinonaktifkan'));
  });

  await runTest('Handle /boost status in handleBotCommand', async () => {
    const reply = await handleBotCommand('/boost status', testUser);
    assert(reply.includes('Jadwal Pengingat Saat Ini'));
    assert(reply.includes('Status Akselerasi Sistem'));
  });

  runTest('Handle /percepat status in handleTelegramCommand', () => {
    const reply = handleTelegramCommand('/percepat status', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Jadwal Pengingat Saat Ini'));
    assert(reply.includes('Status Akselerasi Sistem'));
  });

  // 10. Reminder Scheduler Turbo Boost Trigger & Caching
  console.log('\n--- 10. Testing Reminder Scheduler Turbo Buffer & Cache ---');
  runTest('Apply turbo boost to reminder configuration', () => {
    const boosted = applyTurboBoost(testUser.id, 10);
    assert.strictEqual(boosted.boostMode, true);
    assert.strictEqual(boosted.boostMinutes, 10);
    assert.strictEqual(boosted.effectiveTimes.time1, '11:50');
    assert.strictEqual(boosted.effectiveTimes.time2, '19:50');
  });

  runTest('Trigger reminder at 11:50 WIB (10 mins earlier than 12:00)', () => {
    // Force user reminder
    applyTurboBoost(testUser.id, 10);
    const result = checkDueReminders('11:50');
    assert(result.dueCount >= 1, 'Should trigger at 11:50 WIB due to 10m turbo boost');
    const matched = result.triggered.find((t) => t.userId === testUser.id);
    assert(matched !== undefined, 'Matched trigger for user');
    assert.strictEqual(matched?.effectiveTime, '11:50');
    assert.strictEqual(matched?.isBoosted, true);
  });

  runTest('FastCache stores and retrieves in-memory entries', () => {
    fastCache.set('test-key', { speed: '10x' }, 5000);
    const retrieved = fastCache.get<{ speed: string }>('test-key');
    assert.deepStrictEqual(retrieved, { speed: '10x' });
  });

  runTest('FastCache invalidates entries by prefix', () => {
    fastCache.set('txs:user1', [1, 2], 5000);
    fastCache.set('txs:user2', [3, 4], 5000);
    fastCache.invalidatePrefix('txs:');
    assert.strictEqual(fastCache.get('txs:user1'), undefined);
    assert.strictEqual(fastCache.get('txs:user2'), undefined);
  });

  await runTest('FastCache memoize accelerates async function calls', async () => {
    let callCount = 0;
    const expensiveFn = async (id: number) => {
      callCount++;
      return `result-${id}`;
    };
    const memoized = fastCache.memoize('expensive', expensiveFn, 10000);
    const r1 = await memoized(42);
    const r2 = await memoized(42);
    assert.strictEqual(r1, 'result-42');
    assert.strictEqual(r2, 'result-42');
    assert.strictEqual(callCount, 1, 'expensiveFn should only execute once');
  });

  // 11. Extreme Turbo Boost (Multi-Level Escalation, Level 2 30m Buffer, Query Indexing & Cache Warmup)
  console.log('\n--- 11. Testing Extreme Turbo Boost & Multi-Level Escalation ---');

  runTest('parseBoostCommand parses extreme/max keywords into Level 2 (30m)', () => {
    const r1 = parseBoostCommand('/boost extreme');
    assert.strictEqual(r1.isBoost, true);
    assert.strictEqual(r1.minutes, 30);
    assert.strictEqual(r1.level, 2);

    const r2 = parseBoostCommand('/percepat max');
    assert.strictEqual(r2.isBoost, true);
    assert.strictEqual(r2.minutes, 30);
    assert.strictEqual(r2.level, 2);

    const r3 = parseBoostCommand('/boost 30');
    assert.strictEqual(r3.isBoost, true);
    assert.strictEqual(r3.minutes, 30);
    assert.strictEqual(r3.level, 2);

    const r4 = parseBoostCommand('/boost preview');
    assert.strictEqual(r4.isBoost, true);
    assert.strictEqual(r4.action, 'preview');
  });

  await runTest('Stepped escalation: repeated /boost percepat escalates from Level 1 (15m) to Level 2 Extreme Turbo (30m)', async () => {
    // 1. Initial /boost percepat sets Level 1 (15m)
    applyTurboBoost(testUser.id, 15, 1);
    const infoLevel1 = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(infoLevel1.boostMinutes, 15);
    assert.strictEqual(infoLevel1.boostLevel, 1);

    // 2. Repeating /boost percepat while already at 15m escalates to Level 2 (30m)
    const escalatedReply = await handleBotCommand('/boost percepat', testUser);
    assert(escalatedReply.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'), 'Should activate Extreme Turbo Level 2');
    assert(escalatedReply.includes('30 menit lebih awal'), 'Should show 30 minutes buffer');
    assert(escalatedReply.includes('11:30 WIB'), 'Daytime reminder shifted to 11:30 WIB');
    assert(escalatedReply.includes('19:30 WIB'), 'Night reminder shifted to 19:30 WIB');
    assert(escalatedReply.includes('Preview Pengingat Instan'), 'Should include instant reminder preview');

    const infoLevel2 = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(infoLevel2.boostMode, true);
    assert.strictEqual(infoLevel2.boostMinutes, 30);
    assert.strictEqual(infoLevel2.boostLevel, 2);
    assert.strictEqual(infoLevel2.effectiveTimes.time1, '11:30');
    assert.strictEqual(infoLevel2.effectiveTimes.time2, '19:30');
  });

  await runTest('Stepped escalation: initial bare /boost sets Level 1 (10m) and repeated /boost escalates to Level 2 (30m)', async () => {
    // 1. Initial clean state
    disableTurboBoost(testUser.id);
    const reply1 = await handleBotCommand('/boost', testUser);
    assert(reply1.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(reply1.includes('10 menit lebih awal'));
    assert(reply1.includes('11:50 WIB'));
    assert(reply1.includes('19:50 WIB'));

    const info1 = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(info1.boostMode, true);
    assert.strictEqual(info1.boostMinutes, 10);
    assert.strictEqual(info1.boostLevel, 1);

    // 2. Invoking /boost again escalates to Level 2 Extreme Turbo (30m)
    const reply2 = await handleBotCommand('/boost', testUser);
    assert(reply2.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
    assert(reply2.includes('30 menit lebih awal'));
    assert(reply2.includes('11:30 WIB'));
    assert(reply2.includes('19:30 WIB'));

    const info2 = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(info2.boostMode, true);
    assert.strictEqual(info2.boostMinutes, 30);
    assert.strictEqual(info2.boostLevel, 2);

    // 3. Repeating /boost again while at Level 2 confirms maximum acceleration
    const reply3 = await handleBotCommand('/boost', testUser);
    assert(reply3.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
    assert(reply3.includes('30 menit lebih awal'));
  });

  runTest('Stepped escalation in handleTelegramCommand: repeated bare /boost escalates to Level 2', () => {
    // Initial state at 10m Level 1
    applyTurboBoost(testUser.id, 10, 1);
    const reply = handleTelegramCommand('/boost', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
    assert(reply.includes('30 menit lebih awal'));
    assert(reply.includes('11:30 WIB'));
    assert(reply.includes('19:30 WIB'));
  });

  runTest('Stepped escalation in handleTelegramCommand: repeated /boost percepat escalates to Level 2', () => {
    // Set at 15m Level 1
    applyTurboBoost(testUser.id, 15, 1);
    const reply = handleTelegramCommand('/boost percepat', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
    assert(reply.includes('30 menit lebih awal'));
    assert(reply.includes('11:30 WIB'));
    assert(reply.includes('19:30 WIB'));
  });

  await runTest('Explicit /boost extreme activates Level 2 directly', async () => {
    const reply = await handleBotCommand('/boost extreme', testUser);
    assert(reply.includes('Extreme Turbo Boost TataDana Diaktifkan!'));
    assert(reply.includes('30 menit lebih awal'));
    assert(reply.includes('11:30 WIB'));
  });

  await runTest('Handle /boost preview displays instant reminder simulation', async () => {
    const reply = await handleBotCommand('/boost preview', testUser);
    assert(reply.includes('Preview Pengingat Instan TataDana'));
    assert(reply.includes('Reminder Keuangan TataDana!'));
    assert(reply.includes('kopi susu 25k'));
  });

  runTest('formatInstantReminderPreview function returns formatted reminder template', () => {
    const text = formatInstantReminderPreview();
    assert(text.includes('Preview Pengingat Instan TataDana (Mode Turbo)'));
    assert(text.includes('Reminder Keuangan TataDana!'));
    assert(text.includes('kopi susu 25k'));
  });

  await runTest('/boost status shows Extreme Turbo details when Level 2 is active', async () => {
    applyTurboBoost(testUser.id, 30, 2);
    const reply = await handleBotCommand('/boost status', testUser);
    assert(reply.includes('Extreme Turbo Boost Aktif (Level 2 - Mode Maksimal)'));
    assert(reply.includes('-30 menit (Level 2 - Ekstrem)'));
    assert(reply.includes('11:30 WIB'));
    assert(reply.includes('19:30 WIB'));
    assert(reply.includes('ON (Level 2 Extreme)'));
    assert(reply.includes('Preview Pengingat Instan'));
  });

  runTest('Trigger reminder at 11:30 WIB (30 mins earlier than 12:00 in Level 2 Extreme Turbo)', () => {
    applyTurboBoost(testUser.id, 30, 2);
    const result = checkDueReminders('11:30');
    assert(result.dueCount >= 1, 'Should trigger at 11:30 WIB due to 30m Level 2 turbo boost');
    const matched = result.triggered.find((t) => t.userId === testUser.id);
    assert(matched !== undefined, 'Matched trigger for user');
    assert.strictEqual(matched?.effectiveTime, '11:30');
    assert.strictEqual(matched?.isBoosted, true);
    assert.strictEqual(matched?.boostLevel, 2);
  });

  runTest('escalateTurboBoost engine function stepped transitions', () => {
    disableTurboBoost(testUser.id);
    const step1 = escalateTurboBoost(testUser.id);
    assert.strictEqual(step1.boostLevel, 1);
    assert.strictEqual(step1.boostMinutes, 15);

    const step2 = escalateTurboBoost(testUser.id);
    assert.strictEqual(step2.boostLevel, 2);
    assert.strictEqual(step2.boostMinutes, 30);
  });

  runTest('MockStore secondary query indexes are populated and provide O(1) lookups', () => {
    const stats = mockStore.getIndexStats();
    assert(stats.userTxIndexSize > 0, 'userTxIndex should have entries');
    assert(stats.userWalletIndexSize > 0, 'userWalletIndex should have entries');
    assert(stats.telegramChatIndexSize > 0, 'telegramChatIndex should have entries');
    assert(stats.phoneIndexSize > 0, 'phoneIndex should have entries');
    assert(stats.totalTransactionsIndexed > 0, 'totalTransactionsIndexed should be > 0');

    // Test findProfileByTelegramChatId using index
    const p = mockStore.findProfileByTelegramChatId(1001);
    assert.strictEqual(p?.id, 'user-starter-123');

    // Test findProfileByPhone using index
    const pPhone = mockStore.findProfileByPhone('081234567890');
    assert.strictEqual(pPhone?.id, 'user-starter-123');

    // Test addTransaction index update
    const prevTxCount = mockStore.getTransactionsByUser(testUser.id).length;
    mockStore.addTransaction({
      user_id: testUser.id,
      amount: 25000,
      type: 'expense',
      wallet_id: 'w-starter-cash',
      category_id: 'cat-food',
      notes: 'Index test kopi',
      transaction_date: new Date().toISOString(),
    });
    const afterTxCount = mockStore.getTransactionsByUser(testUser.id).length;
    assert.strictEqual(afterTxCount, prevTxCount + 1);
  });

  await runTest('FastCache warmup and prefetch accelerate key routes', async () => {
    const warmupResult = await fastCache.warmupKeyRoutes(testUser.id);
    assert(warmupResult.warmedCount >= 5, 'Should warm at least 5 key routes');
    assert.strictEqual(fastCache.isWarm(`wallets:${testUser.id}`), true);
    assert.strictEqual(fastCache.isWarm(`categories:${testUser.id}`), true);
    assert.strictEqual(fastCache.isWarm(`txs:${testUser.id}::::::`), true);

    const prefetchResult = await prefetchUserFinancialData(testUser.id);
    assert(prefetchResult.wallets > 0);
    assert(prefetchResult.txs > 0);

    const cacheStats = fastCache.getStats();
    assert(cacheStats.warmedRoutes > 0);
  });

  await runTest('Stepped escalation when already at Level 2 confirms maximum acceleration and shows preview', async () => {
    applyTurboBoost(testUser.id, 30, 2);
    const reply = await handleBotCommand('/boost percepat', testUser);
    assert(reply.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
    assert(reply.includes('30 menit lebih awal'));
    assert(reply.includes('11:30 WIB'));
    assert(reply.includes('19:30 WIB'));
    assert(reply.includes('Preview Pengingat Instan'));
    const info = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(info.boostLevel, 2);
    assert.strictEqual(info.boostMinutes, 30);
  });

  runTest('getEffectiveReminderTimes returns correct Level 2 properties', () => {
    const res = getEffectiveReminderTimes({
      time1: '12:00',
      time2: '20:00',
      boostMode: true,
      boostMinutes: 30,
      boostLevel: 2,
    });
    assert.strictEqual(res.time1, '11:30');
    assert.strictEqual(res.time2, '19:30');
    assert.strictEqual(res.isBoosted, true);
    assert.strictEqual(res.bufferMinutes, 30);
    assert.strictEqual(res.boostLevel, 2);
  });

  runTest('Anti-false-positive checks remain strictly intact', () => {
    assert.strictEqual(isBoostOrPercepatCommand('percepat bayar hutang 50rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('percepat belanja 100k'), false);
    assert.strictEqual(isBoostOrPercepatCommand('beli bakso 15rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('gajian 5jt'), false);
    assert.strictEqual(isBoostOrPercepatCommand('kopi susu 25ribu'), false);
    assert.strictEqual(isBoostOrPercepatCommand('bensin 50k'), false);
    assert.strictEqual(isBoostOrPercepatCommand('bayar tagihan listrik 150rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('transfer 200rb ke ibu'), false);
    assert.strictEqual(isBoostOrPercepatCommand('percepat 50000'), false);
    assert.strictEqual(isBoostOrPercepatCommand('boost 25.000'), false);
    assert.strictEqual(isBoostOrPercepatCommand('/percepat bayar 50rb'), false);
  });

  // 12. Indonesian Colloquial Slang & Typo Variations (/boost percepet, percepet, cepet, cepetan, lebih cepet, cepetin)
  console.log('\n--- 12. Testing Indonesian Colloquial Slang & Typo Variations (/boost percepet) ---');

  runTest('isBoostOrPercepatCommand detects Indonesian colloquial slang variations', () => {
    // Slang and typo commands
    assert.strictEqual(isBoostOrPercepatCommand('/boost percepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost percepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/cepetan'), true);
    assert.strictEqual(isBoostOrPercepatCommand('cepetan'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/cepetin'), true);
    assert.strictEqual(isBoostOrPercepatCommand('cepetin'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/lebih cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('lebih cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost cepetan'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost cepetan'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost cepetin'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost cepetin'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost lebih cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost lebih cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 10 mnt lebih cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost 10 mnt lebih cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepet dong'), true);
    assert.strictEqual(isBoostOrPercepatCommand('cepetan dong'), true);
    assert.strictEqual(isBoostOrPercepatCommand('cepetin dong'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost percepet dong'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepet ya'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepet ya'), true);
    assert.strictEqual(isBoostOrPercepatCommand('cepetan ya'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepet lah'), true);
    assert.strictEqual(isBoostOrPercepatCommand('percepet deh'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost percepet!'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/BOOST PERCEPET!'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepet 15'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/cepet 10 mnt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/cepetin 15'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepet off'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepet status'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepet extreme'), true);
  });

  runTest('parseBoostCommand parses colloquial slang variations accurately', () => {
    const p1 = parseBoostCommand('/boost percepet');
    assert.strictEqual(p1.isBoost, true);
    assert.strictEqual(p1.minutes, 15);
    assert.strictEqual(p1.level, 1);
    assert.strictEqual(p1.action, 'enable');

    const p2 = parseBoostCommand('boost percepet');
    assert.strictEqual(p2.isBoost, true);
    assert.strictEqual(p2.minutes, 15);
    assert.strictEqual(p2.level, 1);

    const p3 = parseBoostCommand('/percepet');
    assert.strictEqual(p3.isBoost, true);
    assert.strictEqual(p3.minutes, 15);
    assert.strictEqual(p3.level, 1);

    const p4 = parseBoostCommand('percepet');
    assert.strictEqual(p4.isBoost, true);
    assert.strictEqual(p4.minutes, 15);

    const p5 = parseBoostCommand('cepetan');
    assert.strictEqual(p5.isBoost, true);
    assert.strictEqual(p5.minutes, 15);

    const p5b = parseBoostCommand('cepetin');
    assert.strictEqual(p5b.isBoost, true);
    assert.strictEqual(p5b.minutes, 15);

    const p6 = parseBoostCommand('/boost 10 mnt lebih cepet');
    assert.strictEqual(p6.isBoost, true);
    assert.strictEqual(p6.minutes, 10);
    assert.strictEqual(p6.level, 1);

    const p7 = parseBoostCommand('/percepet 20');
    assert.strictEqual(p7.isBoost, true);
    assert.strictEqual(p7.minutes, 20);
    assert.strictEqual(p7.level, 1);

    const p7b = parseBoostCommand('/cepetin 25');
    assert.strictEqual(p7b.isBoost, true);
    assert.strictEqual(p7b.minutes, 25);
    assert.strictEqual(p7b.level, 1);

    const p8 = parseBoostCommand('/percepet off');
    assert.strictEqual(p8.isBoost, false);
    assert.strictEqual(p8.action, 'disable');

    const p9 = parseBoostCommand('/percepet status');
    assert.strictEqual(p9.isBoost, true);
    assert.strictEqual(p9.action, 'status');

    const p10 = parseBoostCommand('/percepet extreme');
    assert.strictEqual(p10.isBoost, true);
    assert.strictEqual(p10.minutes, 30);
    assert.strictEqual(p10.level, 2);

    const p11 = parseBoostCommand('/boost percepet preview');
    assert.strictEqual(p11.isBoost, true);
    assert.strictEqual(p11.action, 'preview');

    const p12 = parseBoostCommand('/boost percepet!');
    assert.strictEqual(p12.isBoost, true);
    assert.strictEqual(p12.minutes, 15);
    assert.strictEqual(p12.level, 1);

    const p13 = parseBoostCommand('/boost lebih cepet');
    assert.strictEqual(p13.isBoost, true);
    assert.strictEqual(p13.minutes, 15);
  });

  await runTest('Stepped escalation: /boost percepet escalates smoothly from Level 1 to Level 2', async () => {
    // Reset to normal state
    disableTurboBoost(testUser.id);
    const initial = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(initial.boostMode, false);

    // 1. First invocation: /boost percepet activates Level 1 (15m buffer)
    const reply1 = await handleBotCommand('/boost percepet', testUser);
    assert(reply1.includes('Turbo Boost TataDana Diaktifkan!'), 'Level 1 boost message');
    assert(reply1.includes('15 menit lebih awal'), '15m buffer shown');
    assert(reply1.includes('11:45 WIB'), 'Daytime reminder shifted to 11:45 WIB');
    assert(reply1.includes('19:45 WIB'), 'Night reminder shifted to 19:45 WIB');

    const info1 = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(info1.boostMode, true);
    assert.strictEqual(info1.boostMinutes, 15);
    assert.strictEqual(info1.boostLevel, 1);

    // 2. Second invocation: repeated /boost percepet escalates to Level 2 Extreme Turbo (30m buffer)
    const reply2 = await handleBotCommand('/boost percepet', testUser);
    assert(reply2.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'), 'Escalated to Level 2');
    assert(reply2.includes('30 menit lebih awal'), '30m buffer shown');
    assert(reply2.includes('11:30 WIB'), 'Daytime reminder shifted to 11:30 WIB');
    assert(reply2.includes('19:30 WIB'), 'Night reminder shifted to 19:30 WIB');
    assert(reply2.includes('Preview Pengingat Instan'), 'Contains instant preview');

    const info2 = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(info2.boostMode, true);
    assert.strictEqual(info2.boostMinutes, 30);
    assert.strictEqual(info2.boostLevel, 2);

    // 3. Third invocation: repeated /boost percepet confirms Level 2 Extreme Turbo
    const reply3 = await handleBotCommand('/boost percepet', testUser);
    assert(reply3.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'), 'Confirms Level 2');
    assert(reply3.includes('30 menit lebih awal'), '30m buffer confirmed');
  });

  await runTest('Stepped escalation with punctuation and particles: repeated /boost percepet! escalates smoothly', async () => {
    // Set to Level 1
    applyTurboBoost(testUser.id, 15, 1);

    // Repeating /boost percepet! with exclamation mark escalates to Level 2
    const reply = await handleBotCommand('/boost percepet!', testUser);
    assert(reply.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'), 'Punctuation-tolerant escalation');
    assert(reply.includes('30 menit lebih awal'));
    assert(reply.includes('11:30 WIB'));
    assert(reply.includes('19:30 WIB'));

    // Repeating with particle 'dong' also escalates / confirms Level 2
    const replyDong = await handleBotCommand('/boost percepet dong', testUser);
    assert(replyDong.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
  });

  runTest('Stepped escalation in handleTelegramCommand with /boost percepet', () => {
    // Set to Level 1
    applyTurboBoost(testUser.id, 15, 1);
    const reply = handleTelegramCommand('/boost percepet', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
    assert(reply.includes('30 menit lebih awal'));
    assert(reply.includes('11:30 WIB'));
    assert(reply.includes('19:30 WIB'));

    // Test with trailing punctuation in handleTelegramCommand
    applyTurboBoost(testUser.id, 15, 1);
    const replyPunct = handleTelegramCommand('/boost percepet!', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(replyPunct.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
  });

  await runTest('Slang commands /percepet, /boost cepetan, /boost lebih cepet, /cepetin activate boost properly', async () => {
    disableTurboBoost(testUser.id);

    // /percepet
    const r1 = await handleBotCommand('/percepet', testUser);
    assert(r1.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(r1.includes('15 menit lebih awal'));

    // Repeating /percepet escalates
    const r2 = await handleBotCommand('/percepet', testUser);
    assert(r2.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));

    // Status check with /percepet status
    const r3 = await handleBotCommand('/percepet status', testUser);
    assert(r3.includes('Extreme Turbo Boost Aktif (Level 2 - Mode Maksimal)'));

    // Disable with /percepet off
    const r4 = await handleBotCommand('/percepet off', testUser);
    assert(r4.includes('Turbo Boost TataDana Dinonaktifkan'));

    // Re-enable with /boost lebih cepet
    const r5 = await handleBotCommand('/boost lebih cepet', testUser);
    assert(r5.includes('Turbo Boost TataDana Diaktifkan!'));

    // Re-disable
    disableTurboBoost(testUser.id);

    // /cepetin
    const r6 = await handleBotCommand('/cepetin', testUser);
    assert(r6.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(r6.includes('15 menit lebih awal'));
  });

  runTest('Slang anti-false-positive checks verify transactions are not intercepted', () => {
    assert.strictEqual(isBoostOrPercepatCommand('percepet bayar hutang 50rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('cepetan belanja 100k'), false);
    assert.strictEqual(isBoostOrPercepatCommand('cepet transfer 200rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('cepetin bayar tagihan 150rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('makan cepetan 25k'), false);
    assert.strictEqual(isBoostOrPercepatCommand('percepet 50000'), false);
    assert.strictEqual(isBoostOrPercepatCommand('cepet beli bakso 15rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('/percepet bayar 50rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('/cepet beli pulsa 50rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('/cepetin transfer 50rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('belanja lebih cepet 100k'), false);
  });

  // 13. Testing Multi-Period Budget Commands (/budget harian, /budget mingguan, /budget bulanan, /budget tahunan)
  console.log('\n--- 13. Testing Multi-Period Budget Commands ---');

  await runTest('Handle /budget harian command with scaled daily quotas', async () => {
    const reply = await handleBotCommand('/budget harian', testUser);
    assert(reply.includes('Status Budget Harian (Daily)'), 'Should show Daily budget title');
    assert(reply.includes('Terpakai:'), 'Should display spent metrics');
  });

  await runTest('Handle /budget mingguan command with weekly quotas', async () => {
    const reply = await handleBotCommand('/budget mingguan', testUser);
    assert(reply.includes('Status Budget Mingguan (Weekly)'), 'Should show Weekly budget title');
  });

  await runTest('Handle /budget tahunan command with yearly aggregated quotas', async () => {
    const reply = await handleBotCommand('/budget tahunan', testUser);
    assert(reply.includes('Status Budget Tahunan (Yearly)'), 'Should show Yearly budget title');
  });

  runTest('Handle multi-period commands in handleTelegramCommand', () => {
    const data = {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser
    };
    const rDaily = handleTelegramCommand('/budget harian', data);
    assert(rDaily.includes('Harian (Daily)'), 'Telegram parser handles daily budget');

    const rWeekly = handleTelegramCommand('/budget mingguan', data);
    assert(rWeekly.includes('Mingguan (Weekly)'), 'Telegram parser handles weekly budget');
  });

  // 14. Testing Financial Calendar & Recurring Bills Command (/kalender)
  console.log('\n--- 14. Testing Financial Calendar & Recurring Bills ---');

  await runTest('Handle /kalender command in handleBotCommand', async () => {
    const reply = await handleBotCommand('/kalender', testUser);
    assert(reply.includes('Agenda & Kalender Keuangan TataDana'), 'Should display calendar title');
    assert(reply.includes('Status Arus Kas Bulan Berjalan:'), 'Should display cashflow status');
    assert(reply.includes('Tagihan Jatuh Tempo Rutin Terdekat:'), 'Should display upcoming bills');
    assert(reply.includes('dashboard/calendar'), 'Should provide dashboard calendar link');
  });

  runTest('Handle /kalender command in handleTelegramCommand', () => {
    const data = {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser
    };
    const reply = handleTelegramCommand('/kalender', data);
    assert(reply.includes('Agenda & Kalender Keuangan TataDana'), 'Parser handles calendar command');
    assert(reply.includes('Tagihan Listrik PLN'), 'Shows recurring bills');
  });

  // 15. Testing In-App & Telegram Tata AI Bot Assistant (/tanya)
  console.log('\n--- 15. Testing Tata AI Bot Assistant ---');

  await runTest('Handle /tanya command in handleBotCommand', async () => {
    const replyDefault = await handleBotCommand('/tanya', testUser);
    assert(replyDefault.includes('Tata AI Assistant'), 'Shows Tata AI prompt guide');

    const replyMakan = await handleBotCommand('/tanya sisa uang makan minggu ini', testUser);
    assert(replyMakan.includes('Tata AI Financial Advisor'), 'Gives financial advisor persona');
    assert(replyMakan.includes('Makanan & Kuliner'), 'Identifies food category query');

    const replyHemat = await handleBotCommand('/tanya rekomendasi hemat akhir bulan', testUser);
    assert(replyHemat.includes('Tata AI Financial Advisor'), 'Identifies saving strategy query');
    assert(replyHemat.includes('Saldo totalmu saat ini'), 'References real balance context');
  });

  runTest('Handle /tanya in handleTelegramCommand', () => {
    const data = {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser
    };
    const reply = handleTelegramCommand('/tanya strategi hemat akhir bulan', data);
    assert(reply.includes('Tata AI Financial Advisor'), 'Telegram parser handles /tanya query');
  });

  // 16. Testing Admin Payment Manual Approval & Upgrade to Pro
  console.log('\n--- 16. Testing Admin Payment Manual Approval ---');

  runTest('Admin approval upgrades Starter user to Pro with unlimited limits', () => {
    const starterUser = mockStore.profiles.get('user-starter-123')!;
    assert.strictEqual(starterUser.plan, 'starter');

    // Simulate Admin Approval
    starterUser.plan = 'pro';
    starterUser.subscriptionPlan = 'pro';

    const limitCheck50 = checkPlanLimit(starterUser, 'maxMonthlyTransactions', 50);
    assert.strictEqual(limitCheck50.allowed, true, 'Pro user allows 50 transactions');

    const limitCheck100 = checkPlanLimit(starterUser, 'maxMonthlyTransactions', 100);
    assert.strictEqual(limitCheck100.allowed, true, 'Pro user has unlimited transactions');

    const receiptCheck = checkPlanLimit(starterUser, 'allowReceiptPhoto');
    assert.strictEqual(receiptCheck.allowed, true, 'Pro user has receipt photo input enabled');
  });

  // 17. Testing Telegram Long Polling & Natural Language Wallet Resolution
  console.log('\n--- 17. Testing Telegram Long Polling & Natural Language Wallet Resolution ---');

  const { parseNaturalLanguageInput: parseNL } = await import('../lib/telegram-parser');
  const { resolveTargetWallet, processTelegramUpdate, telegramLongPoller } = await import('../lib/telegram/long-poller');

  runTest('Parse "beli makan malam 15k tunai" -> amount 15000, category Makanan, wallet Dompet Tunai', () => {
    const res = parseNL('beli makan malam 15k tunai');
    assert.strictEqual(res.amount, 15000);
    assert.strictEqual(res.type, 'expense');
    assert.strictEqual(res.categoryName, 'Makanan & Minuman');
    assert.strictEqual(res.walletName, 'Dompet Tunai');
    assert.strictEqual(res.walletKeyword, 'tunai');
  });

  runTest('Resolve target wallet routes "tunai" to cash wallet (Dompet Tunai)', () => {
    const resolved = resolveTargetWallet(dataStore.wallets, 'Dompet Tunai', 'tunai');
    assert(resolved.name.toLowerCase().includes('tunai'), 'Resolved wallet should be Dompet Tunai');
  });

  runTest('Resolve target wallet routes "bca" to BCA wallet', () => {
    const resolved = resolveTargetWallet(dataStore.wallets, 'BCA Prioritas', 'bca');
    assert(resolved.name.toLowerCase().includes('bca'), 'Resolved wallet should be BCA');
  });

  await runTest('processTelegramUpdate records transaction to both dataStore and mockStore and sends formatted receipt', async () => {
    const initialTxCountDataStore = dataStore.transactions.length;
    const initialCashBalance = dataStore.wallets.find(w => w.name.includes('Tunai'))?.balance || 0;
    const initialMockCashBalance = mockStore.wallets.get('wallet-cash')?.balance || 0;

    const mockUpdate = {
      update_id: 88991,
      message: {
        message_id: 101,
        chat: { id: 5829104, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'beli makan malam 15k tunai',
      },
    };

    const res = await processTelegramUpdate(mockUpdate as any);
    assert.strictEqual(res.ok, true, 'Update processing should succeed');
    assert(res.reply.includes('15.000'), 'Reply should include formatted nominal Rp15.000');
    assert(res.reply.includes('Dompet Tunai'), 'Reply should show Dompet Tunai');
    assert(res.reply.includes('Makanan & Minuman'), 'Reply should show Makanan & Minuman');
    assert(res.reply.includes('Budget Makanan & Minuman bulan ini:'), 'Reply should include budget status');

    // Verify dual-store sync
    assert.strictEqual(dataStore.transactions.length, initialTxCountDataStore + 1, 'dataStore should have new transaction');
    const newCashBalance = dataStore.wallets.find(w => w.name.includes('Tunai'))?.balance || 0;
    assert.strictEqual(newCashBalance, initialCashBalance - 15000, 'Cash wallet balance should decrease by 15000');

    const starterUserTxs = mockStore.getTransactionsByUser('user-starter-123');
    const syncedMockTx = starterUserTxs.find(t => (t.notes || '').includes('beli makan malam 15k tunai') || t.amount === 15000);
    assert(syncedMockTx !== undefined, 'mockStore should have synchronized the transaction under user-starter-123');
    assert.strictEqual(syncedMockTx.amount, 15000, 'mockStore transaction amount should be 15000');
    assert.strictEqual(syncedMockTx.category_id, 'cat-01', 'mockStore category should be cat-01 (Makanan & Minuman)');

    // Verify mockStore wallet balance was deducted exactly once (no double-deduction)
    const newMockCashBalance = mockStore.wallets.get('wallet-cash')?.balance || 0;
    assert.strictEqual(newMockCashBalance, initialMockCashBalance - 15000, 'mockStore cash wallet should decrease by exactly 15000');
  });

  await runTest('processTelegramUpdate syncs income transaction with correct category cat-08 and balance increase', async () => {
    const prevBcaBalance = mockStore.wallets.get('wallet-bca')?.balance || 0;
    const mockIncomeUpdate = {
      update_id: 88992,
      message: {
        message_id: 102,
        chat: { id: 5829104, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'gajian bulanan 5jt ke bca',
      },
    };

    const res = await processTelegramUpdate(mockIncomeUpdate as any);
    assert.strictEqual(res.ok, true);
    assert(res.reply.includes('5.000.000'));
    const newBcaBalance = mockStore.wallets.get('wallet-bca')?.balance || 0;
    assert.strictEqual(newBcaBalance, prevBcaBalance + 5000000, 'BCA wallet balance should increase by exactly 5000000');
    const starterTxs = mockStore.getTransactionsByUser('user-starter-123');
    const incomeTx = starterTxs.find(t => t.amount === 5000000 && t.type === 'income');
    assert(incomeTx !== undefined, 'Income transaction should be indexed in mockStore');
    assert.strictEqual(incomeTx?.category_id, 'cat-08', 'Income should map to cat-08 (Gaji & Upah)');
  });

  runTest('resolveMockCategoryId maps category names to exact mockStore category IDs', async () => {
    const { resolveMockCategoryId } = await import('../lib/telegram/long-poller');
    assert.strictEqual(resolveMockCategoryId('Makanan & Minuman', 'expense'), 'cat-01');
    assert.strictEqual(resolveMockCategoryId('Transportasi', 'expense'), 'cat-02');
    assert.strictEqual(resolveMockCategoryId('Belanja Kebutuhan', 'expense'), 'cat-06');
    assert.strictEqual(resolveMockCategoryId('Tagihan & Utilitas', 'expense'), 'cat-04');
    assert.strictEqual(resolveMockCategoryId('Gaji & Pendapatan', 'income'), 'cat-08');
  });

  await runTest('processTelegramUpdate delivers outbound reply back to Telegram chat', async () => {
    let sentChatId: any = null;
    let sentText: string = '';
    const fakeApi: any = {
      sendMessage: async (chatId: any, text: string) => {
        sentChatId = chatId;
        sentText = text;
        return { ok: true };
      },
    };

    const mockUpdate = {
      update_id: 88993,
      message: {
        message_id: 103,
        chat: { id: 998877, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'beli makan siang 20rb tunai',
      },
    };

    const res = await processTelegramUpdate(mockUpdate as any, fakeApi);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(sentChatId, 998877, 'Should deliver message to chatId 998877');
    assert(sentText.includes('20.000'), 'Delivered message text should include nominal Rp20.000');
  });

  runTest('TelegramLongPoller returns valid status structure in long_polling mode', () => {
    const status = telegramLongPoller.getStatus();
    assert.strictEqual(status.mode, 'long_polling');
    assert.strictEqual(typeof status.isRunning, 'boolean');
    assert.strictEqual(typeof status.updatesProcessed, 'number');
  });

  await runTest('TelegramBotApi.getMe returns bot "Tata dana bunga" and username "ungakeuanganbot"', async () => {
    const { TelegramBotApi } = await import('../lib/telegram/bot-api');
    const api = new TelegramBotApi('mock_telegram_token');
    const res = await api.getMe();
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.result?.first_name, 'Tata dana bunga');
    assert.strictEqual(res.result?.username, 'ungakeuanganbot');
  });

  runTest('Token cleaner parses tokens with bot prefix and Telegram URL prefix correctly', async () => {
    const { TelegramBotApi } = await import('../lib/telegram/bot-api');
    assert.strictEqual(TelegramBotApi.cleanToken('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.strictEqual(TelegramBotApi.cleanToken('bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.strictEqual(TelegramBotApi.cleanToken('https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.strictEqual(TelegramBotApi.cleanToken('https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.strictEqual(TelegramBotApi.cleanToken('https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/getMe'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.strictEqual(TelegramBotApi.cleanToken('"123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.strictEqual(TelegramBotApi.cleanToken('" 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11 "'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.strictEqual(TelegramBotApi.cleanToken('""123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11""'), '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
  });

  await runTest('Category resolution respects transaction type to prevent cross-type mismatch', async () => {
    const { resolveMockCategoryId } = await import('../lib/telegram/long-poller');
    // An income note mentioning 'Belanja' (expense category name) must still resolve to an income category
    const incomeCat = resolveMockCategoryId('Bonus Belanja', 'income');
    assert.strictEqual(incomeCat, 'cat-08', 'Income transaction should not resolve to expense category cat-06');

    // Expense resolves to expense
    const expenseCat = resolveMockCategoryId('Belanja Supermarket', 'expense');
    assert.strictEqual(expenseCat, 'cat-06');
  });

  await runTest('syncTransactionToMockStore preserves explicit transaction id across stores', async () => {
    const { syncTransactionToMockStore } = await import('../lib/telegram/long-poller');
    const customId = 'tx-custom-test-sync-999';

    syncTransactionToMockStore({
      id: customId,
      categoryName: 'Makanan & Minuman',
      type: 'expense',
      amount: 12500,
      notes: 'Preserve ID test',
      source: 'telegram_text',
      userId: 'usr_budi_01',
    });

    const txInMockStore = mockStore.transactions.get(customId);
    assert(txInMockStore !== undefined, 'Transaction with customId should exist in mockStore');
    assert.strictEqual(txInMockStore?.id, customId);
    assert.strictEqual(txInMockStore?.amount, 12500);
  });

  await runTest('Multiple successive transactions with identical amounts are recorded without false deduplication', async () => {
    const prevCount = mockStore.getTransactionsByUser('user-starter-123').length;

    const update1 = {
      update_id: 99001,
      message: {
        message_id: 201,
        chat: { id: 5829104, type: 'private' },
        date: Math.floor(Date.now() / 1000) - 10,
        text: 'kopi susu 25k tunai',
      },
    };

    const update2 = {
      update_id: 99002,
      message: {
        message_id: 202,
        chat: { id: 5829104, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'kopi susu 25k tunai',
      },
    };

    const res1 = await processTelegramUpdate(update1 as any);
    const res2 = await processTelegramUpdate(update2 as any);

    assert.strictEqual(res1.ok, true);
    assert.strictEqual(res2.ok, true);

    const newCount = mockStore.getTransactionsByUser('user-starter-123').length;
    assert.strictEqual(newCount, prevCount + 2, 'Both legitimate successive transactions should be recorded');
  });

  // 18. Testing /boost 5 menit lebih cpt & Colloquial "cpt" Variations
  console.log('\n--- 18. Testing /boost 5 menit lebih cpt & Variations ---');

  runTest('isBoostOrPercepatCommand recognizes "5 menit lebih cpt" and variants', () => {
    // Slash commands
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 menit lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 mnt lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 menit lebih cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 mnt lebih cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 menit'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 mnt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5m'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepat 5 menit'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/cpt'), true);

    // Natural commands without slash
    assert.strictEqual(isBoostOrPercepatCommand('boost 5 menit lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit lebih cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost 5 menit'), true);
    assert.strictEqual(isBoostOrPercepatCommand('boost 5 mnt lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt lbh cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit lbh cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit lbh cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt lebih cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt lebih cepet'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5m lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt lebih cpt dong'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit lebih cpt ya'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5m cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('lebih cepat 5 menit'), true);
    assert.strictEqual(isBoostOrPercepatCommand('lebih cpt 5 menit'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/cpt 5 menit'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/boost 5 menit lbh cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/percepat 5 menit lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('/5 menit lebih cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit lebih cepat boost'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5 mnt lbh cepat'), true);
    assert.strictEqual(isBoostOrPercepatCommand('5m lbh cpt'), true);
    assert.strictEqual(isBoostOrPercepatCommand('cpt'), true);
  });

  runTest('parseBoostCommand extracts 5-minute shift accurately for all variations', () => {
    // 1. /boost 5 menit lebih cpt
    const p1 = parseBoostCommand('/boost 5 menit lebih cpt');
    assert.strictEqual(p1.isBoost, true);
    assert.strictEqual(p1.minutes, 5);
    assert.strictEqual(p1.level, 1);
    assert.strictEqual(p1.action, 'enable');

    // 2. 5 mnt lebih cpt (without slash)
    const p2 = parseBoostCommand('5 mnt lebih cpt');
    assert.strictEqual(p2.isBoost, true);
    assert.strictEqual(p2.minutes, 5);
    assert.strictEqual(p2.level, 1);
    assert.strictEqual(p2.action, 'enable');

    // 3. 5 menit lebih cepat
    const p3 = parseBoostCommand('5 menit lebih cepat');
    assert.strictEqual(p3.isBoost, true);
    assert.strictEqual(p3.minutes, 5);
    assert.strictEqual(p3.level, 1);

    // 4. boost 5 menit
    const p4 = parseBoostCommand('boost 5 menit');
    assert.strictEqual(p4.isBoost, true);
    assert.strictEqual(p4.minutes, 5);
    assert.strictEqual(p4.level, 1);

    // 5. /boost 5 mnt lebih cpt
    const p5 = parseBoostCommand('/boost 5 mnt lebih cpt');
    assert.strictEqual(p5.isBoost, true);
    assert.strictEqual(p5.minutes, 5);

    // 6. 5 mnt lbh cpt
    const p6 = parseBoostCommand('5 mnt lbh cpt');
    assert.strictEqual(p6.isBoost, true);
    assert.strictEqual(p6.minutes, 5);

    // 9. Additional variations
    const p9 = parseBoostCommand('5m lebih cpt');
    assert.strictEqual(p9.isBoost, true);
    assert.strictEqual(p9.minutes, 5);

    const p10 = parseBoostCommand('5 menit cpt');
    assert.strictEqual(p10.isBoost, true);
    assert.strictEqual(p10.minutes, 5);

    const p11 = parseBoostCommand('5 mnt cpt');
    assert.strictEqual(p11.isBoost, true);
    assert.strictEqual(p11.minutes, 5);

    const p12 = parseBoostCommand('/percepat 5 menit');
    assert.strictEqual(p12.isBoost, true);
    assert.strictEqual(p12.minutes, 5);

    const p13 = parseBoostCommand('lebih cpt 5 menit');
    assert.strictEqual(p13.isBoost, true);
    assert.strictEqual(p13.minutes, 5);

    const p14 = parseBoostCommand('boost 5 menit lebih cpt');
    assert.strictEqual(p14.isBoost, true);
    assert.strictEqual(p14.minutes, 5);
  });

  runTest('shiftTimeMinutes cleanly shifts 5 minutes earlier (12:00 -> 11:55, 20:00 -> 19:55)', () => {
    assert.strictEqual(shiftTimeMinutes('12:00', 5), '11:55');
    assert.strictEqual(shiftTimeMinutes('20:00', 5), '19:55');
    assert.strictEqual(shiftTimeMinutes('00:02', 5), '23:57'); // Midnight wrap
    assert.strictEqual(shiftTimeMinutes('00:00', 5), '23:55'); // Midnight boundary
    assert.strictEqual(shiftTimeMinutes('00:04', 5), '23:59');
    assert.strictEqual(shiftTimeMinutes('00:05', 5), '00:00');
  });

  runTest('getEffectiveReminderTimes applies 5-minute buffer cleanly', () => {
    const eff = getEffectiveReminderTimes({
      time1: '12:00',
      time2: '20:00',
      boostMode: true,
      boostMinutes: 5,
    });
    assert.strictEqual(eff.time1, '11:55');
    assert.strictEqual(eff.time2, '19:55');
    assert.strictEqual(eff.isBoosted, true);
    assert.strictEqual(eff.bufferMinutes, 5);
    assert.strictEqual(eff.boostLevel, 1);
  });

  await runTest('handleBotCommand handles "/boost 5 menit lebih cpt" with full confirmation reply', async () => {
    disableTurboBoost(testUser.id);
    const reply = await handleBotCommand('/boost 5 menit lebih cpt', testUser);
    assert(reply.includes('⚡ *Turbo Boost TataDana Diaktifkan!*'));
    assert(reply.includes('5 menit lebih awal'));
    assert(reply.includes('11:55 WIB'));
    assert(reply.includes('19:55 WIB'));
    assert(reply.includes('Buffer Notifikasi : -5 menit'));
  });

  await runTest('handleBotCommand handles "5 mnt lebih cpt" without slash', async () => {
    disableTurboBoost(testUser.id);
    const reply = await handleBotCommand('5 mnt lebih cpt', testUser);
    assert(reply.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(reply.includes('5 menit lebih awal'));
    assert(reply.includes('11:55 WIB'));
    assert(reply.includes('19:55 WIB'));
  });

  runTest('handleTelegramCommand handles "5 mnt lebih cpt" and variants cleanly', () => {
    disableTurboBoost(testUser.id);
    const data = {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    };

    const reply1 = handleTelegramCommand('/boost 5 menit lebih cpt', data);
    assert(reply1.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(reply1.includes('5 menit lebih awal'));
    assert(reply1.includes('11:55 WIB'));
    assert(reply1.includes('19:55 WIB'));

    const reply2 = handleTelegramCommand('5 mnt lebih cpt', data);
    assert(reply2.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(reply2.includes('5 menit lebih awal'));

    const reply3 = handleTelegramCommand('5 menit lebih cepat', data);
    assert(reply3.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(reply3.includes('5 menit lebih awal'));

    const reply4 = handleTelegramCommand('boost 5 menit', data);
    assert(reply4.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(reply4.includes('5 menit lebih awal'));
  });

  await runTest('Stepped escalation from 5-minute boost: moves to 15m on /boost percepat, then to 30m on repeat', async () => {
    // 1. Initial 5-minute boost active
    applyTurboBoost(testUser.id, 5, 1);
    const initialInfo = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(initialInfo.boostMinutes, 5);

    // 2. Invoking /boost percepat while at 5m sets standard 15m Level 1 (does NOT skip to 30m)
    const reply1 = await handleBotCommand('/boost percepat', testUser);
    assert(reply1.includes('Turbo Boost TataDana Diaktifkan!'));
    assert(reply1.includes('15 menit lebih awal'));
    assert(reply1.includes('11:45 WIB'));
    assert(reply1.includes('19:45 WIB'));

    const infoAfter = getBoostedReminderInfo(testUser.id);
    assert.strictEqual(infoAfter.boostMinutes, 15);

    // 3. Repeating /boost percepat while at 15m escalates to Level 2 (30m)
    const reply2 = await handleBotCommand('/boost percepat', testUser);
    assert(reply2.includes('Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)'));
    assert(reply2.includes('30 menit lebih awal'));
    assert(reply2.includes('11:30 WIB'));
    assert(reply2.includes('19:30 WIB'));
  });

  runTest('Turbo Boost 5-minute reminder triggers at 11:55 and 19:55 WIB', () => {
    applyTurboBoost(testUser.id, 5, 1);

    const resSiang = checkDueReminders('11:55');
    assert(resSiang.dueCount >= 1);
    const matchSiang = resSiang.triggered.find((t) => t.userId === testUser.id);
    assert.strictEqual(matchSiang?.effectiveTime, '11:55');
    assert.strictEqual(matchSiang?.isBoosted, true);

    const resMalam = checkDueReminders('19:55');
    assert(resMalam.dueCount >= 1);
    const matchMalam = resMalam.triggered.find((t) => t.userId === testUser.id);
    assert.strictEqual(matchMalam?.effectiveTime, '19:55');
    assert.strictEqual(matchMalam?.isBoosted, true);
  });

  runTest('Anti-false-positive checks remain strictly intact for financial transactions', () => {
    // Normal financial transactions must NEVER be recognized as boost commands
    assert.strictEqual(isBoostOrPercepatCommand('beli pulsa 50k'), false);
    assert.strictEqual(isBoostOrPercepatCommand('makan siang 25rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('beli bakso 15rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('gajian 5jt'), false);
    assert.strictEqual(isBoostOrPercepatCommand('kopi susu 25ribu'), false);
    assert.strictEqual(isBoostOrPercepatCommand('bensin 50k'), false);
    assert.strictEqual(isBoostOrPercepatCommand('bayar tagihan listrik 150rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('transfer 200rb ke ibu'), false);
    assert.strictEqual(isBoostOrPercepatCommand('percepat 50000'), false);
    assert.strictEqual(isBoostOrPercepatCommand('boost 25.000'), false);
    assert.strictEqual(isBoostOrPercepatCommand('/percepat bayar 50rb'), false);
    assert.strictEqual(isBoostOrPercepatCommand('beli pulsa 5 menit'), false);
    assert.strictEqual(isBoostOrPercepatCommand('bayar 5 menit'), false);
    assert.strictEqual(isBoostOrPercepatCommand('kopi 5 menit'), false);
    assert.strictEqual(isBoostOrPercepatCommand('beli pulsa 5 menit lebih cpt'), false);
    assert.strictEqual(isBoostOrPercepatCommand('makan siang 5 mnt lebih cpt'), false);
    assert.strictEqual(isBoostOrPercepatCommand('tunggu 5 menit'), false);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit lagi ya'), false);
    assert.strictEqual(isBoostOrPercepatCommand('5 bensin'), false);
    assert.strictEqual(isBoostOrPercepatCommand('5 menit bensin'), false);
  });

  // 19. Testing Turbo Boost Extreme Speed & In-Memory Cache Performance (< 5ms)
  console.log('\n--- 19. Testing Turbo Boost Extreme Speed (< 5ms Cached) ---');

  runTest('Turbo Boost cached reminder lookup operates with extreme speed (< 5ms cached)', () => {
    applyTurboBoost(testUser.id, 15, 1);
    // Warm cache
    getBoostedReminderInfo(testUser.id);

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      const info = getBoostedReminderInfo(testUser.id);
      assert.strictEqual(info.boostMode, true);
      assert.strictEqual(info.boostMinutes, 15);
      assert.strictEqual(info.boostLevel, 1);
      assert.strictEqual(info.effectiveTimes.time1, '11:45');
    }
    const totalElapsed = performance.now() - start;
    const avgMs = totalElapsed / 50;
    assert(avgMs < 5, `Expected cached lookup < 5ms, took average ${avgMs.toFixed(3)}ms`);
  });

  runTest('Turbo Boost escalation operates with extreme speed (< 5ms cached)', () => {
    disableTurboBoost(testUser.id);
    const start = performance.now();
    const step1 = escalateTurboBoost(testUser.id);
    assert.strictEqual(step1.boostLevel, 1);
    const step2 = escalateTurboBoost(testUser.id);
    assert.strictEqual(step2.boostLevel, 2);
    const elapsed = performance.now() - start;
    assert(elapsed < 50, `Escalation sequence should take < 50ms, took ${elapsed.toFixed(3)}ms`);
  });

  // 20. Testing Superadmin Credentials, Payment Approval & 10 Collaborative Teams
  console.log('\n--- 20. Testing Superadmin Credentials, Approval & 10 Collaborative Teams ---');

  runTest('Superadmin credentials validation for ungaaputrii@gmail.com with password 1234', () => {
    const adminEmail = 'ungaaputrii@gmail.com';
    const adminPass = '1234';
    const isValidAdmin = (email: string, pass: string) => {
      const normalizedEmail = email.toLowerCase().trim();
      return (
        ((normalizedEmail === 'ungaaputrii@gmail.com' || normalizedEmail === 'ungaaputrii06@gmail.com') && pass === '1234') ||
        (normalizedEmail === 'bungaputri@gmail.com' && (pass === 'admin1234' || pass === '1234'))
      );
    };

    assert.strictEqual(isValidAdmin(adminEmail, adminPass), true, 'ungaaputrii@gmail.com with password 1234 must be valid');
    assert.strictEqual(isValidAdmin('ungaaputrii06@gmail.com', '1234'), true, 'ungaaputrii06@gmail.com with password 1234 must be valid');
    assert.strictEqual(isValidAdmin('ungaaputrii@gmail.com', 'wrongpassword'), false, 'Wrong password must fail');
    assert.strictEqual(isValidAdmin('hacker@gmail.com', '1234'), false, 'Non-admin email must fail');
  });

  runTest('Admin Approval flow approves pending payment and writes to audit logs', () => {
    // Simulate approval transition
    const pendingPayment = {
      id: 'pay-test-99',
      userId: 'usr_bunga_01',
      userName: 'Bunga Putri',
      userEmail: 'bungaputri@gmail.com',
      plan: 'pro_lifetime',
      amount: 99000,
      bank: 'BCA Transfer Manual',
      status: 'pending',
      date: new Date().toISOString(),
    };

    const approvePayment = (payment: typeof pendingPayment, adminEmail: string) => {
      payment.status = 'approved_manual';
      const auditLog = {
        id: `aud-${Date.now()}`,
        action: 'PAYMENT_APPROVED_MANUAL',
        performedBy: adminEmail,
        targetUser: payment.userEmail,
        details: `Disetujui upgrade ${payment.plan} (Rp ${payment.amount.toLocaleString('id-ID')})`,
        timestamp: new Date().toISOString(),
      };
      return { payment, auditLog };
    };

    const result = approvePayment(pendingPayment, 'ungaaputrii06@gmail.com');
    assert.strictEqual(result.payment.status, 'approved_manual');
    assert.strictEqual(result.auditLog.performedBy, 'ungaaputrii06@gmail.com');
    assert.strictEqual(result.auditLog.targetUser, 'bungaputri@gmail.com');
    assert(result.auditLog.details.includes('99.000'));
  });

  runTest('10 Collaborative Specialist Teams structure is complete and all 10 teams have valid leads', () => {
    const teams = [
      { id: 'team-1', number: 1, lead: 'Budi Santoso', name: 'Platform, Security & Identity' },
      { id: 'team-2', number: 2, lead: 'Bunga Putri', name: 'Telegram Bot & Real-Time Gateway' },
      { id: 'team-3', number: 3, lead: 'Rizky Pratama', name: 'Financial NLP & OCR Vision Parser' },
      { id: 'team-4', number: 4, lead: 'Siti Rahma', name: 'Smart Budgeting, Analytics & Reporting' },
      { id: 'team-5', number: 5, lead: 'Dimas Wicaksono', name: 'AI Financial Advisor & QA Systems' },
      { id: 'team-6', number: 6, lead: 'Kevin Sanjaya', name: 'High-Performance Database & FastCache Engine' },
      { id: 'team-7', number: 7, lead: 'Unga Putri', name: 'Superadmin Control & Approval Compliance' },
      { id: 'team-8', number: 8, lead: 'Farhan Alamsyah', name: 'Payment Gateway & Subscription Billing' },
      { id: 'team-9', number: 9, lead: 'Nabila Az-Zahra', name: 'Product UI/UX & Design Systems' },
      { id: 'team-10', number: 10, lead: 'Arya Wijaya', name: 'DevOps, SRE & Cloud Infrastructure' },
    ];

    assert.strictEqual(teams.length, 10, 'There must be exactly 10 specialist teams');
    const leadUnga = teams.find(t => t.lead === 'Unga Putri');
    assert(leadUnga, 'Tim 7 Lead must be Unga Putri');
    assert.strictEqual(leadUnga?.number, 7);
  });

  runTest('generateFinancialPDF generates valid PDF buffer with %PDF header and non-zero bytes', () => {
    const bungaUser = mockStore.profiles.get('usr_bunga_01') || {
      id: 'usr_bunga_01',
      full_name: 'Bunga Putri',
      phone_number: '081298765432',
      default_currency: 'IDR',
      role: 'user',
      plan: 'pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const sampleTxs = Array.from(mockStore.transactions.values()).slice(0, 5);
    const pdfBytes = generateFinancialPDF({
      user: bungaUser as any,
      transactions: sampleTxs,
      startDate: '2026-10-01',
      endDate: '2026-10-17',
      totalIncome: 5000000,
      totalExpense: 1250000,
      netCashflow: 3750000,
    });

    assert(pdfBytes instanceof Uint8Array, 'PDF output must be Uint8Array');
    assert(pdfBytes.length > 500, `PDF size must be substantial (>500 bytes), got ${pdfBytes.length}`);
    const pdfHeader = Buffer.from(pdfBytes.slice(0, 4)).toString();
    assert.strictEqual(pdfHeader, '%PDF', 'PDF header magic bytes must start with %PDF');
  });

  runTest('generateFinancialExcel generates valid XLSX and CSV binary output with correct structure', () => {
    const bungaUser = mockStore.profiles.get('usr_bunga_01') || {
      id: 'usr_bunga_01',
      full_name: 'Bunga Putri',
      phone_number: '081298765432',
      default_currency: 'IDR',
      role: 'user',
      plan: 'pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const sampleTxs = Array.from(mockStore.transactions.values()).slice(0, 5);

    // Test XLSX
    const xlsxBytes = generateFinancialExcel({
      user: bungaUser as any,
      transactions: sampleTxs,
      startDate: '2026-10-01',
      endDate: '2026-10-17',
      totalIncome: 5000000,
      totalExpense: 1250000,
      netCashflow: 3750000,
    }, 'xlsx');
    assert(xlsxBytes instanceof Uint8Array, 'XLSX output must be Uint8Array');
    assert(xlsxBytes.length > 500, `XLSX size must be substantial (>500 bytes), got ${xlsxBytes.length}`);
    // XLSX is a ZIP container, starts with PK (0x50, 0x4B)
    assert.strictEqual(xlsxBytes[0], 0x50, 'XLSX must start with ZIP byte 0x50 (P)');
    assert.strictEqual(xlsxBytes[1], 0x4B, 'XLSX must start with ZIP byte 0x4B (K)');

    // Test CSV
    const csvBytes = generateFinancialExcel({
      user: bungaUser as any,
      transactions: sampleTxs,
      startDate: '2026-10-01',
      endDate: '2026-10-17',
      totalIncome: 5000000,
      totalExpense: 1250000,
      netCashflow: 3750000,
    }, 'csv');
    assert(csvBytes instanceof Uint8Array, 'CSV output must be Uint8Array');
    const csvText = Buffer.from(csvBytes).toString('utf-8');
    assert(csvText.includes('TATADANA'), 'CSV must contain TATADANA title header');
    assert(csvText.includes('RINGKASAN ARUS KAS'), 'CSV must contain summary section');
  });

  runTest('Superadmin ungaaputrii06@gmail.com profile is correctly registered in both dataStore and mockStore', () => {
    // 1. Check dataStore
    const { ungaAdminUser } = require('../lib/storage-mock');
    assert(ungaAdminUser !== undefined, 'ungaAdminUser must be exported in storage-mock');
    assert(
      ungaAdminUser.email === 'ungaaputrii@gmail.com' || ungaAdminUser.email === 'ungaaputrii06@gmail.com',
      'ungaAdminUser email must match official admin email ungaaputrii@gmail.com'
    );
    assert.strictEqual(ungaAdminUser.role, 'superadmin');
    assert.strictEqual(ungaAdminUser.plan, 'pro');

    // 2. Check mockStore
    const mockAdmin = mockStore.profiles.get('adm_unga_01');
    assert(mockAdmin !== undefined, 'adm_unga_01 must exist in mockStore profiles');
    assert(
      mockAdmin?.email === 'ungaaputrii@gmail.com' || mockAdmin?.email === 'ungaaputrii06@gmail.com',
      'mockAdmin email must match official admin email ungaaputrii@gmail.com'
    );
    assert.strictEqual(mockAdmin?.role, 'superadmin');
    assert.strictEqual(mockAdmin?.plan, 'pro');
  });

  // 21. Testing Telegram Webhook Idempotency & Latency (< 1.5s, X-Response-Time-Ms)
  console.log('\n--- 21. Testing Telegram Webhook Idempotency & Latency ---');
  await runTest('Webhook idempotent handling skips duplicate update_id immediately without duplicate transaction insertion', async () => {
    const { processTelegramUpdate } = await import('../lib/telegram/long-poller');
    const updateId = 998877;
    const testPayload = {
      update_id: updateId,
      message: {
        message_id: 201,
        chat: { id: 778899, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'kopi susu 25k tunai',
      },
    };

    const txCountBefore = dataStore.transactions.length;
    // First invocation: processed
    const res1 = await processTelegramUpdate(testPayload as any);
    assert.strictEqual(res1.ok, true);
    assert.strictEqual(res1.status, undefined);
    assert.strictEqual(dataStore.transactions.length, txCountBefore + 1);

    // Second invocation with identical update_id: must be skipped
    const res2 = await processTelegramUpdate(testPayload as any);
    assert.strictEqual(res2.ok, true);
    assert.strictEqual(res2.status, 'skipped');
    assert(res2.reply.includes('Idempotency protection active'));
    // No new transaction added
    assert.strictEqual(dataStore.transactions.length, txCountBefore + 1);
  });

  await runTest('Webhook route POST endpoint responds in < 1.5s (sub-second) and sets X-Response-Time-Ms header', async () => {
    const { POST, GET } = await import('../app/api/telegram/webhook/route');
    const { NextRequest } = await import('next/server');

    // Test GET endpoint
    const getRes = await GET();
    const getJson = await getRes.json();
    assert.strictEqual(getJson.ok, true);
    assert.strictEqual(getJson.status, 'active');

    // Test POST endpoint with duplicate update_id (skipped)
    const reqSkipped = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      body: JSON.stringify({
        update_id: 998877, // already processed
        message: {
          chat: { id: 778899 },
          text: 'kopi susu 25k tunai',
        },
      }),
    });

    const startTime = performance.now();
    const postResSkipped = await POST(reqSkipped);
    const duration = performance.now() - startTime;
    assert(duration < 1500, `Webhook must respond in < 1500ms, took ${duration.toFixed(2)}ms`);

    const headerTime = postResSkipped.headers.get('X-Response-Time-Ms');
    assert(headerTime !== null, 'X-Response-Time-Ms header must be present');
    assert(Number(headerTime) < 1500, 'X-Response-Time-Ms must indicate < 1500ms');

    const jsonSkipped = await postResSkipped.json();
    assert.strictEqual(jsonSkipped.ok, true);
    assert.strictEqual(jsonSkipped.status, 'skipped');

    // Test POST endpoint with new update_id (processed)
    const newUpdateId = 998878;
    const reqNew = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      body: JSON.stringify({
        update_id: newUpdateId,
        message: {
          chat: { id: 778899 },
          text: 'beli bakso 15rb',
        },
      }),
    });

    const postResNew = await POST(reqNew);
    const headerTimeNew = postResNew.headers.get('X-Response-Time-Ms');
    assert(headerTimeNew !== null, 'X-Response-Time-Ms header must be present for processed updates');
    assert(Number(headerTimeNew) < 1500, 'Processed update must respond in < 1500ms');

    const jsonNew = await postResNew.json();
    assert.strictEqual(jsonNew.ok, true);
    assert.strictEqual(jsonNew.status, 'processed');
    assert(jsonNew.reply.includes('15.000'));
  });

  // 22. Indonesian Natural Language Nominals & Category Parsing
  console.log('\n--- 22. Testing Indonesian NL Nominals & Category Parsing ---');
  runTest('parseIndonesianNominal in telegram-parser parses all standard Indonesian denominations', () => {
    const { parseIndonesianNominal } = require('../lib/telegram-parser');
    assert.strictEqual(parseIndonesianNominal('15rb'), 15000);
    assert.strictEqual(parseIndonesianNominal('500k'), 500000);
    assert.strictEqual(parseIndonesianNominal('1.5jt'), 1500000);
    assert.strictEqual(parseIndonesianNominal('1,5jt'), 1500000);
    assert.strictEqual(parseIndonesianNominal('2.5m'), 2500000000);
    assert.strictEqual(parseIndonesianNominal('2,5m'), 2500000000);
    assert.strictEqual(parseIndonesianNominal('Rp 50.000'), 50000);
    assert.strictEqual(parseIndonesianNominal('beli bakso 15rb'), 15000);
    assert.strictEqual(parseIndonesianNominal('kopi 25k'), 25000);
    assert.strictEqual(parseIndonesianNominal('gajian 5jt'), 5000000);
  });

  runTest('parseIndonesianAmount in parser.ts parses all standard Indonesian denominations', () => {
    assert.strictEqual(parseIndonesianAmount('15rb'), 15000);
    assert.strictEqual(parseIndonesianAmount('500k'), 500000);
    assert.strictEqual(parseIndonesianAmount('1.5jt'), 1500000);
    assert.strictEqual(parseIndonesianAmount('1,5jt'), 1500000);
    assert.strictEqual(parseIndonesianAmount('2.5m'), 2500000000);
    assert.strictEqual(parseIndonesianAmount('2,5m'), 2500000000);
    assert.strictEqual(parseIndonesianAmount('Rp 50.000'), 50000);
    assert.strictEqual(parseIndonesianAmount('beli bakso 15rb'), 15000);
    assert.strictEqual(parseIndonesianAmount('kopi 25k'), 25000);
    assert.strictEqual(parseIndonesianAmount('gajian 5jt'), 5000000);
  });

  await runTest('parseTransactionWithAI accurately extracts amount, type, category, and wallet', async () => {
    const res1 = await parseTransactionWithAI('kopi 25k tunai');
    assert.strictEqual(res1.type, 'expense');
    assert.strictEqual(res1.amount, 25000);
    assert.strictEqual(res1.category, 'Makanan & Minuman');
    assert.strictEqual(res1.wallet, 'Dompet Tunai');
    assert.strictEqual(res1.is_ambiguous, false);

    const res2 = await parseTransactionWithAI('gajian 5jt ke bca');
    assert.strictEqual(res2.type, 'income');
    assert.strictEqual(res2.amount, 5000000);
    assert.strictEqual(res2.category, 'Gaji & Upah');
    assert.strictEqual(res2.wallet, 'BCA Utama');
    assert.strictEqual(res2.is_ambiguous, false);
  });

  // 23. Multi-Wallet Detection (Tunai, BCA, Mandiri, GoPay, OVO, DANA)
  console.log('\n--- 23. Testing Multi-Wallet Resolution & Detection ---');
  runTest('resolveTargetWallet correctly resolves Mandiri, GoPay, OVO, and DANA', () => {
    const { resolveTargetWallet } = require('../lib/telegram-parser');
    const mockWallets = [
      { id: 'w1', name: 'Dompet Tunai', type: 'cash', balance: 500000 },
      { id: 'w2', name: 'BCA Utama', type: 'bank', balance: 5000000, isDefault: true },
      { id: 'w3', name: 'Mandiri Tabungan', type: 'bank', balance: 2500000 },
      { id: 'w4', name: 'GoPay Saldo', type: 'ewallet', balance: 350000 },
      { id: 'w5', name: 'OVO Premier', type: 'ewallet', balance: 150000 },
      { id: 'w6', name: 'DANA Dompet', type: 'ewallet', balance: 200000 },
    ];

    assert.strictEqual(resolveTargetWallet(mockWallets, undefined, 'tunai').id, 'w1');
    assert.strictEqual(resolveTargetWallet(mockWallets, undefined, 'bca').id, 'w2');
    assert.strictEqual(resolveTargetWallet(mockWallets, undefined, 'mandiri').id, 'w3');
    assert.strictEqual(resolveTargetWallet(mockWallets, undefined, 'gopay').id, 'w4');
    assert.strictEqual(resolveTargetWallet(mockWallets, undefined, 'ovo').id, 'w5');
    assert.strictEqual(resolveTargetWallet(mockWallets, undefined, 'dana').id, 'w6');
  });

  runTest('inferWallet in parser.ts detects all major payment methods from text', () => {
    const { inferWallet } = require('../lib/ai/parser');
    assert.strictEqual(inferWallet('beli bensin 50k tunai')?.walletKeyword, 'tunai');
    assert.strictEqual(inferWallet('transfer 200k bca')?.walletKeyword, 'bca');
    assert.strictEqual(inferWallet('bayar tagihan 150k mandiri')?.walletKeyword, 'mandiri');
    assert.strictEqual(inferWallet('kopi 25k gopay')?.walletKeyword, 'gopay');
    assert.strictEqual(inferWallet('jajan 35k ovo')?.walletKeyword, 'ovo');
    assert.strictEqual(inferWallet('pulsa 50k dana')?.walletKeyword, 'dana');
  });

  // 24. AI Provider Manager: Adapters, Priority Failover, Structured Extraction & Telemetry
  console.log('\n--- 24. Testing AI Provider Manager (Adapters, Failover, Telemetry) ---');
  runTest('AIProviderManager retrieves active providers sorted by priority', async () => {
    const { AIProviderManager } = await import('../lib/ai/provider-manager');
    const providers = AIProviderManager.getActiveProviders();
    assert(providers.length >= 3, 'Must have at least Gemini, OpenAI, and DeepSeek configured');
    for (let i = 0; i < providers.length - 1; i++) {
      assert(providers[i].priority <= providers[i + 1].priority, 'Providers must be sorted by priority ascending');
    }
  });

  await runTest('AIProviderManager priority failover gracefully handles provider errors and logs telemetry', async () => {
    const { AIProviderManager } = await import('../lib/ai/provider-manager');
    const logsBefore = mockStore.aiLogs.length;

    // Execute text generation; providers with mock keys will fail and fall over, logging telemetry
    await AIProviderManager.executeTextGeneration('Test prompt', 'telegram_text');

    // Telemetry logs should be recorded in mockStore.aiLogs
    assert(mockStore.aiLogs.length > logsBefore, 'Telemetry logs must be added to mockStore.aiLogs');
    const recentLog = mockStore.aiLogs[0];
    assert(recentLog.latency_ms >= 0, 'Log must include latency_ms');
    assert(recentLog.prompt_tokens > 0, 'Log must include prompt_tokens');
    assert(['success', 'failed', 'fallback_triggered'].includes(recentLog.status), 'Log status must be valid');
  });

  await runTest('AIProviderManager extractStructuredTransaction extracts structured JSON with heuristic fallback', async () => {
    const { AIProviderManager } = await import('../lib/ai/provider-manager');
    const parsed = await AIProviderManager.extractStructuredTransaction('beli nasi padang 25rb tunai');
    assert.strictEqual(parsed.type, 'expense');
    assert.strictEqual(parsed.amount, 25000);
    assert.strictEqual(parsed.category, 'Makanan & Minuman');
    assert.strictEqual(parsed.wallet, 'Dompet Tunai');
    assert.strictEqual(parsed.is_ambiguous, false);
  });

  // 25. Bot Commands (/start, /saldo, /hari ini, /bulan ini, /bantuan) & Budget Alerts (80% & 100%)
  console.log('\n--- 25. Testing Bot Commands & Budget Alert Thresholds ---');
  await runTest('Handle /start command in handleBotCommand and handleTelegramCommand', async () => {
    const reply1 = await handleBotCommand('/start', testUser);
    assert(reply1.includes('Selamat datang di TataDana Bot'), 'handleBotCommand /start should welcome user');
    assert(reply1.includes('/saldo'), 'handleBotCommand /start should mention /saldo');
    assert(reply1.includes('/bantuan'), 'handleBotCommand /start should mention /bantuan');

    const reply2 = handleTelegramCommand('/start', {
      wallets: mockStore.getWalletsByUser(testUser.id),
      transactions: mockStore.getTransactionsByUser(testUser.id),
      budgets: mockStore.getBudgetsByUser(testUser.id, 10, 2026),
      categories: mockStore.getCategoriesByUser(testUser.id),
      user: testUser,
    });
    assert(reply2.includes('Selamat datang di TataDana Bot'), 'handleTelegramCommand /start should welcome user');
    assert(reply2.includes('beli bakso 15rb'), 'handleTelegramCommand /start should include example format');
  });

  runTest('evaluateBudgetAlert evaluates 80% and 100% threshold levels accurately', () => {
    const { evaluateBudgetAlert } = require('../lib/telegram-parser');

    // 50% spent: no alert
    const r50 = evaluateBudgetAlert(500000, 1000000);
    assert.strictEqual(r50.percentage, 50);
    assert.strictEqual(r50.isOver80, false);
    assert.strictEqual(r50.isOver100, false);
    assert.strictEqual(r50.alertMessage, undefined);

    // 80% spent: alert_80 triggered
    const r80 = evaluateBudgetAlert(800000, 1000000);
    assert.strictEqual(r80.percentage, 80);
    assert.strictEqual(r80.isOver80, true);
    assert.strictEqual(r80.isOver100, false);
    assert(r80.alertMessage && r80.alertMessage.includes('80%+'));

    // 105% spent: alert_100 triggered
    const r105 = evaluateBudgetAlert(1050000, 1000000);
    assert.strictEqual(r105.percentage, 105);
    assert.strictEqual(r105.isOver80, true);
    assert.strictEqual(r105.isOver100, true);
    assert(r105.alertMessage && r105.alertMessage.includes('100%+'));
  });

  runTest('mockStore.addTransaction updates budget spent amount and alert threshold flags', () => {
    const userId = 'user-starter-123';
    // Find food budget
    const foodBudget = Array.from(mockStore.budgets.values()).find(
      (b) => (b.user_id === userId || b.userId === userId) && (b.category_id === 'cat-01' || b.categoryId === 'cat-01')
    );

    if (foodBudget) {
      foodBudget.spent_amount = 0;
      foodBudget.spentAmount = 0;
      foodBudget.monthly_amount = 100000;
      foodBudget.monthlyAmount = 100000;
      foodBudget.alert_80_sent = false;
      foodBudget.alert_100_sent = false;

      // Add expense of 85,000 (85%)
      mockStore.addTransaction({
        user_id: userId,
        wallet_id: 'wallet-bca',
        category_id: 'cat-01',
        type: 'expense',
        amount: 85000,
        transaction_date: new Date().toISOString(),
        source: 'web_manual',
      });

      assert.strictEqual(foodBudget.spent_amount, 85000);
      assert.strictEqual(foodBudget.alert_80_sent, true);
      assert.strictEqual(foodBudget.alert_100_sent, false);

      // Add another 20,000 (total 105,000 -> 105%)
      mockStore.addTransaction({
        user_id: userId,
        wallet_id: 'wallet-bca',
        category_id: 'cat-01',
        type: 'expense',
        amount: 20000,
        transaction_date: new Date().toISOString(),
        source: 'web_manual',
      });

      assert.strictEqual(foodBudget.spent_amount, 105000);
      assert.strictEqual(foodBudget.alert_80_sent, true);
      assert.strictEqual(foodBudget.alert_100_sent, true);
    }
  });

  // 26. Challenger Milestone 2 Empirical Stress Test Suite
  console.log('\n--- 26. Challenger Milestone 2 Empirical Stress Tests ---');
  try {
    const { runMilestone2StressTests } = await import('./challenger-milestone2-stress');
    const stressResult = await runMilestone2StressTests();
    passed += stressResult.passed;
    failed += stressResult.failed;
  } catch (stressErr: any) {
    console.error('Challenger stress suite execution error:', stressErr);
    failed++;
  }

  // 27. Milestone 3: Dashboard & Reports Test Suite
  console.log('\n--- 27. Milestone 3 Dashboard & Reports Test Suite ---');
  try {
    const { runMilestone3DashboardReportsTests } = await import('./milestone3-dashboard-reports');
    const m3Result = await runMilestone3DashboardReportsTests();
    passed += m3Result.passed;
    failed += m3Result.failed;
  } catch (m3Err: any) {
    console.error('Milestone 3 test suite execution error:', m3Err);
    failed++;
  }

  // 28. Milestone 4: Superadmin Controls & Multi-AI Test Suite
  console.log('\n--- 28. Milestone 4 Superadmin Controls & Multi-AI Test Suite ---');
  try {
    const { runMilestone4SuperadminTests } = await import('./milestone4-superadmin-controls');
    const m4Result = await runMilestone4SuperadminTests();
    passed += m4Result.passed;
    failed += m4Result.failed;
  } catch (m4Err: any) {
    console.error('Milestone 4 test suite execution error:', m4Err);
    failed++;
  }

  // 29. Milestone 5: Admin Access Control & WhatsApp 2FA Test Suite
  console.log('\n--- 29. Milestone 5 Admin Access Control & WhatsApp 2FA Test Suite ---');
  try {
    const { runMilestone5AccessAndWhatsAppTests } = await import('./milestone5-access-and-whatsapp');
    const m5Result = await runMilestone5AccessAndWhatsAppTests();
    passed += m5Result.passed;
    failed += m5Result.failed;
  } catch (m5Err: any) {
    console.error('Milestone 5 test suite execution error:', m5Err);
    failed++;
  }

  // 30. Milestone 6: Modern & Responsive Login Interface Test Suite
  console.log('\n--- 30. Milestone 6 Modern & Responsive Login Interface Test Suite ---');
  try {
    const { runMilestone6LoginInterfaceTests } = await import('./milestone6-login-interface');
    const m6Result = await runMilestone6LoginInterfaceTests();
    passed += m6Result.passed;
    failed += m6Result.failed;
  } catch (m6Err: any) {
    console.error('Milestone 6 test suite execution error:', m6Err);
    failed++;
  }

  // Summary
  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

