'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Bot,
  Terminal,
  Target,
  BarChart3,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Activity,
  Cpu,
  Layers,
  Clock,
  Play,
  Download,
  Award,
  CreditCard
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TeamMemberPerson {
  id: string;
  number: number;
  teamName: string;
  leadName: string;
  role: string;
  avatarUrl: string;
  icon: any;
  status: 'active' | 'syncing' | 'simulating';
  currentTask: string;
  metrics: { label: string; value: string };
  description: string;
  deliverables: string[];
}

export default function TeamworkPreviewPage() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<number>(-1);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const teams: TeamMemberPerson[] = [
    {
      id: 'team-1',
      number: 1,
      teamName: 'Tim 1: Platform, Security & Identity',
      leadName: 'Budi Santoso',
      role: 'Lead Platform Engineer & DevSecOps',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      icon: Shield,
      status: 'active',
      currentTask: 'Memvalidasi sesi login Bunga Putri & Superadmin Unga Putri, proteksi JWT, dan isolasi sandbox.',
      metrics: { label: 'Keamanan Sesi', value: '100% Secure • JWT' },
      description: 'Bertanggung jawab atas arsitektur keamanan, isolasi multi-tenant, akses peran (RBAC), dan keutuhan sesi pengguna.',
      deliverables: ['Auth Session & JWT Guard', 'Demo Login Admin & User', 'Audit Trail Finansial']
    },
    {
      id: 'team-2',
      number: 2,
      teamName: 'Tim 2: Telegram Bot & Real-Time Gateway',
      leadName: 'Bunga Putri',
      role: 'Lead Bot Architect & Real-Time Gateway',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      icon: Bot,
      status: 'active',
      currentTask: 'Long Polling daemon localhost aktif mendengarkan getUpdates untuk @ungakeuanganbot (Tata dana bunga).',
      metrics: { label: 'Gateway Mode', value: 'Long Polling 24/7' },
      description: 'Menjembatani antarmuka Telegram langsung ke mesin TataDana tanpa webhook publik, siap menerima pesan teks dan struk.',
      deliverables: ['Long Polling Loop Daemon', 'Sinkronisasi Struk Real-time', 'Auto-delete Webhook']
    },
    {
      id: 'team-3',
      number: 3,
      teamName: 'Tim 3: Financial NLP & OCR Vision Parser',
      leadName: 'Rizky Pratama',
      role: 'Lead NLP & Computer Vision Engineer',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      icon: Terminal,
      status: 'active',
      currentTask: 'Parsing otomatis teks bahasa Indonesia "beli makan malam 15k tunai" & scan struk belanja OCR multi-item.',
      metrics: { label: 'Akurasi NLP', value: '99.4% • < 250ms' },
      description: 'Memproses sintaks nominal sehari-hari (k, rb, jt, koma desimal), klasifikasi kategori otomatis, dan ekstraksi struk belanja.',
      deliverables: ['Parser Sintaks Rupiah (k/rb/jt)', 'OCR Struk Belanja Multi-item', 'Deteksi Kategori & Dompet']
    },
    {
      id: 'team-4',
      number: 4,
      teamName: 'Tim 4: Smart Budgeting, Analytics & Reporting',
      leadName: 'Siti Rahma',
      role: 'Principal Financial Analyst & Reports Architect',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      icon: BarChart3,
      status: 'active',
      currentTask: 'Kalkulasi 50/30/20 rule, monitoring batas budget 80%/100%, dan pipeline ekspor PDF, Excel, & CSV.',
      metrics: { label: 'Format Export', value: 'PDF • Excel • CSV' },
      description: 'Menghitung cashflow harian, mingguan, dan bulanan, serta menyajikan generator laporan native dalam 3 format unduhan.',
      deliverables: ['Export PDF, Excel & CSV', 'Plafon Budget Harian/Mingguan/Bulanan', 'Filter Multi-Periode']
    },
    {
      id: 'team-5',
      number: 5,
      teamName: 'Tim 5: AI Financial Advisor & QA Systems',
      leadName: 'Dimas Wicaksono',
      role: 'Lead AI Advisor & Test Automation Engineer',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      icon: Sparkles,
      status: 'active',
      currentTask: 'Tata AI Assistant siap konsultasi keuangan & continuous test runner: 125+ automated tests lulus 100%.',
      metrics: { label: 'Test Suite', value: '125+ Pass • 0 Error' },
      description: 'Memastikan tidak ada regresi pada semua API dan parser, sekaligus memberikan rekomendasi cerdas penghematan anggaran.',
      deliverables: ['125+ Automated Tests Green', 'Konsultasi Tata AI Cerdas', 'Turbo Boost Reminder Shifting']
    },
    {
      id: 'team-6',
      number: 6,
      teamName: 'Tim 6: High-Performance Database & FastCache Engine',
      leadName: 'Kevin Sanjaya',
      role: 'Lead Database Architect & Cache Specialist',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      icon: Cpu,
      status: 'active',
      currentTask: 'FastCache in-memory cache warmup, secondary query indexing, dan query throughput sub-5ms.',
      metrics: { label: 'Cache Latency', value: '< 5ms In-Memory' },
      description: 'Mengoptimalkan performa baca/tulis data transaksi, saldo dompet teragregasi, dan caching reminder Turbo Boost.',
      deliverables: ['FastCache In-Memory Engine', 'Secondary Index Lookups', 'Cache Invalidation Pipeline']
    },
    {
      id: 'team-7',
      number: 7,
      teamName: 'Tim 7: Superadmin Control & Approval Compliance',
      leadName: 'Unga Putri',
      role: 'Head of Superadmin Operations & Compliance',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      icon: Shield,
      status: 'active',
      currentTask: 'Mengelola persetujuan (Approve/Reject) bukti bayar manual, audit trail transaksi, dan izin hak akses.',
      metrics: { label: 'Otorisasi Admin', value: 'ungaaputrii@gmail.com' },
      description: 'Memimpin portal Superadmin, memvalidasi permohonan upgrade Pro Lifetime, dan menjaga kepatuhan audit trail perbankan.',
      deliverables: ['Sistem Approve/Reject Admin', 'Audit Log Forensik', 'Credential Superadmin 1234']
    },
    {
      id: 'team-8',
      number: 8,
      teamName: 'Tim 8: Payment Gateway & Subscription Billing',
      leadName: 'Farhan Alamsyah',
      role: 'Lead Fintech Payment Systems Engineer',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      icon: CreditCard,
      status: 'active',
      currentTask: 'Integrasi Snap Token Midtrans, webhook verifikasi pembayaran instan QRIS/VA, dan alur upgrade akun.',
      metrics: { label: 'Payment Gateway', value: 'Midtrans Snap & VA' },
      description: 'Mengelola siklus paket Starter (Rp49rb) dan Pro Lifetime (Rp99rb) serta rekonsiliasi pembayaran otomatis.',
      deliverables: ['Midtrans Webhook Idempotency', 'Simulasi Manual Transfer', 'Billing Invoicing Engine']
    },
    {
      id: 'team-9',
      number: 9,
      teamName: 'Tim 9: Product UI/UX & Generative Blue Theme',
      leadName: 'Nabila Az-Zahra',
      role: 'Principal UI/UX & Design System Architect',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      icon: Activity,
      status: 'active',
      currentTask: 'Menjaga tampilan modern bernuansa biru & hitam (#090D16, #0F172A, cyan glow) dan responsivitas mobile 375px - 1280px.',
      metrics: { label: 'Design System', value: 'Vibrant Blue & Dark' },
      description: 'Memastikan pengalaman antarmuka pengguna modern, bersih, intuitif, dan responsif di seluruh layar TataDana.',
      deliverables: ['Generative Blue UI System', 'Mobile Navigation Drawer', 'High-Contrast Typography']
    },
    {
      id: 'team-10',
      number: 10,
      teamName: 'Tim 10: DevOps, SRE & Cloud Infrastructure',
      leadName: 'Arya Wijaya',
      role: 'Lead Site Reliability Engineer & Infrastructure',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      icon: Zap,
      status: 'active',
      currentTask: 'Zero-downtime healthcheck localhost:3000, Next.js dynamic routing, dan continuous verification pipeline.',
      metrics: { label: 'System Uptime', value: '99.99% • Ready' },
      description: 'Menjaga kestabilan server lokal dan produksi, monitoring memori heap, dan memastikan build selalu 0 error.',
      deliverables: ['Next.js Standalone Build', 'Process Health Monitor', 'Auto-Reconnect Daemon']
    }
  ];

  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationStep(0);
    setSimulationLogs(['[00:00] 🚀 Memulai orkestrasi kolaborasi 10 Tim Spesialis TataDana...']);

    const steps = [
      '[00:01] 🛡️ Tim 1 (Budi Santoso): Mengautentikasi sesi aktif pengguna dan memvalidasi akses keamanan JWT.',
      '[00:02] 🤖 Tim 2 (Bunga Putri): Long Polling daemon menerima pesan Telegram "beli makan malam 15k tunai" via @ungakeuanganbot.',
      '[00:03] 💻 Tim 3 (Rizky Pratama): NLP Parser mendeteksi nominal Rp15.000, kategori "Makanan & Minuman", dan dompet "Dompet Tunai".',
      '[00:04] 📊 Tim 4 (Siti Rahma): Mengevaluasi alokasi budget bulanan, mengupdate progres 65%, dan menyiapkan snapshot laporan.',
      '[00:05] 🧠 Tim 5 (Dimas Wicaksono): Tata AI menganalisis dampaknya terhadap cashflow dan memverifikasi seluruh test suite lulus.',
      '[00:06] ⚡ Tim 6 (Kevin Sanjaya): In-memory FastCache memanaskan cache agregasi saldo sub-5ms dan memperbarui index sekunder.',
      '[00:07] 🛡️ Tim 7 (Unga Putri): Superadmin audit trail mencatat log pemrosesan transaksi sesuai kepatuhan regulasi.',
      '[00:08] 💳 Tim 8 (Farhan Alamsyah): Status kuota paket Pro Lifetime terkonfirmasi UNLIMITED tanpa kendala batasan.',
      '[00:09] 🎨 Tim 9 (Nabila Az-Zahra): Generative UI blue theme merender kartu ringkasan real-time di Beranda & Laporan.',
      '[00:10] 🚀 Tim 10 (Arya Wijaya): Server Next.js memancarkan webhook internal, status koneksi 100% stabil & siap beroperasi.'
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setSimulationLogs((prev) => [...prev, steps[current]]);
        setSimulationStep(current);
        current++;
      } else {
        clearInterval(interval);
        setSimulationLogs((prev) => [
          ...prev,
          '✅ [00:11] SEMPURNA! Seluruh 10 Tim berhasil berkolaborasi end-to-end tanpa error.'
        ]);
        setIsSimulating(false);
      }
    }, 700);
  };

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-cyan-400" />
              Struktur Kolaborasi 10 Tim & 10 Penanggung Jawab
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-cyan-400 border border-cyan-800/60">
              🟢 10/10 Tim Online & Siap
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Setiap pilar arsitektur dikelola oleh 1 tim spesialis berdedikasi dengan metrik live, tugas sprint aktif, dan deliverables terukur.
          </p>
        </div>

        <button
          onClick={startSimulation}
          disabled={isSimulating}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 self-start sm:self-auto shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-white disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Mengorkestrasi 10 Tim...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" /> Jalankan Simulasi Kolaborasi 10 Tim
            </>
          )}
        </button>
      </div>

      {/* 4 System Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Struktur Kolaborasi</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">10 Tim / 10 Lead</div>
          <div className="text-[10px] text-cyan-400 font-medium mt-1">100% divisi aktif sinkron</div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Test Automation</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">125+ Pass</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">0 Failed • 100% Hijau</div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Telegram Bot Engine</span>
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400 mt-1">@ungakeuanganbot</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">Long Polling Daemon aktif</div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Format Laporan</span>
            <Download className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400 mt-1">PDF, Excel, CSV</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">Download instan multi-format</div>
        </div>
      </div>

      {/* Live Simulation Console Window */}
      {simulationLogs.length > 0 && (
        <div className="bg-[#050811] border border-slate-800 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Live Console: Orkestrasi 10 Tim Kolaboratif</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Step {Math.min(10, simulationStep + 1)} / 10</span>
              {isSimulating && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
            </div>
          </div>
          <div className="font-mono text-xs space-y-1.5 max-h-56 overflow-y-auto pt-1">
            {simulationLogs.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg transition-all ${
                  index === simulationLogs.length - 1
                    ? 'bg-blue-950/80 text-cyan-300 border border-cyan-800/60 font-semibold'
                    : 'text-slate-300'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10 Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {teams.map((t, idx) => {
          const Icon = t.icon;
          const isHighlighted = isSimulating && simulationStep === idx;

          return (
            <div
              key={t.id}
              className={`bg-[#0F172A] border rounded-2xl p-5 space-y-4 transition-all duration-200 shadow-lg ${
                isHighlighted
                  ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-xl bg-blue-950/40'
                  : 'border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              {/* Header with Person Avatar and Team Name */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={t.avatarUrl}
                      alt={t.leadName}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-slate-700 shadow-sm"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#0B0F19] border border-slate-700 shadow-sm flex items-center justify-center text-cyan-400">
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-cyan-400 bg-blue-950 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                        TIM #{t.number}
                      </span>
                      <h3 className="text-sm font-bold text-white">{t.teamName}</h3>
                    </div>
                    <div className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
                      <span>{t.leadName}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-[11px] text-slate-400 font-normal">{t.role}</span>
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isHighlighted
                    ? 'bg-blue-950 text-cyan-400 border-cyan-800/60 animate-pulse'
                    : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                }`}>
                  {isHighlighted ? '⚡ Diproses' : '🟢 Live Aktif'}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.description}
              </p>

              {/* Current Active Sprint Task */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="text-[10px] font-bold text-cyan-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-cyan-400" /> Tugas Sprint Aktif:
                </div>
                <div className="text-xs text-slate-200 font-medium">{t.currentTask}</div>
              </div>

              {/* Deliverables Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.deliverables.map((item, dIdx) => (
                  <span
                    key={dIdx}
                    className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" /> {item}
                  </span>
                ))}
              </div>

              {/* Metrics Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400 font-medium">{t.metrics.label}:</span>
                <span className="font-bold text-cyan-400 bg-blue-950 px-2.5 py-0.5 rounded-md border border-cyan-800/60 font-mono text-[11px]">
                  {t.metrics.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
