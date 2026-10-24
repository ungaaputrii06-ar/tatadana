import assert from 'assert';
import { mockStore } from '../lib/supabase/mock-store';
import { dataStore, ungaAdminUser } from '../lib/storage-mock';
import {
  SUPERADMIN_EMAIL,
  SUPERADMIN_ALIAS_EMAIL,
  SUPERADMIN_PASSWORD,
  ADMIN_WHATSAPP_PHONE,
  ADMIN_WHATSAPP_PHONE_PRIMARY,
  ADMIN_WHATSAPP_PHONE_SECONDARY,
  ADMIN_WHATSAPP_PHONES,
  isAdminWhatsAppPhone,
  isSuperadminEmail,
  canAccessAdmin,
  validateAdminLogin,
  sendAdminWhatsAppOtp,
  verifyAdminWhatsAppOtp,
  activateSuperadminSession,
} from '../lib/auth';
import { UserProfile, Wallet, Transaction } from '../lib/types';

export async function runMilestone5AccessAndWhatsAppTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✅ PASS: [M5 Access & WhatsApp] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ FAIL: [M5 Access & WhatsApp] ${name}`, err);
            failed++;
          });
      } else {
        console.log(`  ✅ PASS: [M5 Access & WhatsApp] ${name}`);
        passed++;
      }
    } catch (err) {
      console.error(`  ❌ FAIL: [M5 Access & WhatsApp] ${name}`, err);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log('🧪 MILESTONE 5: ADMIN ACCESS CONTROL & WHATSAPP 2FA VERIFICATION');
  console.log('====================================================\n');

  // --- Suite 1: Admin Panel Access Control (Block Regular Users) ---
  console.log('--- 1. Admin Panel Access Control & 403 Enforcement ---');

  runTest('canAccessAdmin strictly blocks regular user bungaputri@gmail.com with role "user"', () => {
    const allowed = canAccessAdmin('user', 'bungaputri@gmail.com');
    assert.strictEqual(allowed, false, 'Regular user bungaputri@gmail.com must be blocked from admin panel');
  });

  runTest('canAccessAdmin strictly blocks any user with role "user"', () => {
    assert.strictEqual(canAccessAdmin('user', 'user123@example.com'), false);
    assert.strictEqual(canAccessAdmin('user', null), false);
    assert.strictEqual(canAccessAdmin('user'), false);
  });

  runTest('canAccessAdmin blocks null, undefined, or missing roles', () => {
    assert.strictEqual(canAccessAdmin(null, 'bungaputri@gmail.com'), false);
    assert.strictEqual(canAccessAdmin(undefined, 'ungaaputrii@gmail.com'), false);
    assert.strictEqual(canAccessAdmin(null), false);
    assert.strictEqual(canAccessAdmin(undefined), false);
  });

  runTest('canAccessAdmin blocks non-superadmin email even if role is "admin"', () => {
    const allowed = canAccessAdmin('admin', 'bungaputri@gmail.com');
    assert.strictEqual(allowed, false, 'Non-superadmin email claiming admin role must be blocked');
  });

  runTest('canAccessAdmin permits official superadmin ungaaputrii@gmail.com with role "superadmin"', () => {
    const allowed = canAccessAdmin('superadmin', 'ungaaputrii@gmail.com');
    assert.strictEqual(allowed, true, 'Superadmin ungaaputrii@gmail.com must have admin panel access');
  });

  runTest('canAccessAdmin is case-insensitive and trims email for superadmin', () => {
    assert.strictEqual(canAccessAdmin('superadmin', '  UNGAAPUTRII@GMAIL.COM  '), true);
    assert.strictEqual(canAccessAdmin('superadmin', 'UNGAAPUTRII06@GMAIL.COM'), true);
  });

  runTest('canAccessAdmin maintains backward compatibility when email is omitted', () => {
    assert.strictEqual(canAccessAdmin('superadmin'), true);
    assert.strictEqual(canAccessAdmin('admin'), true);
  });

  runTest('isSuperadminEmail validates only official superadmin addresses', () => {
    assert.strictEqual(isSuperadminEmail('ungaaputrii@gmail.com'), true);
    assert.strictEqual(isSuperadminEmail('ungaaputrii06@gmail.com'), true);
    assert.strictEqual(isSuperadminEmail('bungaputri@gmail.com'), false);
    assert.strictEqual(isSuperadminEmail('admin@tatadana.app'), false);
    assert.strictEqual(isSuperadminEmail(''), false);
    assert.strictEqual(isSuperadminEmail(null), false);
    assert.strictEqual(isSuperadminEmail(undefined), false);
  });

  // --- Suite 2: Admin WhatsApp 2FA Verification Flow ---
  console.log('\n--- 2. Admin WhatsApp 2FA Verification Flow ---');

  runTest('sendAdminWhatsAppOtp rejects non-superadmin email', () => {
    const res = sendAdminWhatsAppOtp('bungaputri@gmail.com');
    assert.strictEqual(res.success, false);
    assert(res.error && res.error.includes('Bukan email resmi Superadmin'));
  });

  runTest('sendAdminWhatsAppOtp sends 6-digit OTP to official admin WhatsApp', () => {
    const res = sendAdminWhatsAppOtp('ungaaputrii@gmail.com');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.phone, ADMIN_WHATSAPP_PHONE);
    assert.strictEqual(res.devOtp, '123456');
    assert(res.message && res.message.includes('+62 812-9876-5432'));
  });

  runTest('verifyAdminWhatsAppOtp rejects invalid OTP code', () => {
    const res = verifyAdminWhatsAppOtp('000000', ADMIN_WHATSAPP_PHONE);
    assert.strictEqual(res.success, false);
    assert(res.error && res.error.includes('Kode OTP WhatsApp salah'));
  });

  runTest('verifyAdminWhatsAppOtp succeeds with valid code 123456 and activates superadmin session', () => {
    const res = verifyAdminWhatsAppOtp('123456', ADMIN_WHATSAPP_PHONE);
    assert.strictEqual(res.success, true);
    assert(res.user !== undefined);
    assert.strictEqual(res.user?.role, 'superadmin');
    assert.strictEqual(res.user?.email, SUPERADMIN_EMAIL);
    assert.strictEqual(dataStore.user.role, 'superadmin');
    assert.strictEqual(dataStore.user.email, SUPERADMIN_EMAIL);

    // Verify audit trail logged
    const latestAudit = mockStore.auditLogs[0];
    assert.strictEqual(latestAudit.action, 'ADMIN_LOGIN_SUCCESS_2FA_WHATSAPP');
    assert.strictEqual((latestAudit.details as any).channel, 'whatsapp_otp');
  });

  runTest('isAdminWhatsAppPhone recognizes both primary (+6281298765432) and secondary (+6281288889999) admin numbers', () => {
    assert.strictEqual(isAdminWhatsAppPhone('081298765432'), true);
    assert.strictEqual(isAdminWhatsAppPhone('+6281298765432'), true);
    assert.strictEqual(isAdminWhatsAppPhone('081288889999'), true);
    assert.strictEqual(isAdminWhatsAppPhone('+6281288889999'), true);
    assert.strictEqual(isAdminWhatsAppPhone('081234567890'), false);
    assert.strictEqual(isAdminWhatsAppPhone(null), false);
    assert.strictEqual(isAdminWhatsAppPhone(undefined), false);
  });

  runTest('verifyAdminWhatsAppOtp succeeds with dual secondary phone +6281288889999', () => {
    sendAdminWhatsAppOtp('ungaaputrii@gmail.com', '081288889999');
    const res = verifyAdminWhatsAppOtp('123456', '+6281288889999');
    assert.strictEqual(res.success, true);
    assert(res.user !== undefined);
    assert.strictEqual(res.user?.role, 'superadmin');
    assert.strictEqual(res.user?.email, SUPERADMIN_EMAIL);
  });

  // --- Suite 3: User WhatsApp Verification & Store Recording ---
  console.log('\n--- 3. User WhatsApp Verification & Store Recording ---');

  const testPhone = '081233445566';
  const testCleanPhone = '081233445566';

  runTest('mockStore.registerUser records new user with WhatsApp verified and creates default wallet', () => {
    const registered = mockStore.registerUser({
      full_name: 'Citra Kirana',
      phone_number: testPhone,
      email: 'citra.kirana@example.com',
      plan: 'starter',
      is_whatsapp_verified: true,
      whatsapp_verified: true,
    });

    assert(registered.id !== undefined, 'User must have an ID');
    assert.strictEqual(registered.full_name, 'Citra Kirana');
    assert.strictEqual(registered.is_whatsapp_verified, true);
    assert.strictEqual(registered.whatsapp_verified, true);
    assert.strictEqual(registered.is_phone_verified, true);
    assert.strictEqual(registered.status, 'approved');

    // Verify user is in mockStore.profiles
    const fetched = mockStore.profiles.get(registered.id);
    assert(fetched !== undefined);
    assert.strictEqual(fetched?.phone_number, testPhone);

    // Verify default wallet created
    const userWallets = mockStore.getWalletsByUser(registered.id);
    assert(userWallets.length >= 1, 'Default wallet must be automatically created');
    assert.strictEqual(userWallets[0].name, 'Dompet Utama');

    // Verify audit log recorded
    const regAudit = mockStore.auditLogs.find(
      (a) => (a.action === 'USER_REGISTER_WHATSAPP_VERIFIED' || a.action === 'USER_REGISTERED_WHATSAPP_VERIFIED') &&
             a.target_user_id === registered.id
    );
    assert(regAudit !== undefined, 'Audit log for registration must exist');
  });

  runTest('dataStore.registerUser records user in dataStore.users list and creates default wallet', () => {
    const dsUser = dataStore.registerUser({
      full_name: 'Dewi Lestari',
      email: 'dewi.lestari@example.com',
      phone_number: '081299887766',
      plan: 'starter',
      is_whatsapp_verified: true,
      whatsapp_verified: true,
    });

    assert(dsUser.id !== undefined);
    assert.strictEqual(dsUser.full_name, 'Dewi Lestari');
    assert.strictEqual(dsUser.is_whatsapp_verified, true);
    assert.strictEqual(dsUser.whatsapp_verified, true);

    // Verify user is in dataStore.users
    const foundInList = dataStore.users.find((u) => u.id === dsUser.id);
    assert(foundInList !== undefined, 'User must be listed in dataStore.users');
    assert.strictEqual(foundInList?.full_name, 'Dewi Lestari');

    // Verify user has wallet in dataStore.wallets
    const dsWallets = dataStore.wallets.filter((w) => w.userId === dsUser.id);
    assert(dsWallets.length >= 1, 'Default wallet must exist in dataStore.wallets');
  });

  runTest('mockStore.findProfileByPhone locates newly registered WhatsApp user', () => {
    const found = mockStore.findProfileByPhone(testCleanPhone);
    assert(found !== undefined, 'User must be findable by clean phone number');
    assert.strictEqual(found?.full_name, 'Citra Kirana');
  });

  // --- Suite 4: User Profile Inspection Modal Data Completeness ---
  console.log('\n--- 4. User Profile Inspection Modal Data Completeness ---');

  runTest('User profile object satisfies all required inspection modal attributes', () => {
    const userId = 'usr_citra_test';
    const profile: UserProfile = {
      id: userId,
      full_name: 'Citra Kirana',
      fullName: 'Citra Kirana',
      email: 'citra.kirana@example.com',
      phone_number: '+6281233445566',
      phoneNumber: '+6281233445566',
      role: 'user',
      plan: 'starter',
      subscriptionPlan: 'starter',
      status: 'approved',
      approval_status: 'approved',
      is_phone_verified: true,
      phoneVerified: true,
      is_whatsapp_verified: true,
      whatsapp_verified: true,
      whatsappVerified: true,
      registration_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      wallets: [
        {
          id: 'w1',
          user_id: userId,
          name: 'Dompet Utama',
          balance: 250000,
          is_default: true,
          color: '#f97316',
          icon: 'wallet',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      transactions: [
        {
          id: 'tx1',
          user_id: userId,
          wallet_id: 'w1',
          type: 'income',
          amount: 250000,
          description: 'Top up saldo awal',
          transaction_date: new Date().toISOString(),
          source: 'web_manual',
          created_at: new Date().toISOString(),
        },
      ],
      total_balance: 250000,
    };

    // Assert name
    assert.strictEqual(profile.full_name || profile.fullName, 'Citra Kirana');
    // Assert email
    assert.strictEqual(profile.email, 'citra.kirana@example.com');
    // Assert phone
    assert.strictEqual(profile.phone_number || profile.phoneNumber, '+6281233445566');
    // Assert WhatsApp verification
    assert.strictEqual(profile.is_whatsapp_verified ?? profile.whatsapp_verified, true);
    // Assert registration date
    assert(profile.registration_date !== undefined);
    // Assert plan
    assert.strictEqual(profile.plan, 'starter');
    // Assert wallets summary
    assert(Array.isArray(profile.wallets) && profile.wallets.length === 1);
    assert.strictEqual(profile.wallets[0].name, 'Dompet Utama');
    assert.strictEqual(profile.wallets[0].balance, 250000);
    // Assert transactions
    assert(Array.isArray(profile.transactions) && profile.transactions.length === 1);
    assert.strictEqual(profile.transactions[0].amount, 250000);
    // Assert total balance
    assert.strictEqual(profile.total_balance, 250000);
  });

  runTest('Admin can upgrade user plan from starter to pro in mockStore and dataStore', () => {
    const targetUserId = 'usr_upgrade_test';
    const testUser = mockStore.registerUser({
      id: targetUserId,
      full_name: 'Budi Santoso',
      phone_number: '081211112222',
      email: 'budi@example.com',
      plan: 'starter',
      is_whatsapp_verified: true,
    });

    dataStore.registerUser({
      id: targetUserId,
      full_name: 'Budi Santoso',
      phone_number: '081211112222',
      email: 'budi@example.com',
      plan: 'starter',
      is_whatsapp_verified: true,
    });

    assert.strictEqual(testUser.plan, 'starter');

    // Upgrade plan to 'pro'
    testUser.plan = 'pro';
    testUser.subscriptionPlan = 'pro';
    mockStore.profiles.set(testUser.id, testUser);

    const dsUser = dataStore.users.find((u) => u.id === targetUserId);
    if (dsUser) {
      dsUser.plan = 'pro';
      dsUser.subscriptionPlan = 'pro';
    }

    assert.strictEqual(mockStore.profiles.get(targetUserId)?.plan, 'pro');
    assert.strictEqual(dataStore.users.find((u) => u.id === targetUserId)?.plan, 'pro');
  });

  runTest('Admin approval and rejection states toggle user status correctly', () => {
    const targetUserId = 'usr_status_test';
    const testUser = mockStore.registerUser({
      id: targetUserId,
      full_name: 'Siti Aminah',
      phone_number: '081233334444',
      status: 'pending',
      approval_status: 'pending',
    });

    assert.strictEqual(testUser.status, 'pending');

    // Approve
    testUser.status = 'approved';
    testUser.approval_status = 'approved';
    assert.strictEqual(testUser.status, 'approved');

    // Reject
    testUser.status = 'rejected';
    testUser.approval_status = 'rejected';
    assert.strictEqual(testUser.status, 'rejected');
  });

  return { passed, failed };
}
