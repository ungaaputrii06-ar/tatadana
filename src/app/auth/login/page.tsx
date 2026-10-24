'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send
} from 'lucide-react';
import { dataStore } from '@/lib/storage-mock';
import {
  ADMIN_WHATSAPP_PHONE,
  sendAdminWhatsAppOtp,
  verifyAdminWhatsAppOtp
} from '@/lib/auth';

function AuthLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Role Switcher: 'user' | 'admin'
  const [role, setRole] = useState<'user' | 'admin'>('user');

  // Input states
  const [username, setUsername] = useState('bungaputri@gmail.com');
  const [password, setPassword] = useState('admin1234');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Admin WhatsApp 2FA Step
  const [adminOtpStep, setAdminOtpStep] = useState(false);
  const [adminOtpCode, setAdminOtpCode] = useState('');
  const [adminOtpMsg, setAdminOtpMsg] = useState('');

  useEffect(() => {
    const demoParam = searchParams.get('demo');
    const emailParam = searchParams.get('email');
    const errorParam = searchParams.get('error');

    if (errorParam === 'unauthorized_admin_access') {
      setRole('admin');
      setErrorMsg('Akses ditolak: Anda harus masuk sebagai Superadmin resmi untuk mengakses panel admin.');
    }

    if (demoParam === 'admin' || emailParam === 'ungaaputrii@gmail.com' || emailParam === 'ungaaputrii06@gmail.com') {
      setRole('admin');
      setUsername('ungaaputrii@gmail.com');
      setPassword('1234');
    } else if (demoParam === 'bunga' || emailParam === 'bungaputri@gmail.com') {
      setRole('user');
      setUsername('bungaputri@gmail.com');
      setPassword('admin1234');
    }
  }, [searchParams]);

  // Tab switch handler
  const handleRoleChange = (newRole: 'user' | 'admin') => {
    setRole(newRole);
    setErrorMsg('');
    setAdminOtpStep(false);
    if (newRole === 'admin') {
      if (username === 'bungaputri@gmail.com') {
        setUsername('ungaaputrii@gmail.com');
        setPassword('1234');
      }
    } else {
      if (username === 'ungaaputrii@gmail.com') {
        setUsername('bungaputri@gmail.com');
        setPassword('admin1234');
      }
    }
  };

  const handleSendAdminWhatsAppOtp = () => {
    const res = sendAdminWhatsAppOtp('ungaaputrii@gmail.com');
    setAdminOtpMsg(res.message || 'Kode OTP WhatsApp baru telah dikirim.');
  };

  const handleVerifyAdminWhatsAppOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminOtpCode || adminOtpCode.trim().length < 4) {
      setErrorMsg('Masukkan kode OTP WhatsApp 6 digit yang valid.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = verifyAdminWhatsAppOtp(adminOtpCode.trim(), ADMIN_WHATSAPP_PHONE);
    if (res.success) {
      setTimeout(() => {
        router.push('/admin');
      }, 300);
    } else {
      setErrorMsg(res.error || 'Kode OTP WhatsApp salah atau kedaluwarsa. Gunakan kode demo 123456.');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Mohon isi username dan kata sandi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const normalizedUser = username.trim().toLowerCase();

    // Skenario 1: Login sebagai Admin
    if (role === 'admin' || normalizedUser === 'ungaaputrii@gmail.com' || normalizedUser === 'ungaaputrii06@gmail.com') {
      if (password !== '1234') {
        setErrorMsg('Kata sandi admin salah! Gunakan sandi admin resmi: 1234');
        setLoading(false);
        return;
      }

      // Verifikasi WhatsApp 2FA wajib untuk Superadmin
      const otpRes = sendAdminWhatsAppOtp('ungaaputrii@gmail.com');
      setAdminOtpStep(true);
      setAdminOtpMsg(
        otpRes.message ||
          '📲 Kode OTP keamanan 6 digit telah dikirimkan ke nomor WhatsApp resmi Superadmin Unga Putri (+62 812-9876-5432).'
      );
      setLoading(false);
      return;
    }

    // Skenario 2: Login sebagai User Demo (Bunga Putri)
    if (normalizedUser === 'bungaputri@gmail.com') {
      if (password !== 'admin1234') {
        setErrorMsg('Kata sandi user salah! Gunakan sandi resmi: admin1234');
        setLoading(false);
        return;
      }

      dataStore.user.id = 'usr_bunga_01';
      dataStore.user.email = 'bungaputri@gmail.com';
      dataStore.user.fullName = 'Bunga Putri';
      dataStore.user.full_name = 'Bunga Putri';
      dataStore.user.name = 'Bunga Putri';
      dataStore.user.avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
      dataStore.user.avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
      dataStore.user.phoneNumber = '+6281298765432';
      dataStore.user.phone_number = '+6281298765432';
      dataStore.user.plan = 'pro';
      dataStore.user.subscriptionPlan = 'pro';
      dataStore.user.role = 'user';

      if (typeof window !== 'undefined') {
        localStorage.setItem('tatadana_user_email', 'bungaputri@gmail.com');
        localStorage.setItem('tatadana_user_name', 'Bunga Putri');
        localStorage.setItem('tatadana_user_avatar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
        localStorage.setItem('tatadana_user_role', 'user');
        window.dispatchEvent(
          new CustomEvent('tatadana_profile_updated', {
            detail: {
              fullName: 'Bunga Putri',
              email: 'bungaputri@gmail.com',
              avatarUrl: dataStore.user.avatarUrl,
              role: 'user'
            }
          })
        );
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 300);
      return;
    }

    // Skenario 3: User Umum Terdaftar
    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_user_email', normalizedUser);
      localStorage.setItem('tatadana_user_role', 'user');
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#0F172A] flex flex-col justify-center items-center p-4 sm:p-6 antialiased relative selection:bg-blue-600 selection:text-white">
      {/* Latar Belakang Layar Penuh Berwarna Gelap & Ambient Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Navigasi Kecil di Atas Kartu */}
      <div className="w-full max-w-[480px] mb-4 flex justify-between items-center text-xs text-slate-400 px-2 relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
          <Send className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-bold text-white">TataDana</span>
        </Link>
        <Link href="/" className="hover:text-cyan-400 transition-colors font-medium">
          ← Kembali ke Beranda
        </Link>
      </div>

      {/* 1. Form login berupa kartu berwarna putih dengan sudut sangat membulat (rounded card) dan bayangan halus */}
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-3xl shadow-2xl shadow-black/50 border border-slate-100 overflow-hidden transition-all duration-300">
        
        {/* Header Kartu */}
        <div className="pt-8 pb-3 px-6 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              Tata<span className="text-blue-600">Dana</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Kelola keuangan pribadi dengan aman dan cerdas
          </p>
        </div>

        {/* 2. Pilihan Role (Login User vs Login Admin) - Capsule Tab Switcher */}
        <div className="px-6 sm:px-8 pt-2">
          <div className="bg-slate-100 p-1.5 rounded-full flex items-center border border-slate-200/80 shadow-inner">
            {/* Tab "Login User" (disertai ikon profil/user) */}
            <button
              id="tabUser"
              type="button"
              onClick={() => handleRoleChange('user')}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                role === 'user'
                  ? 'bg-white text-blue-600 shadow-md shadow-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Login User</span>
            </button>

            {/* Tab "Login Admin" (disertai ikon tameng/keamanan) */}
            <button
              id="tabAdmin"
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                role === 'admin'
                  ? 'bg-white text-blue-600 shadow-md shadow-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Login Admin</span>
            </button>
          </div>
        </div>

        {/* Notifikasi Error */}
        {errorMsg && (
          <div className="mx-6 sm:mx-8 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Konten Form: Mode Normal ATAU Mode Verifikasi 2FA WhatsApp Admin */}
        {adminOtpStep ? (
          /* Alur 2FA WhatsApp Khusus Superadmin */
          <form onSubmit={handleVerifyAdminWhatsAppOtp} className="px-6 sm:px-8 pt-5 pb-6 space-y-4">
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Verifikasi 2FA WhatsApp
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Langkah keamanan tambahan untuk melindungi hak akses Superadmin
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-slate-700 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-700">
                <Smartphone className="w-5 h-5 text-blue-600" />
                OTP Terkirim ke WhatsApp
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                {adminOtpMsg}
              </p>
              <div className="text-[11px] text-blue-700 font-mono bg-blue-100/60 p-2 rounded-xl border border-blue-200/80">
                Target Nomor: <b>+62 812-9876-5432 / +62 812-8888-9999</b>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                Masukkan 6 Digit Kode OTP WhatsApp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={adminOtpCode}
                onChange={(e) => setAdminOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white rounded-2xl px-4 py-3 text-center tracking-widest font-mono text-xl text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
              <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
                <span>Demo Sandbox: <code className="text-blue-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">123456</code></span>
                <button
                  type="button"
                  onClick={handleSendAdminWhatsAppOtp}
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                >
                  Kirim Ulang OTP
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 flex items-center justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group mt-4 disabled:opacity-50"
            >
              <span className="flex-1 text-center font-bold pl-5">
                {loading ? 'Memverifikasi...' : 'Verifikasi OTP & Buka Admin'}
              </span>
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-200" />
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAdminOtpStep(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                ← Kembali ke Input Kredensial
              </button>
            </div>
          </form>
        ) : (
          /* Form Input Kredensial Standar */
          <form id="loginForm" onSubmit={handleSubmit} className="px-6 sm:px-8 pt-5 pb-6 space-y-5">
            {/* Judul Form: Menyesuaikan mode "Masuk sebagai User" atau "Masuk sebagai Admin" */}
            <div className="text-left">
              <h1 id="formTitle" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {role === 'user' ? 'Masuk sebagai User' : 'Masuk sebagai Admin'}
              </h1>
              <p id="formSubTitle" className="text-xs text-slate-500 mt-1">
                {role === 'user'
                  ? 'Masukkan kredensial akun Anda untuk mengakses dashboard'
                  : 'Akses terbatas khusus administrator dan pengelola sistem'}
              </p>
            </div>

            {/* Input 1: "Username / Nama Pengguna *" dengan ikon user di sisi kiri */}
            <div className="space-y-1.5">
              <label htmlFor="usernameInput" className="block text-xs font-semibold text-slate-700">
                Username / Nama Pengguna <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  id="usernameInput"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === 'user' ? 'contoh: bungaputri@gmail.com' : 'contoh: ungaaputrii@gmail.com'}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Input 2: "Password / Kata Sandi *" dengan ikon gembok di sisi kiri dan ikon mata di sisi kanan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="passwordInput" className="block text-xs font-semibold text-slate-700">
                  Password / Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <a
                  href="https://wa.me/628987472983?text=Halo%20Admin%20Bunga%20Putri,%20saya%20butuh%20bantuan%20reset%20kata%20sandi%20login%20TataDana."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Lupa Sandi?
                </a>
              </div>
              <div className="relative rounded-2xl shadow-xs">
                {/* Ikon Gembok di Kiri */}
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="passwordInput"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {/* Ikon Mata di Kanan (Toggle Visibility) */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none transition-colors"
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 3. Tombol aksi utama (warna biru cerah, lebar penuh) bertuliskan "Masuk sebagai User" (atau Admin) dengan panah di ujung kanan */}
            <button
              type="submit"
              id="submitBtn"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 flex items-center justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group mt-6 disabled:opacity-50"
            >
              <span className="flex-1 text-center font-bold pl-5" id="submitBtnText">
                {loading
                  ? 'Memverifikasi...'
                  : role === 'user'
                  ? 'Masuk sebagai User'
                  : 'Masuk sebagai Admin'}
              </span>
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-200" />
            </button>

            {/* Kredensial Cepat (Demo Helpers) */}
            <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <span>Isi Cepat:</span>
              <button
                type="button"
                onClick={() => {
                  handleRoleChange('user');
                  setUsername('bungaputri@gmail.com');
                  setPassword('admin1234');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                Demo User
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRoleChange('admin');
                  setUsername('ungaaputrii@gmail.com');
                  setPassword('1234');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                Super Admin
              </button>
            </div>

            {/* Link Pendaftaran Akun Baru */}
            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Belum memiliki akun? </span>
              <Link href="/auth/register" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                Daftar Sekarang (Gratis)
              </Link>
            </div>
          </form>
        )}

        {/* 4. Bagian Pertanyaan & Bantuan WhatsApp di Bagian Paling Bawah Kartu */}
        <div className="border-t border-slate-100 bg-slate-50/90 px-6 sm:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Sisi Kiri: Ikon WhatsApp dan teks "Ada Pertanyaan? Tanya Admin Bunga Putri" */}
            <div className="flex items-center gap-2.5 text-slate-700 text-center sm:text-left">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.573 1.761.883 2.806.883 3.182 0 5.768-2.587 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.503-4.469 9.972-9.969 9.972-1.745 0-3.376-.452-4.801-1.242l-5.23 1.37 1.396-5.097c-.896-1.488-1.408-3.235-1.408-5.003 0-5.503 4.469-9.972 9.969-9.972 5.501 0 10.043 4.469 10.043 9.972zm-4.321 4.298c-.244-.122-1.442-.711-1.666-.792-.224-.082-.387-.122-.55.122-.163.245-.632.793-.775.955-.142.163-.285.183-.529.061-.244-.122-1.03-.38-1.962-1.21-.726-.647-1.216-1.446-1.358-1.69-.143-.245-.015-.378.107-.499.11-.11.245-.285.367-.428.122-.143.163-.245.245-.407.082-.163.041-.306-.02-.428-.061-.122-.55-1.325-.754-1.814-.199-.479-.402-.414-.55-.422l-.469-.009c-.163 0-.428.061-.652.306-.224.245-.856.836-.856 2.039s.876 2.365 1 2.528c.122.163 1.724 2.632 4.175 3.689.583.252 1.039.403 1.395.516.586.186 1.119.16 1.541.097.47-.071 1.442-.591 1.646-1.162.204-.571.204-1.06.143-1.162-.062-.102-.225-.163-.469-.285z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-700">
                Ada Pertanyaan? <strong className="font-bold text-slate-900">Tanya Admin Bunga Putri</strong>
              </span>
            </div>

            {/* Sisi Kanan: Tombol berwarna hijau bertuliskan "Chat WA (08987472983)" dengan link resmi & pesan otomatis */}
            <a
              id="chatWaBtn"
              href="https://wa.me/628987472983?text=Halo%20Admin%20Bunga%20Putri,%20saya%20butuh%20bantuan%20terkait%20login%20TataDana."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.573 1.761.883 2.806.883 3.182 0 5.768-2.587 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.503-4.469 9.972-9.969 9.972-1.745 0-3.376-.452-4.801-1.242l-5.23 1.37 1.396-5.097c-.896-1.488-1.408-3.235-1.408-5.003 0-5.503 4.469-9.972 9.969-9.972 5.501 0 10.043 4.469 10.043 9.972zm-4.321 4.298c-.244-.122-1.442-.711-1.666-.792-.224-.082-.387-.122-.55.122-.163.245-.632.793-.775.955-.142.163-.285.183-.529.061-.244-.122-1.03-.38-1.962-1.21-.726-.647-1.216-1.446-1.358-1.69-.143-.245-.015-.378.107-.499.11-.11.245-.285.367-.428.122-.143.163-.245.245-.407.082-.163.041-.306-.02-.428-.061-.122-.55-1.325-.754-1.814-.199-.479-.402-.414-.55-.422l-.469-.009c-.163 0-.428.061-.652.306-.224.245-.856.836-.856 2.039s.876 2.365 1 2.528c.122.163 1.724 2.632 4.175 3.689.583.252 1.039.403 1.395.516.586.186 1.119.16 1.541.097.47-.071 1.442-.591 1.646-1.162.204-.571.204-1.06.143-1.162-.062-.102-.225-.163-.469-.285z"/>
              </svg>
              <span>Chat WA (08987472983)</span>
            </a>
          </div>
        </div>

      </div>

      {/* Footer Hak Cipta */}
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        &copy; 2026 TataDana Personal Finance Indonesia. Dilindungi Hak Cipta.
      </div>
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-slate-400 text-xs font-semibold">
        Memuat halaman login...
      </div>
    }>
      <AuthLoginForm />
    </Suspense>
  );
}
