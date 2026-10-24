import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Nomor HP wajib diisi' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      return NextResponse.json({ error: 'Format nomor HP tidak valid' }, { status: 400 });
    }

    const isDevBypass = process.env.NEXT_PUBLIC_DEV_OTP_BYPASS === 'true';
    const otpCode = isDevBypass ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // Cache OTP with 5 minute expiration
    mockStore.otpCache.set(cleanPhone, {
      code: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`[OTP] Sent OTP to ${cleanPhone}: ${otpCode} (Bypass mode: ${isDevBypass})`);

    return NextResponse.json({
      success: true,
      message: isDevBypass
        ? 'Kode OTP sandbox: 123456 (Mode Dev Bypass Aktif)'
        : 'Kode OTP telah dikirim ke nomor WhatsApp/SMS kamu',
      isDevBypass,
      devOtp: isDevBypass ? '123456' : undefined,
    });
  } catch (error) {
    console.error('OTP Send Error:', error);
    return NextResponse.json({ error: 'Gagal mengirim kode OTP' }, { status: 500 });
  }
}
