'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 600);
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

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Lupa Kata Sandi?</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Masukkan alamat email kamu yang terdaftar untuk menerima tautan pemulihan kata sandi.
        </p>

        {submitted ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Tautan Pemulihan Terkirim
            </div>
            <p className="text-slate-300">
              Kami telah mengirimkan instruksi reset kata sandi ke <b>{email}</b>. Periksa kotak masuk atau folder spam Anda.
            </p>
            <div className="pt-3">
              <Link href="/auth/login" className="text-cyan-400 font-semibold hover:underline block">
                Kembali ke Login →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Alamat Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@example.com"
                  className="w-full bg-[#131B2E] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Mengirim...' : 'Kirim Tautan Pemulihan'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-400">
          <Link href="/auth/login" className="text-cyan-400 hover:underline font-semibold">
            ← Kembali ke halaman login
          </Link>
        </div>
      </div>
    </div>
  );
}
