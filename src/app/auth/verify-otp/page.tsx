'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, Phone, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !otpCode) {
      setErrorMsg('Masukkan nomor HP dan kode OTP.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phoneNumber, code: otpCode })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessMsg('Nomor HP berhasil diverifikasi!');
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        setErrorMsg(data.error || 'Verifikasi gagal. Pastikan kode benar.');
      }
    } catch {
      setErrorMsg('Terjadi gangguan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090D16] text-[#F8FAFC] p-4">
      <div className="max-w-md w-full bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
              <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Tata<span className="text-cyan-400">Dana</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Verifikasi OTP Nomor HP</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Verifikasi nomor telepon kamu untuk menghubungkan akun secara aman dengan bot Telegram TataDana (@ungakeuanganbot).
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nomor WhatsApp / HP</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="081234567890"
                className="w-full bg-[#131B2E] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">6 Digit Kode OTP</label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              className="w-full bg-[#131B2E] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-3 text-center tracking-widest font-mono text-lg text-white placeholder-slate-500 outline-none shadow-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">Gunakan kode uji coba: <code className="text-cyan-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">123456</code></p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Verifikasi Sekarang'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          <Link href="/auth/login" className="text-cyan-400 hover:underline font-semibold">
            ← Kembali ke halaman login
          </Link>
        </div>
      </div>
    </div>
  );
}
