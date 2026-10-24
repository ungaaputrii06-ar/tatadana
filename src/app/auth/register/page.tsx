'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, Lock, Mail, Phone, User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { dataStore } from '@/lib/storage-mock';

export default function AuthRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phoneNumber) {
      setErrorMsg('Lengkapi data nama lengkap dan nomor telepon/WhatsApp.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phoneNumber })
      });
      const data = await res.json();
      if (data.ok) {
        setStep('otp');
      } else {
        setErrorMsg(data.error || 'Gagal mengirim OTP.');
      }
    } catch {
      setErrorMsg('Gagal mengirimkan kode OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          phoneNumber,
          code: otpCode,
          fullName,
          email,
          password
        })
      });
      const data = await res.json();
      if (data.ok) {
        // Automatic setup and recording in dataStore
        const userId = data.user?.id || 'usr_' + Date.now();
        dataStore.registerUser({
          id: userId,
          full_name: fullName,
          fullName,
          name: fullName,
          email: email || undefined,
          phone_number: phoneNumber,
          phoneNumber,
          plan: 'starter',
          status: 'approved',
          approval_status: 'approved',
          is_phone_verified: true,
          phoneVerified: true,
          whatsapp_verified: true,
          is_whatsapp_verified: true,
        });

        dataStore.user.id = userId;
        dataStore.user.fullName = fullName;
        dataStore.user.full_name = fullName;
        dataStore.user.name = fullName;
        dataStore.user.email = email;
        dataStore.user.phoneNumber = phoneNumber;
        dataStore.user.phone_number = phoneNumber;
        dataStore.user.phoneVerified = true;
        dataStore.user.is_phone_verified = true;
        dataStore.user.whatsapp_verified = true;
        dataStore.user.is_whatsapp_verified = true;
        dataStore.user.role = 'user';
        dataStore.user.plan = 'starter';

        if (typeof window !== 'undefined') {
          localStorage.setItem('tatadana_user_id', userId);
          localStorage.setItem('tatadana_user_name', fullName);
          if (email) localStorage.setItem('tatadana_user_email', email);
          localStorage.setItem('tatadana_user_phone', phoneNumber);
          localStorage.setItem('tatadana_user_role', 'user');
          window.dispatchEvent(new CustomEvent('tatadana_profile_updated', {
            detail: { fullName, email: email || 'user@tatadana.app', role: 'user' }
          }));
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }

        // Redirect to AI Category Onboarding
        router.push('/onboarding');
      } else {
        setErrorMsg(data.error || 'Kode OTP WhatsApp tidak sesuai.');
      }
    } catch {
      setErrorMsg('Verifikasi WhatsApp gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#090D16] text-[#F8FAFC]">
      {/* KIRI: 40% Branding Panel (Desktop Only - Part 8) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#070A10] via-[#0B0F19] to-blue-950/40 p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              Tata<span className="text-cyan-400">Dana</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-cyan-800/60 text-cyan-400 text-xs font-bold">
            ✨ Mulai Gratis Dalam 2 Menit
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Ucapkan Selamat Tinggal<br />
            <span className="text-gradient-blue">
              Pada Gaji Numpang Lewat.
            </span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Gabung dengan ribuan profesional muda, freelancer, dan mahasiswa yang telah mengendalikan arus kas finansial mereka via Telegram Bot & Web App.
          </p>

          <div className="pt-6 space-y-3">
            {[
              'Verifikasi OTP nomor HP sebagai kunci bot Telegram (@ungakeuanganbot)',
              'Rekomendasi kategori pintar otomatis dari AI',
              'Dompet default langsung siap pakai',
              'Tanpa biaya tersembunyi — mulai dengan Starter gratis',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          &copy; 2026 TataDana Indonesia • Solusi Fintech Cerdas
        </div>
      </div>

      {/* KANAN: 60% Form Panel */}
      <div className="w-full lg:w-7/12 flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative bg-[#090D16]">
        <div className="flex justify-between items-center">
          <div className="lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center font-bold">
                <Send className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white">TataDana</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {step === 'form' ? 'Buat Akun TataDana' : 'Verifikasi Nomor WhatsApp'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              {step === 'form'
                ? 'Daftar sekarang. Akun wajib memverifikasi nomor WhatsApp sebelum aktivasi penuh.'
                : `Masukkan 6-digit kode OTP yang kami kirimkan via WhatsApp ke ${phoneNumber}`}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Budi Santoso"
                    className="w-full bg-[#0F172A] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor WhatsApp Aktif (Wajib Diverifikasi via OTP)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="081234567890"
                    className="w-full bg-[#0F172A] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pengguna wajib memverifikasi nomor ini lewat WhatsApp OTP. Akun langsung tercatat di Admin Panel.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alamat Email (Opsional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@example.com"
                    className="w-full bg-[#0F172A] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full bg-[#0F172A] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Mengirim OTP WhatsApp...' : 'Lanjut Verifikasi OTP WhatsApp'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndComplete} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/60 border border-cyan-800/60 text-cyan-300 text-xs flex justify-between items-center">
                <span>OTP WhatsApp dikirim ke: <b>{phoneNumber}</b></span>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-cyan-400 font-semibold hover:underline text-[11px]"
                >
                  Ubah
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Masukkan 6 Digit Kode OTP WhatsApp
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-[#0F172A] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-3.5 text-center tracking-widest font-mono text-xl text-white placeholder-slate-500 outline-none shadow-xs"
                />
                <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
                  <span>Demo kode OTP WhatsApp: <code className="text-cyan-400 font-bold bg-slate-950 px-1 py-0.5 rounded border border-slate-800">123456</code></span>
                  <button
                    type="button"
                    onClick={() => {
                      fetch('/api/auth/otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'send', phoneNumber })
                      });
                    }}
                    className="text-cyan-400 font-semibold hover:underline"
                  >
                    Kirim Ulang
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 4}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Selesaikan Pendaftaran & Verifikasi WhatsApp'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-400">
            Sudah punya akun?{' '}
            <Link href="/auth/login" className="text-cyan-400 font-semibold hover:underline">
              Masuk di sini
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Dengan mendaftar, kamu menyetujui Ketentuan Layanan dan Kebijakan Privasi TataDana.
        </div>
      </div>
    </div>
  );
}
