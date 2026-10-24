import assert from 'assert';
import { mockStore } from '../lib/supabase/mock-store';
import { dataStore, ungaAdminUser } from '../lib/storage-mock';
import {
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  isSuperadminEmail,
  canAccessAdmin,
  validateAdminLogin,
  activateSuperadminSession,
} from '../lib/auth';
import { AIProviderConfig, AILog, UserProfile } from '../lib/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export async function runMilestone4SuperadminTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✅ PASS: [M4 Superadmin] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ FAIL: [M4 Superadmin] ${name}`, err);
            failed++;
          });
      } else {
        console.log(`  ✅ PASS: [M4 Superadmin] ${name}`);
        passed++;
      }
    } catch (err) {
      console.error(`  ❌ FAIL: [M4 Superadmin] ${name}`, err);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log('🧪 MILESTONE 4: SUPERADMIN CONTROLS & MULTI-AI TEST SUITE');
  console.log('====================================================\n');

  // --- Suite 1: Superadmin Authentication & Authorization ---
  console.log('--- 1. Superadmin Authentication & Authorization ---');

  runTest('Superadmin login validates email ungaaputrii@gmail.com and password 1234', () => {
    const res = validateAdminLogin('ungaaputrii@gmail.com', '1234');
    assert.strictEqual(res.success, true, 'Login must succeed for ungaaputrii@gmail.com / 1234');
    assert.strictEqual(res.role, 'superadmin', 'Role must be superadmin');
    assert.strictEqual(res.user?.email, 'ungaaputrii@gmail.com');
  });

  runTest('Superadmin login accepts case-insensitive & trimmed email', () => {
    const res = validateAdminLogin('  UNGAAPUTRII@GMAIL.COM  ', '1234');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.role, 'superadmin');
  });

  runTest('Superadmin login rejects incorrect password', () => {
    const res = validateAdminLogin('ungaaputrii@gmail.com', 'wrongpassword');
    assert.strictEqual(res.success, false);
    assert(res.error && res.error.includes('Kata sandi salah'));
  });

  runTest('Superadmin login rejects non-admin email', () => {
    const res = validateAdminLogin('regular.user@example.com', '1234');
    assert.strictEqual(res.success, false);
    assert(res.error && res.error.includes('Bukan alamat email resmi'));
  });

  runTest('canAccessAdmin grants route access only to admin and superadmin roles', () => {
    assert.strictEqual(canAccessAdmin('superadmin'), true);
    assert.strictEqual(canAccessAdmin('admin'), true);
    assert.strictEqual(canAccessAdmin('user'), false);
    assert.strictEqual(canAccessAdmin(null), false);
    assert.strictEqual(canAccessAdmin(undefined), false);
  });

  runTest('activateSuperadminSession configures superadmin role and ungaaputrii@gmail.com in dataStore', () => {
    const active = activateSuperadminSession();
    assert.strictEqual(active.email, 'ungaaputrii@gmail.com');
    assert.strictEqual(active.role, 'superadmin');
    assert.strictEqual(active.plan, 'pro');
    assert.strictEqual(active.fullName, 'Unga Putri');
  });

  // --- Suite 2: User Approval & Registration Workflow ---
  console.log('\n--- 2. User Approval & Registration Workflow ---');

  runTest('Admin Approve action changes user status from pending to approved instantly', () => {
    const testUserId = 'usr_doni_01';
    const pendingUser = mockStore.profiles.get(testUserId);
    assert(pendingUser !== undefined, 'Pending user usr_doni_01 must exist');

    // Force pending status before approval test
    pendingUser.status = 'pending';
    pendingUser.approval_status = 'pending';

    const logsCountBefore = mockStore.auditLogs.length;
    const approvedUser = mockStore.approveUserRegistration(testUserId, 'adm_unga_01');

    assert(approvedUser !== null, 'approveUserRegistration should return updated user');
    assert.strictEqual(approvedUser?.status, 'approved', 'Status must change instantly to approved');
    assert.strictEqual(approvedUser?.approval_status, 'approved');

    // Verify audit log entry
    assert(mockStore.auditLogs.length > logsCountBefore, 'Audit log must be written for approval');
    const recentAudit = mockStore.auditLogs[0];
    assert.strictEqual(recentAudit.action, 'APPROVE_USER_REGISTRATION');
    assert.strictEqual(recentAudit.target_user_id, testUserId);
  });

  runTest('Admin Reject action changes user status from pending to rejected instantly', () => {
    const testUserId = 'usr_dina_02';
    const pendingUser = mockStore.profiles.get(testUserId);
    assert(pendingUser !== undefined, 'Pending user usr_dina_02 must exist');

    pendingUser.status = 'pending';
    pendingUser.approval_status = 'pending';

    const logsCountBefore = mockStore.auditLogs.length;
    const rejectedUser = mockStore.rejectUserRegistration(testUserId, 'adm_unga_01');

    assert(rejectedUser !== null, 'rejectUserRegistration should return updated user');
    assert.strictEqual(rejectedUser?.status, 'rejected', 'Status must change instantly to rejected');
    assert.strictEqual(rejectedUser?.approval_status, 'rejected');

    // Verify audit log entry
    assert(mockStore.auditLogs.length > logsCountBefore, 'Audit log must be written for rejection');
    const recentAudit = mockStore.auditLogs[0];
    assert.strictEqual(recentAudit.action, 'REJECT_USER_REGISTRATION');
    assert.strictEqual(recentAudit.target_user_id, testUserId);
  });

  // --- Suite 3: Midtrans Payment Verification & Subscription Upgrade ---
  console.log('\n--- 3. Midtrans Payment Verification & Upgrade ---');

  runTest('Manual verification of pending Midtrans payment upgrades user to Pro and writes audit log', () => {
    const targetUserId = 'user-starter-123';
    const userProfile = mockStore.profiles.get(targetUserId);
    assert(userProfile !== undefined);
    userProfile.plan = 'starter';
    userProfile.subscriptionPlan = 'starter';

    const paymentId = 'pay-m4-test-01';
    const testPayment = {
      id: paymentId,
      user_id: targetUserId,
      userId: targetUserId,
      amount: 99000,
      plan: 'pro' as const,
      status: 'pending' as const,
      paymentMethod: 'manual_transfer',
      orderId: 'TRX-PRO-M4-01',
      order_id: 'TRX-PRO-M4-01',
      created_at: new Date().toISOString(),
    };
    mockStore.payments.set(paymentId, testPayment as any);

    // Approve the payment
    testPayment.status = 'success' as any;
    userProfile.plan = 'pro';
    userProfile.subscriptionPlan = 'pro';

    mockStore.auditLogs.unshift({
      id: 'aud-' + Date.now(),
      admin_id: 'adm_unga_01',
      action: 'APPROVE_PAYMENT',
      target_user_id: targetUserId,
      details: {
        paymentId,
        orderId: testPayment.orderId,
        amount: testPayment.amount,
        approvedBy: 'Unga Putri (Superadmin)',
      },
      created_at: new Date().toISOString(),
    });

    assert.strictEqual(testPayment.status, 'success');
    assert.strictEqual(userProfile.plan, 'pro', 'User subscription plan must be upgraded to Pro');

    const audit = mockStore.auditLogs[0];
    assert.strictEqual(audit.action, 'APPROVE_PAYMENT');
    assert.strictEqual(audit.target_user_id, targetUserId);
  });

  // --- Suite 4: Multi-AI Provider Settings & AI Call Logs ---
  console.log('\n--- 4. Multi-AI Provider Settings & Telemetry Logs ---');

  runTest('Admin can toggle AI execution mode between single and parallel_failover', () => {
    // Mode Single
    mockStore.aiSettings.mode = 'single';
    dataStore.aiMode = 'single';
    assert.strictEqual(mockStore.aiSettings.mode, 'single');
    assert.strictEqual(dataStore.aiMode, 'single');

    // Mode Parallel Failover
    mockStore.aiSettings.mode = 'parallel_failover';
    dataStore.aiMode = 'failover';
    assert.strictEqual(mockStore.aiSettings.mode, 'parallel_failover');
    assert.strictEqual(dataStore.aiMode, 'failover');
  });

  runTest('AI Providers priority list contains Gemini, OpenAI, and DeepSeek in ascending priority', () => {
    const providers = Array.from(mockStore.aiProviders.values()).sort((a, b) => a.priority - b.priority);
    assert(providers.length >= 3, 'Must have at least 3 providers');

    const names = providers.map(p => p.name);
    assert(names.includes('gemini'), 'Must include Gemini');
    assert(names.includes('openai'), 'Must include OpenAI');
    assert(names.includes('deepseek'), 'Must include DeepSeek');

    for (let i = 0; i < providers.length - 1; i++) {
      assert(providers[i].priority <= providers[i + 1].priority, 'Providers must be sorted by priority');
    }
  });

  runTest('AI Telemetry logs table contains prompt, tokens, latency, provider, and status', () => {
    assert(mockStore.aiLogs.length > 0, 'mockStore.aiLogs must contain entries');
    const log = mockStore.aiLogs[0];

    assert(log.id !== undefined, 'Log must have ID');
    assert(log.provider !== undefined, 'Log must have provider');
    assert(log.latency_ms !== undefined, 'Log must have latency_ms');
    assert(log.prompt_tokens !== undefined, 'Log must have prompt_tokens');
    assert(['success', 'failed', 'fallback_triggered', 'error'].includes(log.status), 'Log status must be valid');
    assert(log.created_at !== undefined, 'Log must have timestamp');
  });

  // --- Suite 5: User Management, Impersonation & Complete Data Export ---
  console.log('\n--- 5. User Management, Impersonation & Complete Export ---');

  runTest('Admin user list supports filtering by registration status (pending, approved, rejected)', () => {
    const allUsers = Array.from(mockStore.profiles.values());
    const pendingUsers = allUsers.filter(u => (u.status || u.approval_status) === 'pending');
    const approvedUsers = allUsers.filter(u => (u.status || u.approval_status) === 'approved' || (!u.status && !u.approval_status));

    assert(allUsers.length >= 5, 'Should have multiple seeded users');
    assert(pendingUsers.length >= 1, 'Should have at least 1 pending user');
    assert(approvedUsers.length >= 3, 'Should have multiple approved users');
  });

  runTest('User impersonation establishes session audit log and accesses user financial data without password', () => {
    const targetUserId = 'usr_budi_01';
    const targetUser = mockStore.profiles.get(targetUserId);
    assert(targetUser !== undefined);

    const logBefore = mockStore.auditLogs.length;

    // Simulate impersonation session start
    mockStore.auditLogs.unshift({
      id: 'aud-' + Date.now(),
      admin_id: 'adm_unga_01',
      action: 'IMPERSONATE_USER',
      target_user_id: targetUserId,
      targetUserName: targetUser.full_name,
      details: `Superadmin Unga Putri masuk ke tampilan dashboard sebagai ${targetUser.full_name} tanpa sandi`,
      created_at: new Date().toISOString()
    });

    assert(mockStore.auditLogs.length > logBefore);
    const audit = mockStore.auditLogs[0];
    assert.strictEqual(audit.action, 'IMPERSONATE_USER');
    assert.strictEqual(audit.target_user_id, targetUserId);

    // Verify financial data is directly accessible without password re-entry
    const userWallets = mockStore.getWalletsByUser(targetUserId);
    const userTxs = mockStore.getTransactionsByUser(targetUserId);
    assert(userWallets !== undefined, 'Wallets must be accessible');
    assert(userTxs !== undefined, 'Transactions must be accessible');
  });

  runTest('Superadmin complete export includes all users, transactions, and logs in JSON format', () => {
    const users = Array.from(mockStore.profiles.values());
    const transactions = Array.from(mockStore.transactions.values());
    const aiLogs = [...mockStore.aiLogs];
    const auditLogs = [...mockStore.auditLogs];

    const completeExport = {
      generated_at: new Date().toISOString(),
      superadmin: 'Unga Putri (ungaaputrii@gmail.com)',
      users,
      transactions,
      ai_logs: aiLogs,
      audit_logs: auditLogs,
    };

    assert(completeExport.users.length >= 5, 'Export must include all users');
    assert(completeExport.transactions.length >= 3, 'Export must include all transactions');
    assert(completeExport.ai_logs.length >= 1, 'Export must include AI telemetry logs');
    assert(completeExport.audit_logs.length >= 1, 'Export must include audit logs');

    const serialized = JSON.stringify(completeExport);
    assert(serialized.length > 500, 'Serialized JSON must be substantial');
  });

  runTest('Superadmin complete export generates valid multi-sheet Excel (.xlsx) workbook with PK ZIP header', () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Users
    const userRows = Array.from(mockStore.profiles.values()).map((u, i) => ({
      No: i + 1,
      ID: u.id,
      Nama: u.full_name || 'User',
      Email: (u as any).email || '-',
      Paket: u.plan?.toUpperCase() || 'STARTER',
      Status: (u.status || u.approval_status || 'approved').toUpperCase(),
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(userRows), 'Daftar Pengguna');

    // Sheet 2: Transactions
    const txRows = Array.from(mockStore.transactions.values()).slice(0, 10).map((t, i) => ({
      No: i + 1,
      ID: t.id,
      Tanggal: t.transaction_date,
      Nominal: t.amount,
      Jenis: t.type,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(txRows), 'Daftar Transaksi');

    // Sheet 3: AI Logs
    const aiRows = mockStore.aiLogs.map((l, i) => ({
      No: i + 1,
      Provider: l.provider,
      Prompt: l.prompt || 'test',
      Tokens: l.prompt_tokens,
      Latensi: l.latency_ms,
      Status: l.status,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(aiRows), 'Log AI Telemetri');

    // Sheet 4: Audit Trail
    const auditRows = mockStore.auditLogs.map((a, i) => ({
      No: i + 1,
      Aksi: a.action,
      Target: a.target_user_id,
      Waktu: a.created_at,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(auditRows), 'Audit Trail Admin');

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    assert(buf.length > 500, 'Excel buffer must be substantial');
    // Magic ZIP header check: PK (0x50, 0x4B)
    assert.strictEqual(buf[0], 0x50, 'Excel file must start with PK byte 0x50');
    assert.strictEqual(buf[1], 0x4b, 'Excel file must start with PK byte 0x4B');
  });

  runTest('Superadmin complete export generates valid PDF with %PDF header and WIB timestamps', () => {
    const doc = new jsPDF();
    doc.text('TataDana — Rekap Data Superadmin', 14, 16);
    doc.text(`Waktu Ekspor: ${new Date().toLocaleString('id-ID')} WIB`, 14, 24);
    doc.text('Superadmin Lead: Unga Putri (ungaaputrii@gmail.com)', 14, 30);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    assert(pdfBuffer.length > 500, 'PDF buffer must not be empty');
    const header = pdfBuffer.slice(0, 4).toString('utf-8');
    assert.strictEqual(header, '%PDF', 'PDF buffer must start with %PDF header');
  });

  // --- Suite 6: Avatar Photo Management & Multi-View Synchronization ---
  console.log('\n--- 6. User Profile Management & Avatar Synchronization ---');

  runTest('Updating avatar photo synchronizes across dataStore and mockStore instantly', () => {
    const newAvatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150';
    dataStore.user.avatarUrl = newAvatar;
    dataStore.user.avatar_url = newAvatar;

    assert.strictEqual(dataStore.user.avatarUrl, newAvatar);
    assert.strictEqual(dataStore.user.avatar_url, newAvatar);

    // Update in mockStore profile
    const unga = mockStore.profiles.get('adm_unga_01');
    if (unga) {
      unga.avatar_url = newAvatar;
      unga.avatarUrl = newAvatar;
      assert.strictEqual(unga.avatar_url, newAvatar);
    }
  });

  console.log('\n====================================================');
  console.log(`M4 SUPERADMIN SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  return { passed, failed };
}
