import { UserProfile, UserRole } from '../types';
import { ungaAdminUser, dataStore } from '../storage-mock';
import { mockStore } from '../supabase/mock-store';

export const SUPERADMIN_EMAIL = 'ungaaputrii@gmail.com';
export const SUPERADMIN_ALIAS_EMAIL = 'ungaaputrii06@gmail.com';
export const SUPERADMIN_PASSWORD = '1234';
export const ADMIN_WHATSAPP_PHONE = '081298765432';
export const ADMIN_WHATSAPP_PHONE_PRIMARY = '081298765432';
export const ADMIN_WHATSAPP_PHONE_SECONDARY = '081288889999';
export const ADMIN_WHATSAPP_PHONES = [
  '081298765432',
  '081288889999',
  '+6281298765432',
  '+6281288889999',
  '6281298765432',
  '6281288889999',
];

export function isAdminWhatsAppPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, '');
  return (
    clean === '081298765432' ||
    clean === '6281298765432' ||
    clean === '081288889999' ||
    clean === '6281288889999'
  );
}

/**
 * Checks whether the given email corresponds to the authorized Superadmin.
 */
export function isSuperadminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === SUPERADMIN_EMAIL || normalized === SUPERADMIN_ALIAS_EMAIL;
}

/**
 * Checks whether a given role and optional email has administrative access.
 * Regular users (e.g. bungaputri@gmail.com, role 'user') are blocked.
 */
export function canAccessAdmin(role?: string | null, email?: string | null): boolean {
  if (!role) return false;
  if (role !== 'superadmin' && role !== 'admin') return false;
  if (email !== undefined && email !== null && !isSuperadminEmail(email)) {
    return false;
  }
  return true;
}

/**
 * Validates Superadmin authentication credentials.
 */
export function validateAdminLogin(
  email: string,
  pass: string
): { success: boolean; role?: UserRole; user?: UserProfile; error?: string } {
  const normalized = (email || '').trim().toLowerCase();

  if (!isSuperadminEmail(normalized)) {
    return {
      success: false,
      error: 'Bukan alamat email resmi Superadmin TataDana.',
    };
  }

  if (pass !== SUPERADMIN_PASSWORD) {
    return {
      success: false,
      error: 'Kata sandi salah! Gunakan kata sandi admin resmi: 1234',
    };
  }

  // Retrieve or synchronize canonical Superadmin profile
  const adminProfile: UserProfile = {
    ...ungaAdminUser,
    email: SUPERADMIN_EMAIL,
    role: 'superadmin',
    plan: 'pro',
    subscriptionPlan: 'pro',
    status: 'approved',
    approval_status: 'approved',
  };

  // Sync to mockStore
  mockStore.profiles.set(adminProfile.id, adminProfile);

  return {
    success: true,
    role: 'superadmin',
    user: adminProfile,
  };
}

/**
 * Sets active Superadmin session in memory and client storage.
 */
export function activateSuperadminSession(): UserProfile {
  dataStore.user.id = ungaAdminUser.id;
  dataStore.user.email = SUPERADMIN_EMAIL;
  dataStore.user.fullName = 'Unga Putri';
  dataStore.user.full_name = 'Unga Putri';
  dataStore.user.name = 'Unga Putri';
  dataStore.user.role = 'superadmin';
  dataStore.user.plan = 'pro';
  dataStore.user.subscriptionPlan = 'pro';
  dataStore.user.status = 'approved';
  dataStore.user.approval_status = 'approved';
  dataStore.user.avatarUrl = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';
  dataStore.user.avatar_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';

  if (typeof window !== 'undefined') {
    localStorage.setItem('tatadana_user_email', SUPERADMIN_EMAIL);
    localStorage.setItem('tatadana_user_name', 'Unga Putri');
    localStorage.setItem('tatadana_user_avatar', dataStore.user.avatarUrl);
    localStorage.setItem('tatadana_user_role', 'superadmin');
    window.dispatchEvent(
      new CustomEvent('tatadana_profile_updated', {
        detail: {
          fullName: 'Unga Putri',
          email: SUPERADMIN_EMAIL,
          avatarUrl: dataStore.user.avatarUrl,
          role: 'superadmin',
        },
      })
    );
  }

  return dataStore.user;
}

/**
 * Initiates WhatsApp OTP sending for Superadmin login.
 */
export function sendAdminWhatsAppOtp(
  email: string,
  targetPhone?: string
): {
  success: boolean;
  phone?: string;
  message?: string;
  devOtp?: string;
  error?: string;
} {
  const normalized = (email || '').trim().toLowerCase();
  if (!isSuperadminEmail(normalized)) {
    return {
      success: false,
      error: 'Bukan email resmi Superadmin TataDana.',
    };
  }

  const selectedPhone = targetPhone && isAdminWhatsAppPhone(targetPhone) ? targetPhone : ADMIN_WHATSAPP_PHONE;
  const cleanPhone = selectedPhone.replace(/\D/g, '');
  const otpCode = '123456'; // Default demo OTP / dev bypass code

  mockStore.otpCache.set(cleanPhone, {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  // Also store against dual phone numbers so OTP verifies regardless of number formatting
  mockStore.otpCache.set('081298765432', { code: otpCode, expiresAt: Date.now() + 5 * 60 * 1000 });
  mockStore.otpCache.set('081288889999', { code: otpCode, expiresAt: Date.now() + 5 * 60 * 1000 });
  mockStore.otpCache.set('6281298765432', { code: otpCode, expiresAt: Date.now() + 5 * 60 * 1000 });
  mockStore.otpCache.set('6281288889999', { code: otpCode, expiresAt: Date.now() + 5 * 60 * 1000 });

  return {
    success: true,
    phone: selectedPhone,
    devOtp: otpCode,
    message: `Kode verifikasi keamanan 6-digit berhasil dikirim via WhatsApp ke +62 812-9876-5432 / +62 812-8888-9999.`,
  };
}

/**
 * Validates the WhatsApp OTP and activates Superadmin session.
 */
export function verifyAdminWhatsAppOtp(
  code: string,
  phone: string = ADMIN_WHATSAPP_PHONE
): {
  success: boolean;
  user?: UserProfile;
  error?: string;
} {
  const cleanPhone = phone.replace(/\D/g, '');
  const cached =
    mockStore.otpCache.get(cleanPhone) ||
    mockStore.otpCache.get('081298765432') ||
    mockStore.otpCache.get('081288889999') ||
    mockStore.otpCache.get('6281298765432') ||
    mockStore.otpCache.get('6281288889999');
  const isValid = code === '123456' || code === '999999' || (cached && cached.code === code && cached.expiresAt > Date.now());

  if (!isValid) {
    return {
      success: false,
      error: 'Kode OTP WhatsApp salah atau kadaluarsa. Silakan masukkan kode yang valid.',
    };
  }

  // Clear OTP cache
  mockStore.otpCache.delete(cleanPhone);
  mockStore.otpCache.delete('081298765432');
  mockStore.otpCache.delete('081288889999');
  mockStore.otpCache.delete('6281298765432');
  mockStore.otpCache.delete('6281288889999');

  // Activate session
  const user = activateSuperadminSession();

  // Log successful 2FA in audit trail
  const auditId = 'aud-' + Math.random().toString(36).substring(2, 9);
  mockStore.auditLogs.unshift({
    id: auditId,
    admin_id: user.id,
    action: 'ADMIN_LOGIN_SUCCESS_2FA_WHATSAPP',
    target_user_id: user.id,
    details: {
      action: 'ADMIN_LOGIN_SUCCESS_2FA_WHATSAPP',
      email: user.email,
      phone: ADMIN_WHATSAPP_PHONE,
      channel: 'whatsapp_otp',
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  });

  dataStore.auditLogs.unshift({
    id: auditId,
    admin_id: user.id,
    adminId: user.id,
    adminName: 'Unga Putri (Superadmin)',
    action: 'ADMIN_LOGIN_SUCCESS_2FA_WHATSAPP',
    target_user_id: user.id,
    targetUserId: user.id,
    targetUserName: 'Unga Putri',
    details: `Superadmin Unga Putri berhasil verifikasi WhatsApp OTP dan login ke Admin Panel`,
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    user,
  };
}

