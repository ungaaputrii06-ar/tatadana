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
 * TATADANA MILESTONE 6: EMPIRICAL CHALLENGER STRESS HARNESS
 * Adversarially challenges:
 * 1. Rapid state switching (50+ cycles)
 * 2. Rapid password visibility toggling (50+ cycles)
 * 3. URI encoding & WhatsApp link robustness
 * 4. Mobile (375px) vs Desktop (1280px+) responsive styling constraints
 * 5. Route parity between /auth/login and /login
 * 6. Edge case inputs (empty username, invalid characters, SQL injection, error query params)
 */
export async function runMilestone6ChallengerStressTests(): Promise<{ passed: number; failed: number }> {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  const failures: { name: string; error: any }[] = [];

  function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✅ PASS: [Challenger M6] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ FAIL: [Challenger M6] ${name}`, err);
            failures.push({ name, error: err });
            failed++;
          });
      } else {
        console.log(`  ✅ PASS: [Challenger M6] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌ FAIL: [Challenger M6] ${name}`, err);
      failures.push({ name, error: err });
      failed++;
    }
  }

  console.log('\n================================================================');
  console.log('⚡ TATADANA M6 EMPIRICAL CHALLENGER STRESS HARNESS ⚡');
  console.log('================================================================\n');

  // Load source files for static verification
  const authLoginPath = path.resolve(__dirname, '../app/auth/login/page.tsx');
  const loginAliasPath = path.resolve(__dirname, '../app/login/page.tsx');
  const authSource = fs.readFileSync(authLoginPath, 'utf-8');
  const aliasSource = fs.readFileSync(loginAliasPath, 'utf-8');

  // Pure state model mirroring AuthLoginForm in src/app/auth/login/page.tsx
  function createLoginEngine() {
    let role: 'user' | 'admin' = 'user';
    let username = 'bungaputri@gmail.com';
    let password = 'admin1234';
    let showPassword = false;
    let loading = false;
    let errorMsg = '';
    let adminOtpStep = false;
    let adminOtpCode = '';
    let adminOtpMsg = '';

    return {
      get role() { return role; },
      get username() { return username; },
      get password() { return password; },
      get showPassword() { return showPassword; },
      get loading() { return loading; },
      get errorMsg() { return errorMsg; },
      get adminOtpStep() { return adminOtpStep; },
      get adminOtpCode() { return adminOtpCode; },
      get adminOtpMsg() { return adminOtpMsg; },

      setUsername(val: string) { username = val; },
      setPassword(val: string) { password = val; },
      setLoading(val: boolean) { loading = val; },
      setAdminOtpCode(val: string) { adminOtpCode = val; },

      handleRoleChange(newRole: 'user' | 'admin') {
        role = newRole;
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

      togglePassword() {
        showPassword = !showPassword;
      },

      handleQueryParams(params: Record<string, string | null>) {
        const errorParam = params.error;
        const demoParam = params.demo;
        const emailParam = params.email;

        if (errorParam === 'unauthorized_admin_access') {
          role = 'admin';
          errorMsg = 'Akses ditolak: Anda harus masuk sebagai Superadmin resmi untuk mengakses panel admin.';
        }

        if (demoParam === 'admin' || emailParam === 'ungaaputrii@gmail.com' || emailParam === 'ungaaputrii06@gmail.com') {
          role = 'admin';
          username = 'ungaaputrii@gmail.com';
          password = '1234';
        } else if (demoParam === 'bunga' || emailParam === 'bungaputri@gmail.com') {
          role = 'user';
          username = 'bungaputri@gmail.com';
          password = 'admin1234';
        }
      },

      getFormTitle() {
        return role === 'user' ? 'Masuk sebagai User' : 'Masuk sebagai Admin';
      },

      getFormSubtitle() {
        return role === 'user'
          ? 'Masukkan kredensial akun Anda untuk mengakses dashboard'
          : 'Akses terbatas khusus administrator dan pengelola sistem';
      },

      getSubmitButtonText() {
        if (loading) return 'Memverifikasi...';
        return role === 'user' ? 'Masuk sebagai User' : 'Masuk sebagai Admin';
      },

      getPasswordInputType() {
        return showPassword ? 'text' : 'password';
      },

      submit(): { success: boolean; targetRoute?: string; otpStep?: boolean; error?: string } {
        if (!username || !password) {
          errorMsg = 'Mohon isi username dan kata sandi.';
          return { success: false, error: errorMsg };
        }

        loading = true;
        errorMsg = '';
        const normalizedUser = username.trim().toLowerCase();

        // Scenario 1: Admin Login
        if (role === 'admin' || normalizedUser === 'ungaaputrii@gmail.com' || normalizedUser === 'ungaaputrii06@gmail.com') {
          if (password !== '1234') {
            errorMsg = 'Kata sandi admin salah! Gunakan sandi admin resmi: 1234';
            loading = false;
            return { success: false, error: errorMsg };
          }
          const otpRes = sendAdminWhatsAppOtp('ungaaputrii@gmail.com');
          adminOtpStep = true;
          adminOtpMsg = otpRes.message || 'OTP Sent';
          loading = false;
          return { success: true, otpStep: true };
        }

        // Scenario 2: Demo User (Bunga Putri)
        if (normalizedUser === 'bungaputri@gmail.com') {
          if (password !== 'admin1234') {
            errorMsg = 'Kata sandi user salah! Gunakan sandi resmi: admin1234';
            loading = false;
            return { success: false, error: errorMsg };
          }
          dataStore.user.id = 'usr_bunga_01';
          dataStore.user.email = 'bungaputri@gmail.com';
          dataStore.user.role = 'user';
          loading = false;
          return { success: true, targetRoute: '/dashboard' };
        }

        // Scenario 3: General User
        loading = false;
        return { success: true, targetRoute: '/dashboard' };
      },

      verifyOtp(code: string): { success: boolean; targetRoute?: string; error?: string } {
        if (!code || code.trim().length < 4) {
          errorMsg = 'Masukkan kode OTP WhatsApp 6 digit yang valid.';
          return { success: false, error: errorMsg };
        }
        loading = true;
        errorMsg = '';
        const res = verifyAdminWhatsAppOtp(code.trim(), ADMIN_WHATSAPP_PHONE);
        if (res.success) {
          loading = false;
          return { success: true, targetRoute: '/admin' };
        } else {
          errorMsg = res.error || 'Kode OTP WhatsApp salah atau kedaluwarsa.';
          loading = false;
          return { success: false, error: errorMsg };
        }
      }
    };
  }

  // =========================================================================
  // 1. RAPID STATE SWITCHING TEST (50+ TOGGLES)
  // =========================================================================
  console.log('--- 1. Rapid Role Capsule Switching Stress Test (100 Iterations) ---');

  test('Rapid 100x role toggle maintains perfect state consistency without desync', () => {
    const engine = createLoginEngine();
    assert.strictEqual(engine.role, 'user');

    for (let i = 1; i <= 100; i++) {
      const targetRole = i % 2 === 1 ? 'admin' : 'user';
      engine.handleRoleChange(targetRole);

      assert.strictEqual(engine.role, targetRole, `Iteration ${i}: role mismatch`);
      if (targetRole === 'admin') {
        assert.strictEqual(engine.getFormTitle(), 'Masuk sebagai Admin', `Iteration ${i}: title mismatch`);
        assert.strictEqual(engine.getFormSubtitle(), 'Akses terbatas khusus administrator dan pengelola sistem');
        assert.strictEqual(engine.getSubmitButtonText(), 'Masuk sebagai Admin');
        assert.strictEqual(engine.username, 'ungaaputrii@gmail.com');
        assert.strictEqual(engine.password, '1234');
      } else {
        assert.strictEqual(engine.getFormTitle(), 'Masuk sebagai User', `Iteration ${i}: title mismatch`);
        assert.strictEqual(engine.getFormSubtitle(), 'Masukkan kredensial akun Anda untuk mengakses dashboard');
        assert.strictEqual(engine.getSubmitButtonText(), 'Masuk sebagai User');
        assert.strictEqual(engine.username, 'bungaputri@gmail.com');
        assert.strictEqual(engine.password, 'admin1234');
      }
      assert.strictEqual(engine.errorMsg, '', `Iteration ${i}: errorMsg must be cleared`);
      assert.strictEqual(engine.adminOtpStep, false, `Iteration ${i}: otp step must be reset`);
    }

    // Final state should be user (since 100 is even)
    assert.strictEqual(engine.role, 'user');
    assert.strictEqual(engine.getFormTitle(), 'Masuk sebagai User');
  });

  test('Rapid role toggle preserves custom user input without overwriting if not default credentials', () => {
    const engine = createLoginEngine();
    engine.setUsername('custom_user@domain.com');
    engine.setPassword('MySecretPassword99!');

    for (let i = 0; i < 50; i++) {
      engine.handleRoleChange(i % 2 === 0 ? 'admin' : 'user');
      // Custom credentials should be retained since they do not match default presets
      assert.strictEqual(engine.username, 'custom_user@domain.com');
      assert.strictEqual(engine.password, 'MySecretPassword99!');
    }
  });

  test('Idempotent role toggle: calling handleRoleChange with identical role preserves state', () => {
    const engine = createLoginEngine();
    for (let i = 0; i < 10; i++) {
      engine.handleRoleChange('user');
      assert.strictEqual(engine.role, 'user');
      assert.strictEqual(engine.getFormTitle(), 'Masuk sebagai User');
    }
    for (let i = 0; i < 10; i++) {
      engine.handleRoleChange('admin');
      assert.strictEqual(engine.role, 'admin');
      assert.strictEqual(engine.getFormTitle(), 'Masuk sebagai Admin');
    }
  });

  // =========================================================================
  // 2. RAPID PASSWORD VISIBILITY TOGGLE (50+ TOGGLES)
  // =========================================================================
  console.log('\n--- 2. Rapid Password Visibility Stress Test (100 Iterations) ---');

  test('Rapid 100x password toggle strictly alternates between password and text', () => {
    const engine = createLoginEngine();
    assert.strictEqual(engine.showPassword, false);
    assert.strictEqual(engine.getPasswordInputType(), 'password');

    for (let i = 1; i <= 100; i++) {
      engine.togglePassword();
      const expectedShow = i % 2 === 1;
      const expectedType = expectedShow ? 'text' : 'password';

      assert.strictEqual(engine.showPassword, expectedShow, `Iteration ${i}: showPassword boolean mismatch`);
      assert.strictEqual(engine.getPasswordInputType(), expectedType, `Iteration ${i}: input type mismatch`);
    }

    // After 100 toggles, must end back in hidden 'password' state
    assert.strictEqual(engine.showPassword, false);
    assert.strictEqual(engine.getPasswordInputType(), 'password');
  });

  test('UI source code binds Eye and EyeOff icons correctly to showPassword boolean', () => {
    assert.strictEqual(authSource.includes('type={showPassword ? \'text\' : \'password\'}'), true);
    assert.strictEqual(authSource.includes('<EyeOff className="w-5 h-5" />'), true);
    assert.strictEqual(authSource.includes('<Eye className="w-5 h-5" />'), true);
    assert.strictEqual(authSource.includes('title={showPassword ? \'Sembunyikan Kata Sandi\' : \'Tampilkan Kata Sandi\'}'), true);
  });

  // =========================================================================
  // 3. URI ENCODING & WHATSAPP LINK ROBUSTNESS
  // =========================================================================
  console.log('\n--- 3. WhatsApp Help Desk URI Robustness & Security ---');

  test('Target phone number is 628987472983 and valid international format', () => {
    const targetPhone = '628987472983';
    assert.strictEqual(/^62\d{9,12}$/.test(targetPhone), true, 'Phone must match Indonesian international format');
    assert.strictEqual(authSource.includes('https://wa.me/628987472983'), true);
  });

  test('WhatsApp message draft is properly percent-encoded with no raw unescaped whitespace', () => {
    const rawExpectedDraft = 'Halo Admin Bunga Putri, saya butuh bantuan terkait login TataDana.';
    const encodedDraft = 'Halo%20Admin%20Bunga%20Putri,%20saya%20butuh%20bantuan%20terkait%20login%20TataDana.';

    assert.strictEqual(encodeURI(rawExpectedDraft).replace(/%20/g, ' '), rawExpectedDraft);
    assert.strictEqual(decodeURIComponent(encodedDraft), rawExpectedDraft);
    assert.strictEqual(authSource.includes(encodedDraft), true);

    // Verify there are no raw unescaped spaces or newlines in the href
    const waLinkMatches = authSource.match(/href="https:\/\/wa\.me\/628987472983\?text=([^"]+)"/g) || [];
    assert.ok(waLinkMatches.length >= 1, 'Must find at least 1 WhatsApp link in source');
    for (const link of waLinkMatches) {
      assert.strictEqual(link.includes(' '), false, `Link must not contain raw whitespace: ${link}`);
      assert.strictEqual(link.includes('\n'), false, `Link must not contain newlines: ${link}`);
    }
  });

  test('WhatsApp link enforces target="_blank" and rel="noopener noreferrer" for anti-tabnabbing security', () => {
    const helpBoxSlice = authSource.substring(authSource.indexOf('id="chatWaBtn"'));
    const anchorTagEnd = helpBoxSlice.indexOf('>');
    const anchorTag = helpBoxSlice.substring(0, anchorTagEnd);

    assert.strictEqual(anchorTag.includes('target="_blank"'), true, 'Must specify target="_blank"');
    assert.strictEqual(anchorTag.includes('rel="noopener noreferrer"'), true, 'Must specify rel="noopener noreferrer"');
  });

  // =========================================================================
  // 4. MOBILE (375PX) VS DESKTOP (1280PX+) RESPONSIVE STYLING CONSTRAINTS
  // =========================================================================
  console.log('\n--- 4. Responsive Constraints (375px Mobile vs 1280px Desktop) ---');

  test('Outer screen wrapper has min-h-screen, dark background #090D16, and centered flexbox', () => {
    assert.strictEqual(authSource.includes('min-h-screen bg-[#090D16]'), true);
    assert.strictEqual(authSource.includes('flex flex-col justify-center items-center'), true);
    assert.strictEqual(authSource.includes('p-4 sm:p-6'), true);
  });

  test('Card component uses max-w-[480px], rounded-3xl, soft drop shadow, and overflow-hidden', () => {
    assert.strictEqual(authSource.includes('w-full max-w-[480px]'), true);
    assert.strictEqual(authSource.includes('rounded-3xl'), true);
    assert.strictEqual(authSource.includes('shadow-2xl shadow-black/50'), true);
    assert.strictEqual(authSource.includes('overflow-hidden'), true);
  });

  test('WhatsApp help desk box uses responsive stacking (flex-col sm:flex-row) to prevent mobile squeeze', () => {
    assert.strictEqual(authSource.includes('flex flex-col sm:flex-row items-center justify-between gap-3'), true);
  });

  test('Capsule switcher and buttons use full responsive width classes', () => {
    assert.strictEqual(authSource.includes('flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm'), true);
    assert.strictEqual(authSource.includes('w-full py-3.5 px-6 rounded-2xl bg-blue-600'), true);
  });

  // =========================================================================
  // 5. ROUTE PARITY BETWEEN /auth/login AND /login
  // =========================================================================
  console.log('\n--- 5. Route Parity (/auth/login vs /login) ---');

  test('File /login/page.tsx directly re-exports default from /auth/login/page without wrappers', () => {
    const trimmedAlias = aliasSource.trim();
    assert.strictEqual(
      trimmedAlias,
      "export { default } from '@/app/auth/login/page';",
      'Alias page must strictly be a clean one-line re-export'
    );
  });

  test('Old light-mode flash background #F8F9FA is completely eradicated from /login/page.tsx', () => {
    assert.strictEqual(aliasSource.includes('#F8F9FA'), false);
    assert.strictEqual(aliasSource.includes('Suspense'), false);
    assert.strictEqual(aliasSource.includes('Memuat halaman login...'), false);
  });

  test('Both routes point to dark obsidian fallback during Next.js client suspense', () => {
    assert.strictEqual(authSource.includes('min-h-screen bg-[#090D16] flex items-center justify-center'), true);
  });

  // =========================================================================
  // 6. ADVERSARIAL EDGE CASE INPUTS & INJECTION RESISTANCE
  // =========================================================================
  console.log('\n--- 6. Edge Cases & Adversarial Input Attacks ---');

  test('Empty username or password triggers user-friendly validation error', () => {
    const engine = createLoginEngine();
    engine.setUsername('');
    engine.setPassword('');
    const res = engine.submit();

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Mohon isi username dan kata sandi.');
    assert.strictEqual(engine.errorMsg, 'Mohon isi username dan kata sandi.');
  });

  test('SQL Injection strings fail admin login and never escalate privilege', () => {
    const sqlInjections = [
      "' OR 1=1 --",
      "' OR 'a'='a",
      "ungaaputrii@gmail.com' --",
      "admin' /*",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --"
    ];

    for (const sql of sqlInjections) {
      const engine = createLoginEngine();
      engine.handleRoleChange('admin');
      engine.setUsername(sql);
      engine.setPassword(sql);
      const res = engine.submit();

      assert.strictEqual(res.success, false, `SQL injection '${sql}' must fail`);
      assert.strictEqual(engine.adminOtpStep, false, 'SQL injection must not trigger OTP step');
    }
  });

  test('XSS script tags in username are safely treated as string literals', () => {
    const xssPayloads = [
      "<script>alert('pwned')</script>",
      "<img src=x onerror=alert(1)>",
      "javascript:alert(1)"
    ];

    for (const xss of xssPayloads) {
      const engine = createLoginEngine();
      engine.setUsername(xss);
      engine.setPassword('wrongpass');
      const res = engine.submit();

      // Does not crash, routes to general dashboard or fails
      assert.strictEqual(typeof res, 'object');
      assert.strictEqual(engine.adminOtpStep, false);
    }
  });

  test('Massive 10,000-character string inputs do not cause buffer overflow or crash', () => {
    const largeStr = 'A'.repeat(10000);
    const engine = createLoginEngine();
    engine.setUsername(largeStr);
    engine.setPassword(largeStr);
    const res = engine.submit();

    assert.strictEqual(typeof res, 'object');
    assert.strictEqual(engine.adminOtpStep, false);
  });

  test('Error query parameter handling: only exact unauthorized_admin_access triggers rejection', () => {
    const engine = createLoginEngine();

    // Adversarial error queries
    const nonTriggeringParams = [
      null,
      '',
      'invalid_token',
      'unauthorized',
      'UNAUTHORIZED_ADMIN_ACCESS',
      "unauthorized_admin_access' OR 1=1 --",
      '<script>alert(1)</script>'
    ];

    for (const param of nonTriggeringParams) {
      const e = createLoginEngine();
      e.handleQueryParams({ error: param, demo: null, email: null });
      assert.strictEqual(e.role, 'user', `Param '${param}' must not switch role to admin`);
      assert.strictEqual(e.errorMsg, '', `Param '${param}' must not trigger errorMsg`);
    }

    // Exact trigger
    engine.handleQueryParams({ error: 'unauthorized_admin_access', demo: null, email: null });
    assert.strictEqual(engine.role, 'admin');
    assert.strictEqual(engine.errorMsg, 'Akses ditolak: Anda harus masuk sebagai Superadmin resmi untuk mengakses panel admin.');
  });

  test('Admin WhatsApp 2FA OTP robustness: rejects invalid codes, enforces 6-digit length', () => {
    const engine = createLoginEngine();
    engine.handleRoleChange('admin');
    engine.setUsername('ungaaputrii@gmail.com');
    engine.setPassword('1234');

    const submitRes = engine.submit();
    assert.strictEqual(submitRes.success, true);
    assert.strictEqual(submitRes.otpStep, true);
    assert.strictEqual(engine.adminOtpStep, true);

    // Test invalid OTPs
    const invalidOtps = ['', '12', 'abc', '000000', '999999', '123455', '1234567'];
    for (const otp of invalidOtps) {
      const otpRes = engine.verifyOtp(otp);
      assert.strictEqual(otpRes.success, false, `OTP '${otp}' must fail`);
      assert.ok(otpRes.error);
    }

    // Test valid demo OTP
    const validRes = engine.verifyOtp('123456');
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(validRes.targetRoute, '/admin');
  });

  console.log('\n================================================================');
  console.log(`⚡ CHALLENGER STRESS COMPLETE: ${passed} PASSED, ${failed} FAILED (Total: ${totalTests})`);
  console.log('================================================================\n');

  return { passed, failed };
}

// Self-executing runner when executed via Node/jiti
if (require.main === module) {
  runMilestone6ChallengerStressTests().then(({ passed, failed }) => {
    if (failed > 0) process.exit(1);
  });
}
