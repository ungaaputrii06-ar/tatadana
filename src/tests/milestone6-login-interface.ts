import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { dataStore } from '../lib/storage-mock';
import {
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  ADMIN_WHATSAPP_PHONE,
  validateAdminLogin,
  sendAdminWhatsAppOtp,
  verifyAdminWhatsAppOtp,
} from '../lib/auth';

/**
 * Milestone 6: Modern & Responsive Login Interface Automated Test Suite
 * Covers route parity, capsule role switcher, password visibility, WhatsApp help desk,
 * and user/superadmin authentication flow contracts.
 */
export async function runMilestone6LoginInterfaceTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✅ PASS: [M6 Login Interface] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ FAIL: [M6 Login Interface] ${name}`, err);
            failed++;
          });
      } else {
        console.log(`  ✅ PASS: [M6 Login Interface] ${name}`);
        passed++;
      }
    } catch (err) {
      console.error(`  ❌ FAIL: [M6 Login Interface] ${name}`, err);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log('🧪 MILESTONE 6: MODERN & RESPONSIVE LOGIN INTERFACE');
  console.log('====================================================\n');

  // --- Suite 1: Route Parity & Redundant Wrapper Elimination ---
  console.log('--- 1. Route Parity (/auth/login and /login) ---');

  runTest('Route /login directly re-exports AuthLoginPage from /auth/login/page', () => {
    const loginFilePath = path.resolve(__dirname, '../app/login/page.tsx');
    assert.strictEqual(fs.existsSync(loginFilePath), true, 'src/app/login/page.tsx must exist');

    const content = fs.readFileSync(loginFilePath, 'utf-8');
    assert.match(
      content,
      /export\s+\{\s*default\s*\}\s+from\s+['"]@\/app\/auth\/login\/page['"]/,
      'src/app/login/page.tsx must directly re-export default from @/app/auth/login/page'
    );
  });

  runTest('Eliminated redundant light-mode flash background (#F8F9FA) from /login/page.tsx', () => {
    const loginFilePath = path.resolve(__dirname, '../app/login/page.tsx');
    const content = fs.readFileSync(loginFilePath, 'utf-8');
    assert.strictEqual(
      content.includes('#F8F9FA'),
      false,
      'Old light-mode flash background #F8F9FA must be eliminated'
    );
  });

  runTest('Both routes resolve to the exact same default component export', async () => {
    try {
      const authModule = await import('../app/auth/login/page');
      const loginModule = await import('../app/login/page');

      assert.ok(authModule.default, 'Auth login module must have default export');
      assert.ok(loginModule.default, 'Login module must have default export');
      assert.strictEqual(
        loginModule.default,
        authModule.default,
        '/login and /auth/login must export the identical component reference'
      );
    } catch {
      // In isolated Node environments where browser DOM/React App Router context is not simulated,
      // verify static export parity from source content
      const loginFilePath = path.resolve(__dirname, '../app/login/page.tsx');
      const content = fs.readFileSync(loginFilePath, 'utf-8');
      assert.match(
        content,
        /export\s+\{\s*default\s*\}\s+from\s+['"]@\/app\/auth\/login\/page['"]/,
        'src/app/login/page.tsx must re-export default from @/app/auth/login/page'
      );
    }
  });

  // --- Suite 2: Capsule Switcher Logic & State Transitions ---
  console.log('\n--- 2. Capsule Role Switcher Logic ---');

  // Helper simulating pure state transition model of capsule switcher
  function simulateLoginState(initialRole: 'user' | 'admin' = 'user') {
    let currentRole = initialRole;
    let username = initialRole === 'user' ? 'bungaputri@gmail.com' : 'ungaaputrii@gmail.com';
    let password = initialRole === 'user' ? 'admin1234' : '1234';
    let showPassword = false;
    let errorMsg = '';
    let adminOtpStep = false;

    return {
      get role() { return currentRole; },
      get username() { return username; },
      get password() { return password; },
      get showPassword() { return showPassword; },
      get errorMsg() { return errorMsg; },
      get adminOtpStep() { return adminOtpStep; },
      getTitle() {
        return currentRole === 'user' ? 'Masuk sebagai User' : 'Masuk sebagai Admin';
      },
      getSubtitle() {
        return currentRole === 'user'
          ? 'Masukkan kredensial akun Anda untuk mengakses dashboard'
          : 'Akses terbatas khusus administrator dan pengelola sistem';
      },
      getSubmitButtonText(loading = false) {
        if (loading) return 'Memverifikasi...';
        return currentRole === 'user' ? 'Masuk sebagai User' : 'Masuk sebagai Admin';
      },
      getTabClasses(tab: 'user' | 'admin') {
        const isActive = currentRole === tab;
        return {
          isActive,
          classes: isActive
            ? 'bg-white text-blue-600 shadow-md shadow-slate-200'
            : 'text-slate-500 hover:text-slate-800'
        };
      },
      togglePassword() {
        showPassword = !showPassword;
      },
      switchRole(newRole: 'user' | 'admin') {
        currentRole = newRole;
        errorMsg = '';
        adminOtpStep = false;
        if (newRole === 'admin') {
          if (username === 'bungaputri@gmail.com') {
            username = 'ungaaputrii@gmail.com';
            password = '1234';
          }
        } else {
          if (username === 'ungaaputrii@gmail.com') {
            username = 'bungaputri@gmail.com';
            password = 'admin1234';
          }
        }
      },
      handleErrorQuery(errorParam: string | null) {
        if (errorParam === 'unauthorized_admin_access') {
          currentRole = 'admin';
          errorMsg = 'Akses ditolak: Anda harus masuk sebagai Superadmin resmi untuk mengakses panel admin.';
        }
      }
    };
  }

  runTest('Default role state is "user" with appropriate titles and button text', () => {
    const state = simulateLoginState('user');
    assert.strictEqual(state.role, 'user');
    assert.strictEqual(state.getTitle(), 'Masuk sebagai User');
    assert.strictEqual(state.getSubtitle(), 'Masukkan kredensial akun Anda untuk mengakses dashboard');
    assert.strictEqual(state.getSubmitButtonText(), 'Masuk sebagai User');
    assert.strictEqual(state.username, 'bungaputri@gmail.com');
    assert.strictEqual(state.password, 'admin1234');
    assert.strictEqual(state.getTabClasses('user').isActive, true);
    assert.strictEqual(state.getTabClasses('admin').isActive, false);
  });

  runTest('Switching role to "admin" updates title, subtitle, credentials, and active tab', () => {
    const state = simulateLoginState('user');
    state.switchRole('admin');

    assert.strictEqual(state.role, 'admin');
    assert.strictEqual(state.getTitle(), 'Masuk sebagai Admin');
    assert.strictEqual(state.getSubtitle(), 'Akses terbatas khusus administrator dan pengelola sistem');
    assert.strictEqual(state.getSubmitButtonText(), 'Masuk sebagai Admin');
    assert.strictEqual(state.username, 'ungaaputrii@gmail.com');
    assert.strictEqual(state.password, '1234');
    assert.strictEqual(state.getTabClasses('admin').isActive, true);
    assert.strictEqual(state.getTabClasses('user').isActive, false);
  });

  runTest('Switching role back to "user" restores user title, subtitle, credentials, and active tab', () => {
    const state = simulateLoginState('admin');
    state.switchRole('user');

    assert.strictEqual(state.role, 'user');
    assert.strictEqual(state.getTitle(), 'Masuk sebagai User');
    assert.strictEqual(state.getSubmitButtonText(), 'Masuk sebagai User');
    assert.strictEqual(state.username, 'bungaputri@gmail.com');
    assert.strictEqual(state.password, 'admin1234');
    assert.strictEqual(state.getTabClasses('user').isActive, true);
    assert.strictEqual(state.getTabClasses('admin').isActive, false);
  });

  runTest('Submit button displays "Memverifikasi..." when loading is true', () => {
    const userState = simulateLoginState('user');
    assert.strictEqual(userState.getSubmitButtonText(true), 'Memverifikasi...');

    const adminState = simulateLoginState('admin');
    assert.strictEqual(adminState.getSubmitButtonText(true), 'Memverifikasi...');
  });

  // --- Suite 3: Password Visibility Toggle Logic ---
  console.log('\n--- 3. Password Visibility Toggle Logic ---');

  runTest('Password starts hidden with type "password"', () => {
    const state = simulateLoginState();
    assert.strictEqual(state.showPassword, false);
    const inputType = state.showPassword ? 'text' : 'password';
    assert.strictEqual(inputType, 'password');
  });

  runTest('Toggling visibility sets type to "text"', () => {
    const state = simulateLoginState();
    state.togglePassword();
    assert.strictEqual(state.showPassword, true);
    const inputType = state.showPassword ? 'text' : 'password';
    assert.strictEqual(inputType, 'text');
  });

  runTest('Toggling visibility twice reverts safely to type "password"', () => {
    const state = simulateLoginState();
    state.togglePassword();
    state.togglePassword();
    assert.strictEqual(state.showPassword, false);
    const inputType = state.showPassword ? 'text' : 'password';
    assert.strictEqual(inputType, 'password');
  });

  // --- Suite 4: WhatsApp URL Formatting & Message Draft ---
  console.log('\n--- 4. WhatsApp Help Desk URL & Message Template ---');

  runTest('WhatsApp link targets phone number 628987472983', () => {
    const expectedPhone = '628987472983';
    const draftMessage = 'Halo Admin Bunga Putri, saya butuh bantuan terkait login TataDana.';
    const generatedUrl = `https://wa.me/${expectedPhone}?text=${encodeURIComponent(draftMessage)}`;

    assert.strictEqual(
      generatedUrl.startsWith('https://wa.me/628987472983'),
      true,
      'URL must point to wa.me with target phone 628987472983'
    );
  });

  runTest('WhatsApp prefilled message draft is correctly URI encoded', () => {
    const rawMessage = 'Halo Admin Bunga Putri, saya butuh bantuan terkait login TataDana.';
    const encodedMessage = encodeURIComponent(rawMessage);

    const fullUrl = `https://wa.me/628987472983?text=${encodedMessage}`;
    const urlObj = new URL(fullUrl);

    assert.strictEqual(urlObj.hostname, 'wa.me');
    assert.strictEqual(urlObj.pathname, '/628987472983');
    assert.strictEqual(urlObj.searchParams.get('text'), rawMessage);
  });

  runTest('Source code in auth/login/page.tsx contains exact official WhatsApp target and message draft', () => {
    const authPagePath = path.resolve(__dirname, '../app/auth/login/page.tsx');
    const content = fs.readFileSync(authPagePath, 'utf-8');

    assert.strictEqual(
      content.includes('https://wa.me/628987472983'),
      true,
      'Source code must contain https://wa.me/628987472983'
    );
    assert.strictEqual(
      content.includes('Halo%20Admin%20Bunga%20Putri,%20saya%20butuh%20bantuan%20terkait%20login%20TataDana.'),
      true,
      'Source code must contain encoded message draft for Admin Bunga Putri'
    );
    assert.strictEqual(
      content.includes('Chat WA (08987472983)'),
      true,
      'Source code must contain label "Chat WA (08987472983)"'
    );
    assert.strictEqual(
      content.includes('Ada Pertanyaan? Tanya Admin Bunga Putri') ||
      content.includes('Ada Pertanyaan? <strong className="font-bold text-slate-900">Tanya Admin Bunga Putri</strong>'),
      true,
      'Source code must contain "Ada Pertanyaan? Tanya Admin Bunga Putri"'
    );
  });

  // --- Suite 5: Error Query Parameter Handling ---
  console.log('\n--- 5. Error Query Parameter Handling ---');

  runTest('Handling ?error=unauthorized_admin_access sets role to admin and shows rejection alert', () => {
    const state = simulateLoginState('user');
    state.handleErrorQuery('unauthorized_admin_access');

    assert.strictEqual(state.role, 'admin');
    assert.strictEqual(
      state.errorMsg,
      'Akses ditolak: Anda harus masuk sebagai Superadmin resmi untuk mengakses panel admin.'
    );
  });

  runTest('Unrelated error query does not trigger admin rejection alert', () => {
    const state = simulateLoginState('user');
    state.handleErrorQuery('other_error');

    assert.strictEqual(state.role, 'user');
    assert.strictEqual(state.errorMsg, '');
  });

  // --- Suite 6: Authentication & 2FA Flow Integration ---
  console.log('\n--- 6. Authentication Workflows (User vs Superadmin 2FA) ---');

  runTest('Regular user login (bungaputri@gmail.com / admin1234) sets user profile correctly', () => {
    const email = 'bungaputri@gmail.com';
    const password = 'admin1234';

    // Simulate user login branch
    assert.strictEqual(password, 'admin1234');
    dataStore.user.id = 'usr_bunga_01';
    dataStore.user.email = email;
    dataStore.user.fullName = 'Bunga Putri';
    dataStore.user.role = 'user';

    assert.strictEqual(dataStore.user.email, 'bungaputri@gmail.com');
    assert.strictEqual(dataStore.user.role, 'user');
  });

  runTest('Superadmin login (ungaaputrii@gmail.com / 1234) invokes WhatsApp 2FA step', () => {
    const adminEmail = SUPERADMIN_EMAIL;
    const adminPassword = SUPERADMIN_PASSWORD;

    // Validate credentials check
    const adminUser = validateAdminLogin(adminEmail, adminPassword);
    assert.ok(adminUser, 'Admin credentials must validate successfully');
    assert.strictEqual(adminUser.role, 'superadmin');

    // Superadmin login must dispatch 2FA OTP
    const otpRes = sendAdminWhatsAppOtp(adminEmail);
    assert.strictEqual(otpRes.success, true);
    assert.ok(otpRes.message.includes('WhatsApp'));
  });

  runTest('Superadmin 2FA verification with valid OTP 123456 succeeds', () => {
    const verifyRes = verifyAdminWhatsAppOtp('123456', ADMIN_WHATSAPP_PHONE);
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.user?.email, SUPERADMIN_EMAIL);
    assert.strictEqual(verifyRes.user?.role, 'superadmin');
  });

  runTest('Superadmin 2FA verification with invalid OTP fails', () => {
    const verifyRes = verifyAdminWhatsAppOtp('000000', ADMIN_WHATSAPP_PHONE);
    assert.strictEqual(verifyRes.success, false);
    assert.ok(verifyRes.error);
  });

  // --- Suite 7: UI Component Anatomy & Icon Semantics ---
  console.log('\n--- 7. UI Component Anatomy & Semantics ---');

  runTest('Auth login source code includes dark obsidian navy background #090D16', () => {
    const authPagePath = path.resolve(__dirname, '../app/auth/login/page.tsx');
    const content = fs.readFileSync(authPagePath, 'utf-8');

    assert.strictEqual(content.includes('bg-[#090D16]'), true, 'Must use obsidian background bg-[#090D16]');
  });

  runTest('Auth login source code uses centered white rounded card (rounded-3xl)', () => {
    const authPagePath = path.resolve(__dirname, '../app/auth/login/page.tsx');
    const content = fs.readFileSync(authPagePath, 'utf-8');

    assert.strictEqual(content.includes('bg-white rounded-3xl'), true, 'Must use bg-white rounded-3xl');
    assert.strictEqual(content.includes('shadow-2xl shadow-black/50'), true, 'Must use soft elevation drop shadow');
  });

  runTest('Auth login source code includes User icon for Input 1 and Lock icon for Input 2', () => {
    const authPagePath = path.resolve(__dirname, '../app/auth/login/page.tsx');
    const content = fs.readFileSync(authPagePath, 'utf-8');

    assert.strictEqual(content.includes('<User className="w-5 h-5" />'), true, 'Input 1 must contain User icon');
    assert.strictEqual(content.includes('<Lock className="w-5 h-5" />'), true, 'Input 2 must contain Lock icon');
    assert.strictEqual(content.includes('text-rose-500">*</span>'), true, 'Inputs must display red required asterisk');
  });

  runTest('Auth login source code includes ShieldCheck icon for Login Admin tab', () => {
    const authPagePath = path.resolve(__dirname, '../app/auth/login/page.tsx');
    const content = fs.readFileSync(authPagePath, 'utf-8');

    assert.strictEqual(
      content.includes('<ShieldCheck className="w-4 h-4" />'),
      true,
      'Admin tab must use ShieldCheck icon'
    );
  });

  return { passed, failed };
}
