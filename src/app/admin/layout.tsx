'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Cpu,
  CreditCard,
  Activity,
  History,
  ArrowLeft,
  Eye,
  LogOut,
  Menu,
  X,
  Bot,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  UserCheck,
  Smartphone,
  Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TelegramSimulatorModal from '@/components/TelegramSimulatorModal';
import { dataStore } from '@/lib/storage-mock';
import { isSuperadminEmail, canAccessAdmin, ADMIN_WHATSAPP_PHONE, sendAdminWhatsAppOtp, verifyAdminWhatsAppOtp } from '@/lib/auth';

const adminNav = [
  { name: 'Ringkasan Admin', href: '/admin', icon: ShieldAlert },
  { name: 'Kelola Pengguna', href: '/admin/users', icon: Users },
  { name: 'Konfigurasi AI Provider', href: '/admin/ai-providers', icon: Cpu },
  { name: 'Approval Pembayaran', href: '/admin/payments', icon: CreditCard },
  { name: 'Log Panggilan AI', href: '/admin/ai-logs', icon: Activity },
  { name: 'Audit Trail Admin', href: '/admin/audit-logs', icon: History },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isBotSimulatorOpen, setIsBotSimulatorOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [adminProfile, setAdminProfile] = useState({
    name: 'Unga Putri',
    email: 'ungaaputrii@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    role: 'superadmin'
  });
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'credentials' | 'otp'>('credentials');
  const [authEmail, setAuthEmail] = useState('ungaaputrii@gmail.com');
  const [authPassword, setAuthPassword] = useState('1234');
  const [otpCode, setOtpCode] = useState('');
  const [authMsg, setAuthMsg] = useState('');

  const checkAuthorization = () => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('tatadana_user_email');
      const name = localStorage.getItem('tatadana_user_name');
      const avatar = localStorage.getItem('tatadana_user_avatar');
      const role = localStorage.getItem('tatadana_user_role');

      setCurrentUserEmail(email);
      setCurrentUserRole(role);

      // Strict role and email check:
      // 1. Must match official Superadmin email address (ungaaputrii@gmail.com / ungaaputrii06@gmail.com)
      // 2. Must possess 'superadmin' or 'admin' role
      // 3. Remove fallback on in-memory dataStore.user to prevent state bleeding between accounts
      const hasAdminEmail = isSuperadminEmail(email);
      const hasAdminRole = role === 'superadmin' || role === 'admin';

      if (hasAdminEmail && hasAdminRole) {
        setIsAuthorized(true);
        setAdminProfile({
          name: name || 'Unga Putri',
          email: email || 'ungaaputrii@gmail.com',
          avatar: avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
          role: 'superadmin'
        });
      } else {
        setIsAuthorized(false);
      }
    }
  };

  // Automatic redirect hook when isAuthorized === false
  useEffect(() => {
    if (isAuthorized === false) {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            const email = typeof window !== 'undefined' ? localStorage.getItem('tatadana_user_email') : null;
            if (email && !isSuperadminEmail(email)) {
              // Regular authenticated user redirected to /dashboard
              router.push('/dashboard?error=unauthorized_admin_access');
            } else {
              // Unauthenticated or guest redirected to /auth/login
              router.push('/auth/login?error=unauthorized_admin_access');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isAuthorized, router]);

  useEffect(() => {
    checkAuthorization();

    const handleProfileUpdated = (e: any) => {
      const d = e.detail;
      if (d) {
        setAdminProfile((prev) => ({
          name: d.fullName || prev.name,
          email: d.email || prev.email,
          avatar: d.avatarUrl || prev.avatar,
          role: d.role || prev.role
        }));
        checkAuthorization();
      }
    };
    window.addEventListener('tatadana_profile_updated', handleProfileUpdated);
    return () => window.removeEventListener('tatadana_profile_updated', handleProfileUpdated);
  }, []);

  const loginAsSuperadmin = (targetEmail = 'ungaaputrii@gmail.com', targetPass = '1234') => {
    const normalized = targetEmail.trim().toLowerCase();
    if ((normalized === 'ungaaputrii@gmail.com' || normalized === 'ungaaputrii06@gmail.com') && targetPass === '1234') {
      sendAdminWhatsAppOtp(normalized);
      setAuthEmail(normalized);
      setAuthStep('otp');
      setAuthMsg('📲 Kode OTP telah dikirim ke nomor WhatsApp Superadmin (+62 812-9876-5432 / +62 812-8888-9999). Silakan verifikasi untuk melanjutkan.');
    } else {
      setAuthMsg('❌ Kredensial salah! Gunakan: ungaaputrii@gmail.com / 1234');
    }
  };

  const handleVerifyOtp = () => {
    if (!otpCode || otpCode.trim().length < 4) {
      setAuthMsg('❌ Masukkan kode OTP 6 digit yang valid.');
      return;
    }

    const res = verifyAdminWhatsAppOtp(otpCode.trim(), ADMIN_WHATSAPP_PHONE);
    if (res.success) {
      setIsAuthorized(true);
      setCurrentUserRole('superadmin');
      setCurrentUserEmail('ungaaputrii@gmail.com');
      setAdminProfile({
        name: 'Unga Putri',
        email: 'ungaaputrii@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        role: 'superadmin'
      });
      setIsAuthModalOpen(false);
      setAuthStep('credentials');
      setOtpCode('');
      setAuthMsg('✅ Verifikasi WhatsApp berhasil! Selamat datang Superadmin Unga Putri.');
      setTimeout(() => setAuthMsg(''), 3000);
    } else {
      setAuthMsg(res.error || '❌ Kode OTP WhatsApp salah atau kadaluarsa.');
    }
  };

  const renderAuthModal = () => {
    if (!isAuthModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#0F172A] rounded-3xl border border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              {authStep === 'otp' ? 'Verifikasi WhatsApp Superadmin' : 'Kredensial Superadmin'}
            </h3>
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthStep('credentials');
              }}
              className="text-slate-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {authMsg && (
            <div className="p-3 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs rounded-xl flex items-center justify-between shadow-lg">
              <span>{authMsg}</span>
              <button onClick={() => setAuthMsg('')} className="font-bold ml-2 text-white">✕</button>
            </div>
          )}

          {authStep === 'credentials' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Gunakan akun resmi Superadmin. Verifikasi OTP ke WhatsApp wajib dilakukan sebelum akses diberikan:
              </p>

              {/* Quick Superadmin Unga Putri Card */}
              <div className="p-3.5 bg-blue-950/50 rounded-2xl border border-cyan-800/60 space-y-2 text-xs">
                <div className="flex justify-between items-center text-cyan-300 font-bold">
                  <span>Superadmin Unga Putri</span>
                  <span className="text-[10px] bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-2 py-0.5 rounded-full">Resmi</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-bold text-white">ungaaputrii@gmail.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Password:</span>
                    <span className="font-bold text-cyan-400">1234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">WhatsApp:</span>
                    <span className="font-bold text-emerald-400">+62 812-9876-5432</span>
                  </div>
                </div>
                <button
                  onClick={() => loginAsSuperadmin('ungaaputrii@gmail.com', '1234')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 transition-all"
                >
                  <Smartphone className="w-4 h-4 text-emerald-300" /> Kirim OTP WhatsApp & Masuk
                </button>
              </div>

              {/* Manual Form */}
              <div className="space-y-3 pt-1 border-t border-slate-800 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Email Admin:</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Password:</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  onClick={() => loginAsSuperadmin(authEmail, authPassword)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  Minta Verifikasi OTP WhatsApp
                </button>
              </div>
            </div>
          ) : (
            /* OTP Verification Step */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/70 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-emerald-300">OTP WhatsApp Terkirim</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Kode keamanan telah dikirimkan ke nomor WhatsApp <b className="text-white">+62 812-9876-5432 / +62 812-8888-9999</b>.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 text-center">
                  Masukkan 6-Digit Kode OTP WhatsApp:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl tracking-widest font-mono text-white outline-none focus:border-cyan-400"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                  <span>Demo Sandbox: <code className="text-cyan-400 font-bold">123456</code></span>
                  <button
                    onClick={() => sendAdminWhatsAppOtp(authEmail)}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    Kirim Ulang OTP
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleVerifyOtp}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Verifikasi OTP & Buka Admin Panel
                </button>
                <button
                  onClick={() => setAuthStep('credentials')}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700"
                >
                  ← Kembali ke Kredensial
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 0. Blocking loading guard while checking authorization (prevents UI flicker or leak when isAuthorized === null)
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-4 animate-pulse shadow-lg shadow-cyan-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-blue-950/80 border border-cyan-800 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
          Memverifikasi Otorisasi Superadmin
        </div>
        <p className="text-xs text-slate-400 font-mono">
          TataDana Security Role Guard v2.0
        </p>
      </div>
    );
  }

  // 1. Block regular users / unauthorized access
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0F172A] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-950/70 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 text-xs font-bold uppercase tracking-wider">
              ⛔ Akses Ditolak (403 Unauthorized)
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Admin Panel Khusus Superadmin
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Akun Anda <span className="font-mono text-cyan-300 font-bold">({currentUserEmail || 'Pengguna Reguler'})</span> tidak memiliki izin untuk mengakses area administrasi platform TataDana.
            </p>
          </div>

          {/* Automatic Redirection Notice */}
          <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-2xl text-xs space-y-1 text-rose-200">
            <div className="font-bold flex items-center justify-center gap-1.5 text-rose-300">
              <Lock className="w-3.5 h-3.5" /> Pengalihan Otomatis Aktif
            </div>
            <p className="text-[11px] text-slate-300">
              Mengarahkan ke <span className="font-semibold text-white">{currentUserEmail ? 'Dashboard Pengguna' : 'Halaman Login'}</span> dalam <span className="font-mono font-bold text-cyan-400 text-sm">{countdown}</span> detik...
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Lock className="w-4 h-4" /> Kebijakan Keamanan Sistem:
            </div>
            <p className="text-[11px] text-slate-400">
              Hanya Superadmin resmi (<span className="text-white font-mono font-semibold">ungaaputrii@gmail.com</span>) dengan verifikasi OTP WhatsApp yang berhak mengakses data pengguna, log AI, dan approval pembayaran.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <Link
              href={currentUserEmail ? '/dashboard?error=unauthorized_admin_access' : '/auth/login?error=unauthorized_admin_access'}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> {currentUserEmail ? 'Kembali ke Dashboard Pengguna' : 'Menuju Halaman Login'}
            </Link>
            <button
              onClick={() => {
                setAuthStep('credentials');
                setIsAuthModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" /> Masuk sebagai Superadmin (Verifikasi WhatsApp)
            </button>
          </div>
        </div>

        {/* Credentials & WhatsApp OTP Modal */}
        {renderAuthModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col md:flex-row transition-colors">
      {/* Impersonation & Superadmin Header Bar */}
      <div className="fixed top-0 left-0 right-0 h-10 bg-gradient-to-r from-blue-700 via-blue-900 to-slate-950 text-white font-bold text-xs flex items-center justify-between px-4 z-50 border-b border-cyan-500/30 shadow-md">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">PORTAL SUPERADMIN TATADANA — Akun Aktif:</span>
          <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-[11px] text-cyan-300 border border-cyan-800/60">{adminProfile.email}</span>
          <button
            onClick={() => {
              setAuthStep('credentials');
              setIsAuthModalOpen(true);
            }}
            className="hidden md:inline-flex items-center gap-1 bg-blue-950/60 hover:bg-blue-900/60 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ml-1"
          >
            <KeyRound className="w-3 h-3" /> Ganti Kredensial
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBotSimulatorOpen(true)}
            className="bg-blue-950/70 hover:bg-blue-900 text-cyan-300 border border-cyan-800/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Simulator Bot</span>
          </button>
          <Link
            href="/dashboard"
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Tampilan User
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1 rounded bg-slate-900 text-white border border-slate-700"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Admin Sidebar */}
      <aside
        className={`fixed md:sticky top-10 h-[calc(100vh-2.5rem)] w-64 bg-[#0B0F19] border-r border-slate-800/90 flex flex-col justify-between z-40 p-4 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/25">
              TD
            </div>
            <div>
              <div className="font-extrabold text-white tracking-tight text-sm">Superadmin Portal</div>
              <div className="text-[10px] text-cyan-400 font-mono font-bold">CONTROL CENTER</div>
            </div>
          </div>

          <nav className="space-y-1">
            {adminNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin Profile Footer & Quick Auth Switcher */}
        <div className="p-3 bg-[#080B13] rounded-2xl border border-slate-800 text-xs space-y-2 shadow-lg">
          <div className="flex items-center gap-2.5">
            <img
              src={adminProfile.avatar}
              alt={adminProfile.name}
              className="w-10 h-10 rounded-xl object-cover border-2 border-cyan-400 shadow-sm"
            />
            <div className="overflow-hidden">
              <div className="font-bold text-white truncate">{adminProfile.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{adminProfile.email}</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/70 text-cyan-400 border border-cyan-800/60">
              SUPERADMIN
            </span>
            <button
              onClick={() => {
                setAuthStep('credentials');
                setIsAuthModalOpen(true);
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
            >
              Kredensial
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 pt-14 max-w-7xl mx-auto w-full">
        {authMsg && (
          <div className="mb-4 p-3 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs rounded-xl flex items-center justify-between shadow-lg">
            <span>{authMsg}</span>
            <button onClick={() => setAuthMsg('')} className="font-bold ml-2 text-white">✕</button>
          </div>
        )}
        {children}
      </main>

      {/* Floating Telegram Simulator Launcher Pill */}
      <div className="fixed bottom-6 right-6 z-40 no-print">
        <button
          onClick={() => setIsBotSimulatorOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-[#0B0F19] hover:bg-slate-900 text-white border border-slate-800 hover:border-cyan-500/60 rounded-full shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all group"
          title="Buka Telegram Bot Simulator Langsung di Panel Admin"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-black rounded-full animate-pulse" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold flex items-center gap-1.5 text-white">
              Simulator Bot
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-cyan-400 border border-cyan-800/60 font-mono">
                Admin
              </span>
            </div>
            <div className="text-[10px] text-slate-400">@ungakeuanganbot</div>
          </div>
        </button>
      </div>

      {/* Interactive Admin Login & Credentials Modal */}
      {renderAuthModal()}

      {/* Global Admin Telegram Bot Interactive Simulator */}
      <TelegramSimulatorModal
        isOpen={isBotSimulatorOpen}
        onClose={() => setIsBotSimulatorOpen(false)}
        onTransactionAdded={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
          }
        }}
      />
    </div>
  );
}
