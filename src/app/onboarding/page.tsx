'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Send, CheckCircle2, ArrowRight, Bot, Wallet, Target } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface RecommendedCat {
  name: string;
  emoji: string;
  color: string;
  type: 'expense' | 'income';
}

export default function OnboardingPage() {
  const router = useRouter();
  const [profession, setProfession] = useState('karyawan');
  const [lifestyle, setLifestyle] = useState('kuliner_ngopi');
  const [savingsGoal, setSavingsGoal] = useState('dana_darurat');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<RecommendedCat[]>([
    { name: 'Makanan & Kuliner', emoji: '🍜', color: '#2563EB', type: 'expense' },
    { name: 'Transportasi Harian', emoji: '🚗', color: '#3B82F6', type: 'expense' },
    { name: 'Kopi & Hiburan', emoji: '☕', color: '#8B5CF6', type: 'expense' },
    { name: 'Tagihan & Kos/Rumah', emoji: '🏠', color: '#EF4444', type: 'expense' },
    { name: 'Kesehatan & Gym', emoji: '💊', color: '#10B981', type: 'expense' },
    { name: 'Belanja & Outfit', emoji: '👕', color: '#EC4899', type: 'expense' },
    { name: 'Gaji Bulanan', emoji: '💼', color: '#10B981', type: 'income' },
    { name: 'Side Hustle / Freelance', emoji: '💰', color: '#00D2FF', type: 'income' },
  ]);

  const handleGenerateAI = async () => {
    setLoading(true);
    // Simulate smart tailored AI recommendation based on user's profile
    setTimeout(() => {
      let dynamicCats: RecommendedCat[] = [];
      if (profession === 'mahasiswa') {
        dynamicCats = [
          { name: 'Uang Saku & Kiriman', emoji: '🎓', color: '#10B981', type: 'income' },
          { name: 'Makan & Warteg', emoji: '🍜', color: '#2563EB', type: 'expense' },
          { name: 'Buku & Kuliah', emoji: '📚', color: '#6366F1', type: 'expense' },
          { name: 'Kos & Listrik', emoji: '🏠', color: '#EF4444', type: 'expense' },
          { name: 'Nongkrong & Ngopi', emoji: '☕', color: '#8B5CF6', type: 'expense' },
          { name: 'Transport & Bensin', emoji: '🛵', color: '#3B82F6', type: 'expense' },
          { name: 'Tabungan Magang', emoji: '🪙', color: '#00D2FF', type: 'income' },
        ];
      } else if (profession === 'freelancer') {
        dynamicCats = [
          { name: 'Honor Klien & Project', emoji: '💼', color: '#10B981', type: 'income' },
          { name: 'Software & Cloud Tools', emoji: '💻', color: '#6366F1', type: 'expense' },
          { name: 'Coffee Shop & Coworking', emoji: '☕', color: '#2563EB', type: 'expense' },
          { name: 'Pajak & BPJS Mandiri', emoji: '📑', color: '#EF4444', type: 'expense' },
          { name: 'Internet & Gadget', emoji: '⚡', color: '#3B82F6', type: 'expense' },
          { name: 'Kebutuhan Rumah', emoji: '🛒', color: '#EC4899', type: 'expense' },
          { name: 'Investasi Portofolio', emoji: '📈', color: '#10B981', type: 'expense' },
        ];
      } else {
        dynamicCats = [
          { name: 'Gaji UMK / Bulanan', emoji: '💼', color: '#10B981', type: 'income' },
          { name: 'Makan & Kebutuhan Pokok', emoji: '🍜', color: '#2563EB', type: 'expense' },
          { name: 'Cicilan & Tagihan Rutin', emoji: '🏠', color: '#EF4444', type: 'expense' },
          { name: 'Bensin & Commuter Line', emoji: '🚗', color: '#3B82F6', type: 'expense' },
          { name: 'Family & Orang Tua', emoji: '❤️', color: '#EC4899', type: 'expense' },
          { name: 'Dana Darurat & Investasi', emoji: '🛡️', color: '#10B981', type: 'expense' },
          { name: 'Self Reward Akhir Bulan', emoji: '🎮', color: '#8B5CF6', type: 'expense' },
        ];
      }
      setCategories(dynamicCats);
      setLoading(false);
    }, 700);
  };

  const handleCompleteOnboarding = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] p-6 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full pt-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-8 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              Tata<span className="text-cyan-400">Dana</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-cyan-400 font-mono bg-blue-950/80 px-3 py-1 rounded-full border border-cyan-800/60 font-bold">
              Step 1 of 1: AI Onboarding
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center my-8 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-cyan-800/60 text-cyan-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Personalisasi AI Kategori Finansial
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ceritakan Sedikit Profil Finansialmu
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Tata AI akan langsung menyusun struktur kategori dan dompet yang paling cocok dengan gaya hidupmu di Indonesia.
          </p>
        </div>

        {/* Input Question Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
            <label className="text-xs font-bold text-slate-300 block">Profesi / Status Utama</label>
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="w-full bg-[#131B2E] border border-slate-700 text-white text-xs rounded-xl p-2.5 outline-none focus:border-cyan-400 font-medium"
            >
              <option value="karyawan">👔 Karyawan Swasta / BUMN</option>
              <option value="freelancer">💻 Freelancer / Kontraktor</option>
              <option value="mahasiswa">🎓 Mahasiswa / Pelajar</option>
              <option value="pebisnis">🏪 Wirausaha / Bisnis</option>
            </select>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
            <label className="text-xs font-bold text-slate-300 block">Fokus Pengeluaran Harian</label>
            <select
              value={lifestyle}
              onChange={(e) => setLifestyle(e.target.value)}
              className="w-full bg-[#131B2E] border border-slate-700 text-white text-xs rounded-xl p-2.5 outline-none focus:border-cyan-400 font-medium"
            >
              <option value="kuliner_ngopi">☕ Kuliner & Ngopi Harian</option>
              <option value="keluarga_cicilan">🏠 Rumah Tangga & Cicilan</option>
              <option value="investasi_hemat">🛡️ Frugal Living & Investasi</option>
            </select>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
            <label className="text-xs font-bold text-slate-300 block">Target Finansial Terdekat</label>
            <select
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
              className="w-full bg-[#131B2E] border border-slate-700 text-white text-xs rounded-xl p-2.5 outline-none focus:border-cyan-400 font-medium"
            >
              <option value="dana_darurat">🛡️ Kumpulkan Dana Darurat 3x Gaji</option>
              <option value="bebas_utang">💳 Kurangi Pengeluaran Impulsif</option>
              <option value="liburan_invest">🎆 Liburan & Dana Investasi</option>
            </select>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerateAI}
            disabled={loading}
            className="bg-[#0F172A] hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            {loading ? 'AI sedang meracik kategori...' : 'Perbarui Rekomendasi AI Sesuai Pilihan'}
          </button>
        </div>

        {/* AI Output Preview Card */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h2 className="text-sm font-bold text-white">Rekomendasi AI Kategori Kamu</h2>
              <span className="text-[10px] bg-blue-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800/60 font-bold">
                Siap Dipakai di Telegram (@ungakeuanganbot)
              </span>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{categories.length} Kategori Dibuat</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map((c, i) => (
              <div
                key={i}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3 flex items-center gap-2.5 transition-all shadow-sm"
              >
                <span className="text-xl">{c.emoji}</span>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">{c.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">{c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-950/60 via-[#0F172A] to-[#0F172A] border border-cyan-800/50 rounded-2xl shadow-xl">
          <div className="text-xs text-slate-300 font-medium">
            ✅ Dompet default (BCA, Mandiri, GoPay, OVO, Dompet Tunai) dan batas budget bulanan otomatis diaktifkan untuk akunmu.
          </div>
          <button
            onClick={handleCompleteOnboarding}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            Masuk ke Dashboard Sekarang
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 mt-8">
        &copy; 2026 TataDana • Sistem rekomendasi AI aktif
      </div>
    </div>
  );
}
