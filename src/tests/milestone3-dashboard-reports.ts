import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { dataStore } from '../lib/storage-mock';
import { mockStore } from '../lib/supabase/mock-store';
import { parseIndonesianNominal, parseIndonesianMessage, formatRupiah } from '../lib/telegram-parser';
import { generateFinancialPDF, generateTransactionPDF } from '../lib/reports/pdf-generator';
import { generateFinancialExcel, generateTransactionExcel } from '../lib/reports/excel-generator';
import { formatWIBDate, formatWIBDateTime } from '../lib/utils/date';
import { Transaction } from '../lib/types';

export async function runMilestone3DashboardReportsTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
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

  console.log('\n====================================================');
  console.log('🧪 MILESTONE 3: DASHBOARD & REPORTS TEST SUITE');
  console.log('====================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Strict Dark Mode Theme & Zero Residual Orange Verification
  // ---------------------------------------------------------------------------
  console.log('--- 1. Theme Compliance & Zero Residual Orange ---');

  await test('Zero residual orange #FF6B00 in entire src directory', () => {
    const srcDir = path.resolve(__dirname, '..');
    const filesToScan: string[] = [];

    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (/\.(tsx?|jsx?|css|json)$/.test(entry.name)) {
          filesToScan.push(fullPath);
        }
      }
    }

    walkDir(srcDir);
    assert(filesToScan.length > 20, 'Should find scanned source files');

    const violations: { file: string; line: number }[] = [];
    for (const file of filesToScan) {
      // Exclude this test file itself from the literal scan
      if (file.includes('milestone3-dashboard-reports.ts')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (content.toLowerCase().includes('#ff6b00') || content.toLowerCase().includes('ff6b00')) {
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.toLowerCase().includes('ff6b00')) {
            violations.push({ file: path.relative(srcDir, file), line: idx + 1 });
          }
        });
      }
    }

    assert.strictEqual(
      violations.length,
      0,
      `Found residual orange #FF6B00 in: ${JSON.stringify(violations)}`
    );
  });

  await test('Obsidian Slate and Electric Blue color tokens present in globals.css', () => {
    const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
    const content = fs.readFileSync(globalsCssPath, 'utf-8');
    assert(content.includes('#090D16'), 'Obsidian Black/Slate #090D16 should be defined');
    assert(content.includes('#2563EB') || content.includes('2563eb'), 'Electric Blue #2563EB should be defined');
    assert(content.includes('#00D2FF') || content.includes('00d2ff'), 'Cyan Accent #00D2FF should be defined');
  });

  // ---------------------------------------------------------------------------
  // 2. Multi-Wallet Verification (BCA, Mandiri, GoPay, OVO, Dompet Tunai)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Multi-Wallet Support (5 Wallets) & Balances ---');

  await test('dataStore contains all 5 required wallets', () => {
    const walletNames = dataStore.wallets.map((w) => w.name.toLowerCase());
    assert(walletNames.some((n) => n.includes('bca')), 'BCA wallet must exist');
    assert(walletNames.some((n) => n.includes('mandiri')), 'Mandiri wallet must exist');
    assert(walletNames.some((n) => n.includes('gopay')), 'GoPay wallet must exist');
    assert(walletNames.some((n) => n.includes('ovo')), 'OVO wallet must exist');
    assert(walletNames.some((n) => n.includes('tunai') || n.includes('cash')), 'Dompet Tunai wallet must exist');
    assert.strictEqual(dataStore.wallets.length >= 5, true, 'At least 5 wallets must exist');
  });

  await test('mockStore contains all 5 required wallets for starterUser', () => {
    const starterWallets = mockStore.getWalletsByUser('user-starter-123');
    const names = starterWallets.map((w) => w.name.toLowerCase());
    assert(names.some((n) => n.includes('bca')), 'mockStore BCA must exist');
    assert(names.some((n) => n.includes('mandiri')), 'mockStore Mandiri must exist');
    assert(names.some((n) => n.includes('gopay')), 'mockStore GoPay must exist');
    assert(names.some((n) => n.includes('ovo')), 'mockStore OVO must exist');
    assert(names.some((n) => n.includes('tunai') || n.includes('cash')), 'mockStore Tunai must exist');
  });

  await test('Expense transaction deducts from specific wallet balance in real time', () => {
    const bca = dataStore.wallets.find((w) => w.id === 'w_bca')!;
    const initialBalance = bca.balance;
    const testAmount = 50000;

    dataStore.addTransaction({
      type: 'expense',
      amount: testAmount,
      wallet_id: bca.id,
      category_name: 'Makanan & Minuman Pokok',
      notes: 'Test expense BCA',
    });

    assert.strictEqual(bca.balance, initialBalance - testAmount, 'Wallet balance should decrease by expense amount');
  });

  await test('Income transaction adds to specific wallet balance in real time', () => {
    const mandiri = dataStore.wallets.find((w) => w.id === 'w_mandiri')!;
    const initialBalance = mandiri.balance;
    const testAmount = 150000;

    dataStore.addTransaction({
      type: 'income',
      amount: testAmount,
      wallet_id: mandiri.id,
      category_name: 'Gaji & Pendapatan',
      notes: 'Test income Mandiri',
    });

    assert.strictEqual(mandiri.balance, initialBalance + testAmount, 'Wallet balance should increase by income amount');
  });

  // ---------------------------------------------------------------------------
  // 3. Inter-Wallet Transfer Math & Conservation of Net Worth
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Inter-Wallet Transfer Math ---');

  await test('Inter-wallet transfer updates source and destination wallets and preserves net worth', () => {
    const sourceW = dataStore.wallets.find((w) => w.id === 'w_bca')!;
    const destW = dataStore.wallets.find((w) => w.id === 'w_ovo')!;

    const initialSourceBalance = sourceW.balance;
    const initialDestBalance = destW.balance;
    const initialTotalNetWorth = dataStore.wallets.reduce((sum, w) => sum + w.balance, 0);

    const transferAmount = 75000;

    const transferTx = dataStore.addTransaction({
      type: 'transfer',
      amount: transferAmount,
      wallet_id: sourceW.id,
      destinationWalletId: destW.id,
      to_wallet_id: destW.id,
      notes: 'Transfer BCA ke OVO',
    });

    assert.strictEqual(transferTx.type, 'transfer');
    assert.strictEqual(sourceW.balance, initialSourceBalance - transferAmount, 'Source wallet must be debited');
    assert.strictEqual(destW.balance, initialDestBalance + transferAmount, 'Destination wallet must be credited');

    const finalTotalNetWorth = dataStore.wallets.reduce((sum, w) => sum + w.balance, 0);
    assert.strictEqual(finalTotalNetWorth, initialTotalNetWorth, 'Total net worth across wallets must remain constant');
  });

  await test('mockStore inter-wallet transfer debits origin and credits destination', () => {
    const bca = mockStore.wallets.get('wallet-bca')!;
    const ovo = mockStore.wallets.get('wallet-ovo')!;

    const prevBca = bca.balance;
    const prevOvo = ovo.balance;
    const transferAmount = 120000;

    mockStore.addTransaction({
      user_id: 'user-starter-123',
      wallet_id: 'wallet-bca',
      to_wallet_id: 'wallet-ovo',
      type: 'transfer',
      amount: transferAmount,
      notes: 'Transfer mockStore BCA ke OVO',
      transaction_date: new Date().toISOString(),
      source: 'web_manual',
    });

    assert.strictEqual(bca.balance, prevBca - transferAmount);
    assert.strictEqual(ovo.balance, prevOvo + transferAmount);
  });

  // ---------------------------------------------------------------------------
  // 4. Multi-Period Budgets & Dynamic 80% / 100% Thresholds
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Multi-Period Budgets & 80% / 100% Threshold Alerts ---');

  await test('Dynamic budget threshold transitions (Safe -> 80% Warning -> 100% Alert)', () => {
    const testCatId = 'cat_budget_threshold_test';
    const monthlyLimit = 100000;

    // Register test budget in dataStore
    dataStore.budgets.push({
      id: 'b_threshold_test',
      userId: dataStore.user.id,
      categoryId: testCatId,
      monthlyAmount: monthlyLimit,
      spentAmount: 0,
      periodType: 'monthly',
      alert_80_sent: false,
      alert_100_sent: false,
    });

    const budget = dataStore.budgets.find((b) => b.categoryId === testCatId)!;

    // Step 1: Add 50,000 (50% -> Safe)
    dataStore.addTransaction({
      type: 'expense',
      amount: 50000,
      wallet_id: 'w_bca',
      categoryId: testCatId,
      notes: '50% spend',
    });
    assert.strictEqual(budget.spentAmount, 50000);
    assert.strictEqual(budget.alert_80_sent, false);
    assert.strictEqual(budget.alert_100_sent, false);

    // Step 2: Add 35,000 (total 85,000 = 85% -> 80% Warning triggered)
    dataStore.addTransaction({
      type: 'expense',
      amount: 35000,
      wallet_id: 'w_bca',
      categoryId: testCatId,
      notes: '85% spend',
    });
    assert.strictEqual(budget.spentAmount, 85000);
    assert.strictEqual(budget.alert_80_sent, true, '80% threshold flag must be set');
    assert.strictEqual(budget.alert_100_sent, false, '100% threshold flag must not be set yet');

    // Step 3: Add 20,000 (total 105,000 = 105% -> 100% Alert triggered)
    dataStore.addTransaction({
      type: 'expense',
      amount: 20000,
      wallet_id: 'w_bca',
      categoryId: testCatId,
      notes: '105% spend',
    });
    assert.strictEqual(budget.spentAmount, 105000);
    assert.strictEqual(budget.alert_80_sent, true);
    assert.strictEqual(budget.alert_100_sent, true, '100% threshold alert flag must be set');
  });

  // ---------------------------------------------------------------------------
  // 5. Native Reports: Real PDF & Excel Binary Generation with WIB Timestamps
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Native Reports (%PDF and PK Headers with WIB Timestamps) ---');

  await test('generateFinancialPDF produces genuine %PDF binary header with WIB timestamp', async () => {
    const userProfile = {
      id: 'usr_test_pdf',
      fullName: 'Bunga Putri Test',
      email: 'bunga@tatadana.id',
    };
    const sampleTxs: Transaction[] = [
      {
        id: 'tx_pdf_1',
        type: 'expense',
        amount: 45000,
        category_name: 'Makanan & Minuman Pokok',
        wallet_name: 'BCA Prioritas',
        transaction_date: '2026-10-15T14:30:00+07:00',
        notes: 'Makan siang ayam geprek',
      },
      {
        id: 'tx_pdf_2',
        type: 'income',
        amount: 5000000,
        category_name: 'Gaji & Pendapatan',
        wallet_name: 'Mandiri Tabungan',
        transaction_date: '2026-10-10T09:00:00+07:00',
        notes: 'Transfer bonus project',
      },
    ];

    const pdfBytes = await generateFinancialPDF(sampleTxs, userProfile, {
      periodLabel: 'Oktober 2026',
    });

    assert(pdfBytes instanceof Uint8Array, 'PDF output must be Uint8Array');
    assert(pdfBytes.length > 500, `PDF must contain binary data, got ${pdfBytes.length} bytes`);

    // Magic bytes check: %PDF (0x25, 0x50, 0x44, 0x46)
    const headerStr = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii');
    assert(headerStr.startsWith('%PDF'), `PDF header must start with %PDF, got ${headerStr}`);

    // Verify alias generateTransactionPDF
    const aliasBytes = await generateTransactionPDF(sampleTxs, userProfile, {
      periodLabel: 'Oktober 2026',
    });
    const aliasHeader = Buffer.from(aliasBytes.slice(0, 5)).toString('ascii');
    assert(aliasHeader.startsWith('%PDF'), `generateTransactionPDF header must start with %PDF`);
  });

  await test('generateFinancialExcel produces genuine PK ZIP header (valid XLSX)', async () => {
    const userProfile = {
      id: 'usr_test_excel',
      fullName: 'Bunga Putri Excel',
      email: 'bunga@tatadana.id',
    };
    const sampleTxs: Transaction[] = [
      {
        id: 'tx_xls_1',
        type: 'expense',
        amount: 35000,
        category_name: 'Transportasi',
        wallet_name: 'GoPay',
        transaction_date: '2026-10-16T18:00:00+07:00',
        notes: 'Gojek pulang kantor',
      },
    ];

    const excelBuffer = await generateFinancialExcel(sampleTxs, userProfile, {
      periodLabel: 'Oktober 2026',
    });

    assert(excelBuffer instanceof Uint8Array || Buffer.isBuffer(excelBuffer), 'Excel output must be binary');
    assert(excelBuffer.length > 1000, `Excel file must have binary size, got ${excelBuffer.length} bytes`);

    // Magic bytes for ZIP/XLSX: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    assert.strictEqual(excelBuffer[0], 0x50, 'Byte 0 must be P');
    assert.strictEqual(excelBuffer[1], 0x4b, 'Byte 1 must be K');
    assert.strictEqual(excelBuffer[2], 0x03, 'Byte 2 must be 0x03');
    assert.strictEqual(excelBuffer[3], 0x04, 'Byte 3 must be 0x04');

    // Verify alias generateTransactionExcel
    const aliasBuffer = await generateTransactionExcel(sampleTxs, userProfile, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    assert.strictEqual(aliasBuffer[0], 0x50);
    assert.strictEqual(aliasBuffer[1], 0x4b);
  });

  await test('WIB Date formatting utility produces valid Asia/Jakarta timestamps', () => {
    const isoString = '2026-10-15T10:30:00Z'; // 17:30 WIB
    const formatted = formatWIBDateTime(isoString);
    assert(formatted.includes('WIB'), `Timestamp must include WIB timezone indicator: ${formatted}`);
  });

  // ---------------------------------------------------------------------------
  // 6. Cashflow Calendar & Tata AI Drawer Quick Entry / Bot Sync
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Tata AI Drawer & Natural Language Parser ---');

  await test('parseIndonesianNominal parses various Indonesian shorthands', () => {
    assert.strictEqual(parseIndonesianNominal('15rb'), 15000);
    assert.strictEqual(parseIndonesianNominal('50k'), 50000);
    assert.strictEqual(parseIndonesianNominal('1.5jt'), 1500000);
    assert.strictEqual(parseIndonesianNominal('2,5jt'), 2500000);
    assert.strictEqual(parseIndonesianNominal('75000'), 75000);
  });

  await test('Natural language message parser correctly detects expense and income', () => {
    const expResult = parseIndonesianMessage('beli makan siang 25rb pakai gopay');
    assert(expResult !== null, 'Message should be parsed');
    assert.strictEqual(expResult.type, 'expense');
    assert.strictEqual(expResult.amount, 25000);

    const incResult = parseIndonesianMessage('gajian 5jt ke bca');
    assert(incResult !== null, 'Income message should be parsed');
    assert.strictEqual(incResult.type, 'income');
    assert.strictEqual(incResult.amount, 5000000);
  });

  await test('Tata AI Drawer transaction creation reflects immediately in dataStore', () => {
    const initialTxCount = dataStore.transactions.length;
    const bca = dataStore.wallets.find((w) => w.id === 'w_bca')!;
    const prevBcaBalance = bca.balance;

    const newTx = dataStore.addTransaction({
      type: 'expense',
      amount: 32000,
      wallet_id: bca.id,
      category_name: 'Kebutuhan Harian & Rumah',
      notes: 'Beli sabun dan pasta gigi via Tata AI Drawer',
      transaction_date: '2026-10-17T14:00:00+07:00',
      source: 'web_manual',
    });

    assert.strictEqual(dataStore.transactions.length, initialTxCount + 1, 'Transaction count must increment');
    assert.strictEqual(dataStore.transactions[0].id, newTx.id, 'New transaction must be prepended');
    assert.strictEqual(bca.balance, prevBcaBalance - 32000, 'Wallet balance must be updated immediately');
  });

  return { passed, failed };
}
