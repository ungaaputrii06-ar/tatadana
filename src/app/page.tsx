'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Send,
  Sparkles,
  Bot,
  Play,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Zap,
  ChevronDown,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Lock
} from 'lucide-react';
import TelegramSimulatorModal from '@/components/TelegramSimulatorModal';

export default function LandingPage() {
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'lifetime'>('lifetime');
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // FAQ Items (Minimal 7 butir sesuai Part 7)
  const faqs = [
    {
      q: 'Bagaimana cara TataDana mengenali saya di Telegram?',
      a: 'TataDana terhubung langsung dengan bot Telegram resmi kami (@keuanganunga_bot — "tatadana_unga"). Saat Anda mendaftar di web, nomor HP yang Anda verifikasi via OTP akan ditautkan ke akun Telegram Anda sehingga semua chat langsung tercatat ke dompet pribadi Anda.'
    },
    {
      q: 'Apakah bisa pakai fitur foto struk di paket Starter?',
      a: 'Tidak bisa. Fitur ekstraksi foto struk menggunakan AI Vision OCR hanya tersedia secara eksklusif untuk pengguna paket Pro (Rp99.000 Sekali Bayar). Pada paket Starter, Anda tetap bisa mencatat transaksi menggunakan teks bahasa natural dan Voice Note.'
    },
    {
      q: 'Bagaimana keamanan data transaksi keuangan saya di TataDana?',
      a: 'Keamanan adalah prioritas utama kami. Seluruh data disimpan dan diproses secara aman di infrastruktur Supabase PostgreSQL dengan Row-Level Security (RLS) dan enkripsi pgcrypto. Token bot Anda dienkripsi, dan akses data oleh admin diawasi ketat lewat audit log.'
    },
    {
      q: 'Apakah ada batasan jumlah transaksi per bulan?',
      a: 'Untuk paket Starter, kuota transaksi adalah maksimal 50 transaksi per bulan. Untuk paket Pro, Anda mendapatkan kuota UNLIMITED transaksi selamanya tanpa batas bulanan.'
    },
    {
      q: 'Apakah format nominal "15rb", "500k", "1.5jt" bisa langsung dipahami bot?',
      a: 'Ya, 100%! Engine parsing LLM TataDana dilatih khusus untuk memahami format penulisan angka dan bahasa sehari-hari orang Indonesia. Bot secara otomatis mengonversi "15rb" menjadi Rp15.000 dan "1.5jt" menjadi Rp1.500.000.'
    },
    {
      q: 'Metode pembayaran apa saja yang didukung untuk upgrade ke Pro?',
      a: 'Kami menggunakan payment gateway Midtrans yang mendukung QRIS (GoPay, OVO, ShopeePay, DANA), Transfer Bank Virtual Account (BCA, Mandiri, BNI, BRI), serta opsi transfer manual dengan approval langsung dari admin dashboard.'
    },
    {
      q: 'Bisa ekspor laporan ke format apa saja?',
      a: 'Pengguna paket Pro dapat mengekspor laporan keuangan on-demand ke format PDF resmi dan spreadsheet Excel (.xlsx) dengan filter periode custom kapan saja.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col selection:bg-blue-600 selection:text-white">
      {/* 1. NAVBAR (Sticky - Part 7) */}
      <Navbar />

      <main className="flex-1">
        {/* 2 & 3 & 4. HERO SECTION */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-[#090D16] border-b border-slate-800/80">
          {/* Ambient Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
            {/* 2. Pre-headline badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/60 border border-cyan-500/30 text-cyan-400 text-xs sm:text-sm font-bold tracking-wide shadow-lg shadow-blue-500/10">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>✨ Catat keuangan semudah kirim chat ke Telegram</span>
            </div>

            {/* 3. Headline (H1) with gradient blue */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Gaji habis sebelum akhir bulan? <br className="hidden sm:inline" />
              <span className="text-gradient-blue">
                Sudah saatnya kamu tahu ke mana uangmu pergi.
              </span>
            </h1>

            {/* 4. Sub-headline */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              TataDana mencatat setiap pengeluaranmu langsung dari chat Telegram atau foto struk — laporan, dompet, dan evaluasi anggaran tersusun otomatis.
            </p>

            {/* 6. CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Mulai Gratis Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/auth/login?demo=bunga"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 hover:border-cyan-500/60 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Masuk Demo (Bunga Putri)
              </Link>
            </div>

            {/* Direct Login Demo Card (Bunga Putri - bungaputri@gmail.com / admin1234) */}
            <div className="pt-3 max-w-lg mx-auto">
              <Link
                href="/auth/login?demo=bunga"
                className="group p-3.5 rounded-2xl bg-[#0F172A] border border-slate-800 hover:border-cyan-500/60 transition-all flex items-center justify-between shadow-xl hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3 text-left">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                    alt="Bunga Putri"
                    className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400 shadow-sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Akses Cepat Akun Demo Bunga Putri
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/60">
                        PRO LIFETIME
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Email: <b className="text-slate-200">bungaputri@gmail.com</b> • Sandi: <code className="text-cyan-400 bg-slate-950 px-1 py-0.5 rounded font-mono font-bold">admin1234</code>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1 shrink-0">
                  Masuk <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </div>

            {/* 5. Hero section video placeholder (clearly marked) */}
            {/* // TODO: ganti dengan video asli presentasi produk TataDana setelah video selesai diproduksi */}
            <div className="pt-10 max-w-3xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0B0F19] shadow-2xl group cursor-pointer aspect-video flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop"
                  alt="TataDana Dashboard Demo"
                  className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide">
                    Tonton Demo 60 Detik (Placeholder Video)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7 & 8. BULLET POINT MASALAH USER & TRANSISI SOLUSI */}
        <section className="py-16 bg-[#0B0F19] border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-blue-950/60 px-3 py-1 rounded-full border border-cyan-800/60">Pernah Merasakan Ini?</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white pt-2">
                Kenapa aplikasi keuangan konvensional sering ditinggalkan?
              </h2>
            </div>

            {/* 3 Problem Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-rose-950/50 text-rose-400 flex items-center justify-center font-bold text-lg border border-rose-800/50">
                  😓
                </div>
                <h3 className="font-bold text-base text-white">
                  "Buka aplikasi keuangan? Nanti dulu deh..."
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Aplikasi ribet dengan puluhan tombol dan dropdown bikin malas mencatat. Akhirnya struk menumpuk dan dilupakan.
                </p>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-950/50 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-800/50">
                  💸
                </div>
                <h3 className="font-bold text-base text-white">
                  "Kok uangnya habis ya? Padahal kayak tidak beli apa-apa"
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Pengeluaran receh seperti kopi, parkir, dan jajan kecil tak pernah tercatat tapi menguras saldo bulanan secara diam-diam.
                </p>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-950/50 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-800/50">
                  🎯
                </div>
                <h3 className="font-bold text-base text-white">
                  "Udah niat bikin budget, tapi seminggu lupa"
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Budget yang tidak dipantau secara otomatis sama saja dengan tidak ada budget. Anda baru sadar saat saldo rekening sudah menipis.
                </p>
              </div>
            </div>

            {/* Solusi dari bullet point — transisi */}
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-4">
              <p className="text-sm sm:text-base font-semibold text-cyan-400">
                Bagaimana kalau mencatat keuangan semudah kirim pesan ke teman?
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Solusinya: <span className="text-gradient-blue">TataDana</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Cukup buka Telegram yang sudah ada di ponselmu, ketik "beli bakso 15rb", dan bot resmi kami yang merapikannya ke dashboard laporan keuanganmu.
              </p>
            </div>
          </div>
        </section>

        {/* 9. INTERACTIVE DASHBOARD & TELEGRAM CHAT PREVIEW (ID #demo) */}
        <section id="demo" className="py-20 bg-[#090D16]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-blue-950/60 px-3 py-1 rounded-full border border-cyan-800/60">Simulasi Interaktif</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white pt-2">
                Format balasan asli Telegram Bot kami
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Pesan langsung tercatat dengan nominal WIB, status budget, dan progress bar otomatis.
              </p>
            </div>

            {/* Interactive Preview Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Kiri: Chat Telegram Phone Preview (5 cols) */}
              <div className="lg:col-span-5 max-w-sm mx-auto w-full">
                <div className="bg-[#0E1621] border-2 border-cyan-500/50 rounded-3xl p-4 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          Tata dana bunga <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        </div>
                        <div className="text-[10px] text-slate-400">@keuanganunga_bot</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsBotModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-blue-950 text-cyan-400 hover:bg-blue-900 border border-cyan-800/60 text-xs font-bold transition-colors"
                    >
                      Buka Simulator 💬
                    </button>
                  </div>

                  {/* Sample Chat Bubble */}
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl rounded-br-none px-3.5 py-2 font-semibold shadow-md">
                        beli bakso 15rb
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="bg-[#182533] border border-slate-700/80 text-slate-100 rounded-2xl rounded-bl-none p-3.5 font-mono text-[11px] leading-relaxed shadow-lg">
                        📅 Sabtu, 17 Okt 2026 — 16:40 WIB<br />
                        💸 <b className="text-cyan-400">Pengeluaran tercatat!</b><br />
                        ├ Nominal : Rp15.000<br />
                        ├ Kategori : 🍜 Makanan & Minuman<br />
                        ├ Dompet : 👛 BCA Prioritas<br />
                        ├ Catatan : beli bakso 15rb<br />
                        └ Saldo : Rp14.235.000<br /><br />
                        📊 <b className="text-white">Budget Makanan bulan ini:</b><br />
                        [██████░░░░] 61% — sisa Rp1.150.000<br />
                        <span className="text-emerald-400">👍 Pengeluaran masih dalam batas aman.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kanan: Dashboard Sneak Peek (7 cols) */}
              <div className="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-slate-400 ml-2">tatadana.app/dashboard</span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="text-xs text-cyan-400 hover:underline font-bold"
                  >
                    Buka Dashboard Penuh →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#131B2E] rounded-xl border border-slate-800 shadow-sm">
                    <span className="text-[11px] text-slate-400 font-medium">Saldo Total</span>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">Rp 14.235.000</div>
                  </div>
                  <div className="p-3.5 bg-[#131B2E] rounded-xl border border-slate-800 shadow-sm">
                    <span className="text-[11px] text-slate-400 font-medium">Budget Tersisa</span>
                    <div className="text-base sm:text-lg font-bold text-cyan-400 mt-0.5">Rp 1.150.000</div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#131B2E] rounded-xl border border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Transaksi Terakhir Masuk</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">● Sinkron Realtime</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍜</span>
                      <span className="text-white font-medium">beli bakso 15rb</span>
                    </div>
                    <span className="font-bold text-rose-400">- Rp 15.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10. FITUR SECTION (3 Alternating Layouts - Part 7) */}
        <section id="fitur" className="py-20 bg-[#0B0F19] border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
            {/* Fitur 1: Catat via Telegram (Teks & Foto Struk) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-blue-950/60 px-3 py-1 rounded-full border border-cyan-800/60">Fitur 01</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Catat Cepat via Chat, Voice Note, atau Foto Struk
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Tidak perlu ketik nominal satu per satu. Cukup ketik kalimat natural seperti "bensin 50k", kirim rekaman suara (VN), atau foto struk belanjaanmu. AI kami langsung mengekstrak item dan harganya secara akurat.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Parsing LLM mengenali slang Indonesia ("15rb", "500k", "1.5jt")</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>AI Vision OCR mengekstrak struk multi-item belanjaan (Pro)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Transkrip Voice Note otomatis sebelum dicatat</span>
                  </li>
                </ul>
              </div>
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-950 text-cyan-400 flex items-center justify-center shadow-md border border-cyan-800/40">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="text-base font-bold text-white">1 Bot Resmi untuk Seluruh Pengeluaranmu</div>
                  <div className="text-xs text-slate-400">Buka Telegram kapan saja & ketik transaksimu langsung</div>
                </div>
              </div>
            </div>

            {/* Fitur 2: Laporan & Export Otomatis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="order-2 md:order-1 bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-950 text-cyan-400 flex items-center justify-center shadow-md border border-cyan-800/40">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="text-base font-bold text-white">Laporan PDF & Excel On-Demand</div>
                  <div className="text-xs text-slate-400">Unduh arsip laporan terverifikasi dengan signed URL</div>
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-blue-950/60 px-3 py-1 rounded-full border border-cyan-800/60">Fitur 02</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Laporan Lengkap & Ekspor Langsung di Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Lupakan rekap manual tiap akhir bulan. TataDana menyediakan tabel laporan lengkap dengan filter kategori, rentang tanggal (1 hari, 7 hari, 1 bulan), search, dan tombol export instan ke format PDF dan Excel (.xlsx).
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Tabel transaksi dinamis dengan rincian multi-item yang bisa di-expand</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Download PDF & Excel sekali klik tanpa batasan (Pro)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Riwayat export tersimpan aman di Supabase Storage</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Fitur 3: AI Financial Advisor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-blue-950/60 px-3 py-1 rounded-full border border-cyan-800/60">Fitur 03</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  AI Financial Advisor Proaktif di Chat Telegram
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Bukan sekadar bot pencatat, TataDana memiliki Advisor keuangan pintar yang memantau kebiasaan belanjamu dan memberi peringatan proaktif jika ada lonjakan pengeluaran.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Peringatan otomatis saat pengeluaran kategori naik &gt;50%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Alert saat total belanja sudah menyentuh 80% dari plafon bulanan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Saran hemat yang actionable dan disesuaikan dengan pola hidupmu</span>
                  </li>
                </ul>
              </div>
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-950 text-cyan-400 flex items-center justify-center shadow-md border border-cyan-800/40">
                  <Zap className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="text-base font-bold text-white">Personal AI Wealth Coach</div>
                  <div className="text-xs text-slate-400">Siap mendampingimu mencapai target bebas finansial</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11. TESTIMONI (Masonry Grid - Placeholder clearly marked) */}
        {/* // TODO: ganti dengan testimoni asli setelah beta user selesai onboarding */}
        <section className="py-20 bg-[#090D16]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Testimoni Pengguna</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Dipercaya oleh Karyawan & Freelancer di Seluruh Indonesia
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                (Komentar awal dari program pengujian tertutup TataDana)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  "Dulu gaji UMK Jakarta selalu ludes tanggal 20. Sekarang tiap habis beli makan siang langsung ketik di Telegram, bot-nya langsung ingetin sisa budget. Sangat ngebantu!"
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-blue-950 text-cyan-400 font-bold flex items-center justify-center text-xs border border-cyan-800/60">
                    R
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Rian Prasetya</div>
                    <div className="text-[10px] text-slate-400">Karyawan Swasta, Jakarta</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  "Fitur foto struk di paket Pro beneran hemat waktu. Belanja bulanan di minimarket tinggal difoto, bot langsung pecah itemnya rapi di dashboard."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-xs border border-cyan-800/60">
                    A
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Amalia Safitri</div>
                    <div className="text-[10px] text-slate-400">Freelance Designer, Bandung</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  "Yang paling saya suka adalah format reply bot-nya yang rapi pakai progress bar dan jam WIB. Nggak perlu buka app berat-berat lagi."
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-800/60">
                    D
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Dimas Anggara</div>
                    <div className="text-[10px] text-slate-400">Mahasiswa, Surabaya</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 12. PRICING SECTION (Starter vs Pro - Part 6 & 7) */}
        <section id="harga" className="py-20 bg-[#0B0F19] border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-blue-950/60 px-3 py-1 rounded-full border border-cyan-800/60">Pilihan Paket Langganan</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white pt-2">
                Harga Transparan Tanpa Biaya Tersembunyi
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Pilih paket yang paling sesuai dengan kebutuhan pencatatan keuanganmu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* STARTER PLAN */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-7 space-y-6 flex flex-col justify-between shadow-xl">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Starter</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Cocok untuk mahasiswa dan yang baru mulai belajar mencatat.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">Rp 49.000</span>
                    <span className="text-xs text-slate-400">/ bulan</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Catat transaksi via teks Telegram</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Dashboard web lengkap</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Maksimal 50 transaksi / bulan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Maksimal 3 wallet & 5 kategori budget</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>TIDAK ada input via foto struk (OCR)</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>TIDAK ada AI Financial Advisor</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>Tanpa ekspor PDF & Excel</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/auth/register"
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm text-center block transition-all border border-slate-700"
                >
                  Pilih Starter
                </Link>
              </div>

              {/* PRO PLAN (BEST VALUE - SEKALIBAYAR) */}
              <div className="bg-gradient-to-b from-[#111C36] to-[#0F172A] border-2 border-cyan-400 rounded-3xl p-7 space-y-6 flex flex-col justify-between relative shadow-2xl shadow-blue-500/20">
                <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[11px] font-extrabold uppercase tracking-wide shadow-md">
                  Paling Populer · Lifetime
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      Pro <Sparkles className="w-4 h-4 text-cyan-400" />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Akses tak terbatas selamanya untuk kontrol penuh keuanganmu.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-cyan-400">Rp 99.000</span>
                    <span className="text-xs text-slate-400 font-semibold">Sekali Bayar (Selamanya)</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-slate-800">
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Semua fitur Starter</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span><strong>Unlimited transaksi</strong> selamanya</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Input via foto struk dengan <strong>AI OCR</strong></span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Export unlimited ke <strong>PDF & Excel (.xlsx)</strong></span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span><strong>AI Financial Advisor</strong> aktif otomatis</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Multi-wallet & Kategori custom tanpa batas</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Prioritas Support & Update Fitur Baru</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/auth/register"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm text-center block shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
                >
                  Beli Pro Sekarang (Rp99.000 Sekali Bayar)
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 13. FAQ SECTION (Minimal 7 Pertanyaan - Part 7) */}
        <section id="faq" className="py-20 bg-[#090D16]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-blue-950/60 px-3 py-1 rounded-full border border-cyan-800/60">Tanya Jawab</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white pt-2">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div
                    key={index}
                    className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-md"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full px-5 py-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between gap-4 hover:text-cyan-400 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-cyan-400' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs sm:text-sm text-slate-300 border-t border-slate-800/80 pt-3 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 14. FINAL CTA SECTION (Part 7) */}
        <section className="py-20 bg-gradient-to-r from-blue-950 via-blue-900 to-[#0B0F19] text-white border-y border-cyan-500/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Mulai kendalikan keuanganmu hari ini
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Bergabunglah bersama ribuan orang yang sudah merasakan kemudahan mencatat pengeluaran langsung dari chat Telegram.
            </p>
            <div className="pt-2">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm sm:text-base shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
              >
                Coba Gratis Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 15. FOOTER (4 Kolom Sesuai Spesifikasi Part 7) */}
      <footer className="bg-[#070A10] border-t border-slate-800/90 py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Kolom 1: Logo + Tagline + Sosmed */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
                <Send className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-white">
                Tata<span className="text-cyan-400">Dana</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Catat keuangan semudah chat — langsung dari Telegram kamu.
            </p>
            <div className="text-[11px] text-slate-500">
              &copy; 2026 TataDana Indonesia. All rights reserved.
            </div>
          </div>

          {/* Kolom 2: Produk */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Produk</div>
            <ul className="space-y-1.5">
              <li><a href="https://t.me/keuanganunga_bot" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">Telegram Bot (@keuanganunga_bot)</a></li>
              <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Web Dashboard</Link></li>
              <li><Link href="/dashboard/reports" className="hover:text-cyan-400 transition-colors">Laporan & Ekspor</Link></li>
              <li><a href="#harga" className="hover:text-cyan-400 transition-colors">Harga & Paket</a></li>
            </ul>
          </div>

          {/* Kolom 3: Perusahaan */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Perusahaan</div>
            <ul className="space-y-1.5">
              <li><a href="#demo" className="hover:text-cyan-400 transition-colors">Tentang TataDana</a></li>
              <li><Link href="/admin" className="hover:text-cyan-400 transition-colors">Admin Portal</Link></li>
              <li><a href="mailto:support@tatadana.app" className="hover:text-cyan-400 transition-colors">Kontak Tim</a></li>
            </ul>
          </div>

          {/* Kolom 4: Legal */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Legal & Keamanan</div>
            <ul className="space-y-1.5">
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Kebijakan Privasi</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Syarat & Ketentuan</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Keamanan Data RLS</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Audit Kepatuhan</a></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Global Interactive Bot Modal */}
      <TelegramSimulatorModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
      />
    </div>
  );
}
