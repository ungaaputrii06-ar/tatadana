'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Cpu,
  Users,
  Activity,
  CreditCard,
  Eye,
  KeyRound,
  CheckCircle2,
  XCircle,
  FileDown,
  RefreshCw,
  LogOut,
  Send,
  Lock,
  ArrowRight,
  Printer,
  FileSpreadsheet,
  Bot,
  Camera,
  Sparkles,
  Plus,
  Search,
  Filter,
  Check,
  Upload,
  UserCheck,
  ShieldCheck,
  User,
  Smartphone
} from 'lucide-react';
import { dataStore } from '@/lib/storage-mock';
import { mockStore } from '@/lib/supabase/mock-store';
import { formatRupiah } from '@/lib/telegram-parser';
import { formatWIBDate, formatWIBDateTime } from '@/lib/utils/date';
import TelegramSimulatorModal from '@/components/TelegramSimulatorModal';
import UserProfileModal from '@/components/admin/UserProfileModal';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'approval' | 'users' | 'transactions' | 'providers' | 'audit'>('overview');
  const [aiMode, setAiMode] = useState<'single' | 'failover'>(dataStore.aiMode);
  const [providers, setProviders] = useState(dataStore.aiProviders);
  const [payments, setPayments] = useState(dataStore.payments);
  const [auditLogs, setAuditLogs] = useState(dataStore.auditLogs);
  const [actionMessage, setActionMessage] = useState('');
  const [isBotSimulatorOpen, setIsBotSimulatorOpen] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [liveUsers, setLiveUsers] = useState<any[]>([]);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState({
    name: 'Unga Putri (Superadmin)',
    email: 'ungaaputrii@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    role: 'superadmin'
  });
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  const presetAvatars = [
    { id: 'unga_default', label: 'Unga Putri (Resmi)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { id: 'unga_casual', label: 'Kasual Elegan', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: 'tech_lead', label: 'Tech Executive', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
    { id: 'minimalist', label: 'Minimalis', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { id: 'avatar_3d', label: '3D Ilustrasi', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('tatadana_user_email');
      const savedName = localStorage.getItem('tatadana_user_name');
      const savedAvatar = localStorage.getItem('tatadana_user_avatar');
      if ((savedEmail === 'ungaaputrii@gmail.com' || savedEmail === 'ungaaputrii06@gmail.com') && (savedName || savedAvatar)) {
        setAdminProfile({
          name: savedName || 'Unga Putri (Superadmin)',
          email: 'ungaaputrii@gmail.com',
          avatarUrl: savedAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          role: 'superadmin'
        });
      }
    }
  }, []);

  const loadLiveUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setLiveUsers(data.users);
      }
    } catch {
      // fallback to mockStore
      const fallback = Array.from(mockStore.profiles.values()).map(u => ({
        ...u,
        total_balance: mockStore.getWalletsByUser(u.id).reduce((s, w) => s + w.balance, 0),
        wallets: mockStore.getWalletsByUser(u.id),
        transactions: mockStore.getTransactionsByUser(u.id),
        is_whatsapp_verified: u.is_whatsapp_verified ?? u.whatsapp_verified ?? u.is_phone_verified ?? true,
      }));
      setLiveUsers(fallback);
    }
  };

  useEffect(() => {
    loadLiveUsers();
    const handleUpdate = () => loadLiveUsers();
    window.addEventListener('tatadana_data_updated', handleUpdate);
    window.addEventListener('tatadana_profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('tatadana_data_updated', handleUpdate);
      window.removeEventListener('tatadana_profile_updated', handleUpdate);
    };
  }, []);

  const handleUpdateAvatar = (newUrl: string) => {
    setAdminProfile(prev => ({ ...prev, avatarUrl: newUrl }));
    dataStore.user.avatarUrl = newUrl;
    dataStore.user.avatar_url = newUrl;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_user_avatar', newUrl);
      window.dispatchEvent(new CustomEvent('tatadana_profile_updated', {
        detail: { fullName: adminProfile.name, email: adminProfile.email, avatarUrl: newUrl, role: 'superadmin' }
      }));
      window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
    }
    setIsPhotoModalOpen(false);
    setActionMessage('Foto profil Superadmin berhasil diperbarui dan tersinkronisasi instan!');
    setTimeout(() => setActionMessage(''), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file foto maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleUpdateAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Impersonation mode
  const handleImpersonateUser = (userName: string, userId?: string) => {
    const matchedProfile = Array.from(mockStore.profiles.values()).find(
      p => (userId && p.id === userId) || p.full_name === userName || p.fullName === userName
    ) || dataStore.user;

    dataStore.auditLogs.unshift({
      id: 'aud_' + Date.now(),
      admin_id: 'adm_unga',
      adminId: 'adm_unga',
      adminName: 'Unga Putri (Superadmin)',
      action: 'IMPERSONATE_USER',
      target_user_id: matchedProfile.id,
      targetUserId: matchedProfile.id,
      targetUserName: userName,
      details: `Superadmin Unga Putri masuk ke tampilan dashboard sebagai ${userName} tanpa sandi`,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    setAuditLogs([...dataStore.auditLogs]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_user_name', userName);
      localStorage.setItem('tatadana_user_email', matchedProfile.email || 'user@tatadana.app');
      localStorage.setItem('tatadana_user_role', 'user');
      localStorage.setItem('tatadana_impersonated_user_id', matchedProfile.id);
    }
    window.location.href = `/admin/impersonate?userId=${matchedProfile.id}`;
  };

  // Approve / Reject Manual Payment & Upgrade Request
  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action, adminId: 'adm_unga' })
      });
      const data = await res.json();
      if (data.ok) {
        // Find and update local state
        const targetPay = dataStore.payments.find(p => p.id === paymentId);
        if (targetPay) {
          targetPay.status = action === 'approve' ? 'approved_manual' : 'rejected_manual';
          if (action === 'approve') {
            dataStore.user.plan = 'pro';
            dataStore.user.subscriptionPlan = 'pro';
          }
        }

        // Add audit record
        dataStore.auditLogs.unshift({
          id: 'aud_' + Date.now(),
          admin_id: 'adm_unga',
          adminId: 'adm_unga',
          adminName: 'Unga Putri',
          action: action === 'approve' ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT',
          target_user_id: targetPay?.userId || dataStore.user.id,
          targetUserId: targetPay?.userId || dataStore.user.id,
          targetUserName: targetPay?.userName || dataStore.user.fullName || 'User',
          details: `Superadmin Unga Putri ${action === 'approve' ? 'MENYETUJUI' : 'MENOLAK'} order #${targetPay?.orderId || paymentId} senilai ${formatRupiah(targetPay?.amount || 99000)}`,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });

        setPayments([...dataStore.payments]);
        setAuditLogs([...dataStore.auditLogs]);
        setActionMessage(action === 'approve'
          ? `✅ Persetujuan berhasil! User ${targetPay?.userName || 'Pengguna'} resmi di-upgrade ke Paket Pro Lifetime.`
          : `❌ Pengajuan pembayaran #${targetPay?.orderId || paymentId} berhasil ditolak.`
        );
        setTimeout(() => setActionMessage(''), 4500);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
      }
    } catch {
      alert('Gagal memproses approval pembayaran.');
    }
  };

  // Export to Excel (.xlsx) handler
  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/admin/export-all?format=excel');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tatadana_admin_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setActionMessage('📊 File Excel (.xlsx) seluruh data platform berhasil diunduh!');
        setTimeout(() => setActionMessage(''), 4000);
      } else {
        throw new Error('API returned error');
      }
    } catch {
      alert('Gagal mendownload file Excel.');
    }
  };

  // Export to PDF handler
  const handleExportPdf = async () => {
    try {
      const res = await fetch('/api/admin/export-all?format=pdf');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tatadana_admin_export_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setActionMessage('📄 File PDF rekap platform berhasil diunduh!');
        setTimeout(() => setActionMessage(''), 4000);
      } else {
        handlePrintAdmin();
      }
    } catch {
      handlePrintAdmin();
    }
  };

  const handlePrintAdmin = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const filteredPayments = payments.filter(p => {
    if (approvalFilter === 'pending') return p.status === 'pending';
    if (approvalFilter === 'approved') return p.status === 'settlement' || p.status === 'approved_manual';
    if (approvalFilter === 'rejected') return p.status === 'rejected_manual';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Print-Only Executive Header Block */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-black">TataDana — Laporan Eksekutif Superadmin</h1>
            <p className="text-xs text-gray-700">Administrator: {adminProfile.name} ({adminProfile.email})</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Waktu Cetak: {formatWIBDateTime()}</p>
            <p>Status: Laporan Operasional Platform</p>
          </div>
        </div>
      </div>

      {/* Superadmin Identity & Action Header */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
            <img
              src={adminProfile.avatarUrl}
              alt={adminProfile.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400 shadow-md group-hover:opacity-90 transition-opacity"
            />
            <button
              className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-cyan-500 text-slate-950 shadow-md group-hover:scale-110 transition-transform font-bold"
              title="Ganti Foto Profil Superadmin"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {adminProfile.name}
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-950/70 text-cyan-400 border border-cyan-800/60 font-bold uppercase tracking-wider">
                SUPERADMIN
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="font-mono text-cyan-300">{adminProfile.email}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Bot @ungakeuanganbot Online
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Simulator, PDF, Excel, Impersonate */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBotSimulatorOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 text-cyan-300 border border-cyan-800/60 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Buka Telegram Bot Simulator Langsung"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Simulator Bot</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            title="Download Rekap Data ke Format PDF"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            <span>Unduh PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            title="Ekspor Seluruh Data ke Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Unduh Excel</span>
          </button>

          <button
            onClick={() => handleImpersonateUser('Bunga Putri')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Masuk ke Dashboard User Bunga Putri"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Masuk sbg Bunga Putri</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3.5 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage('')} className="text-slate-400 hover:text-white text-xs font-bold px-1">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-2 text-xs sm:text-sm font-semibold overflow-x-auto pb-1 no-print">
        {[
          { id: 'overview', label: 'Ringkasan & Metrik', icon: Activity },
          { id: 'approval', label: `Persetujuan Admin (${payments.filter(p => p.status === 'pending').length})`, icon: CheckCircle2 },
          { id: 'users', label: 'Manajemen Pengguna', icon: Users },
          { id: 'transactions', label: 'Inspeksi Transaksi', icon: Eye },
          { id: 'providers', label: 'AI Providers & Failover', icon: Cpu },
          { id: 'audit', label: 'Audit Log Kepatuhan', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all rounded-t-lg ${
                isActive
                  ? 'border-cyan-400 text-cyan-400 bg-blue-950/40 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: RINGKASAN & OVERVIEW METRIK */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Credential Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Superadmin Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-[#0F172A] to-[#0F172A] border border-cyan-800/60 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Kredensial Superadmin Resmi
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold">
                  SUPERADMIN
                </span>
              </div>
              <div className="bg-slate-900 rounded-xl p-2.5 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Email:</span>
                  <code className="text-white font-mono font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                    ungaaputrii@gmail.com
                  </code>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Password:</span>
                  <code className="text-cyan-400 font-mono font-bold bg-blue-950 px-2 py-0.5 rounded border border-cyan-800/60 text-[11px]">
                    1234
                  </code>
                </div>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dataStore.user.id = 'adm_unga_01';
                    dataStore.user.email = 'ungaaputrii@gmail.com';
                    dataStore.user.fullName = 'Unga Putri';
                    dataStore.user.full_name = 'Unga Putri';
                    dataStore.user.avatarUrl = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';
                    dataStore.user.avatar_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';
                    dataStore.user.role = 'superadmin';
                    dataStore.user.plan = 'pro';
                    dataStore.user.subscriptionPlan = 'pro';
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('tatadana_user_email', 'ungaaputrii@gmail.com');
                      localStorage.setItem('tatadana_user_name', 'Unga Putri');
                      localStorage.setItem('tatadana_user_avatar', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150');
                      localStorage.setItem('tatadana_user_role', 'superadmin');
                      window.dispatchEvent(new CustomEvent('tatadana_profile_updated', {
                        detail: { fullName: 'Unga Putri', email: 'ungaaputrii@gmail.com', avatarUrl: dataStore.user.avatarUrl, role: 'superadmin' }
                      }));
                    }
                    setAdminProfile({
                      name: 'Unga Putri (Superadmin)',
                      email: 'ungaaputrii@gmail.com',
                      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
                      role: 'superadmin'
                    });
                    setActionMessage('✅ Kredensial Superadmin Unga Putri (ungaaputrii@gmail.com / 1234) aktif!');
                    setTimeout(() => setActionMessage(''), 3500);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Aktifkan Sesi Superadmin (Unga Putri)
                </button>
              </div>
            </div>

            {/* User Demo Card */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Kredensial Demo Pengguna (Bunga Putri)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-800/60">
                  PRO USER
                </span>
              </div>
              <div className="bg-slate-900 rounded-xl p-2.5 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Email:</span>
                  <code className="text-white font-mono font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                    bungaputri@gmail.com
                  </code>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Password:</span>
                  <code className="text-slate-300 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                    admin1234
                  </code>
                </div>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleImpersonateUser('Bunga Putri')}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Beralih ke Dashboard Pengguna (Bunga Putri)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
              <span className="text-xs font-semibold text-slate-400">Total User Terdaftar</span>
              <div className="text-2xl font-black text-white mt-1">1,482 Akun</div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-1">✓ 94% Terhubung ke Telegram</div>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
              <span className="text-xs font-semibold text-slate-400">Pengguna Pro Lifetime</span>
              <div className="text-2xl font-black text-cyan-400 mt-1">620 User</div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">Rp 61.380.000 Akumulasi GMV</div>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
              <span className="text-xs font-semibold text-slate-400">Panggilan AI Bulan Ini</span>
              <div className="text-2xl font-black text-white mt-1">48,920 Req</div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-1">99.8% Tingkat Keberhasilan</div>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
              <span className="text-xs font-semibold text-slate-400">Biaya Token AI</span>
              <div className="text-2xl font-black text-white mt-1">Rp 142.500</div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">Rata-rata 220ms per respon</div>
            </div>
          </div>

          {/* Quick Actions & Telegram Bot Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Tindakan Cepat Superadmin
              </h3>
              <p className="text-xs text-slate-400">
                Akses cepat persetujuan transaksi, simulator bot, dan unduhan laporan platform.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={() => setActiveTab('approval')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Buka Persetujuan Pembayaran
                </button>
                <button
                  onClick={() => setIsBotSimulatorOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-950/70 hover:bg-blue-900 text-cyan-300 border border-cyan-800/60 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Bot className="w-4 h-4 text-cyan-400" /> Uji Bot di Simulator
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Ekspor Excel
                </button>
              </div>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                Status Integrasi Bot Telegram
              </h3>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Username Bot:</span>
                  <span className="font-bold text-cyan-300 font-mono">@ungakeuanganbot</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Nama Bot:</span>
                  <span className="font-semibold text-white">Tata dana bunga</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Mode Koneksi:</span>
                  <span className="font-bold text-emerald-400 font-mono text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    🟢 Long Polling Aktif (Localhost)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSETUJUAN & APPROVAL ADMIN */}
      {activeTab === 'approval' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                Pusat Persetujuan Pembayaran & Upgrade Akun
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifikasi bukti transfer manual atau transaksi pending Midtrans. Saat disetujui, akun pengguna langsung ditingkatkan ke Pro Lifetime.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'pending', label: 'Menunggu Approval' },
                { id: 'approved', label: 'Disetujui' },
                { id: 'rejected', label: 'Ditolak' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setApprovalFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    approvalFilter === f.id
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID & Tanggal</th>
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Superadmin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Tidak ada pengajuan pembayaran pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {p.orderId || p.order_id}
                        <div className="text-[10px] text-slate-400 font-normal font-sans">
                          {formatWIBDate(p.createdAt || p.created_at || new Date().toISOString())}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {p.userName || 'Bunga Putri'}
                        <div className="text-[11px] text-slate-400 font-normal">bungaputri@gmail.com</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/70 text-cyan-400 border border-cyan-800/60 uppercase">
                          {p.plan} Lifetime
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatRupiah(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize">
                        {(p.paymentMethod || p.payment_type || 'manual_transfer').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          p.status === 'settlement' || p.status === 'approved_manual'
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                            : p.status === 'rejected_manual'
                            ? 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                            : 'bg-amber-950/70 text-amber-400 border border-amber-800/60 animate-pulse'
                        }`}>
                          {p.status === 'pending' ? 'MENUNGGU APPROVAL' : p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePaymentAction(p.id, 'approve')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1"
                              title="Setujui Pembayaran & Jadikan PRO"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handlePaymentAction(p.id, 'reject')}
                              className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-bold transition-all"
                              title="Tolak Pembayaran"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            {p.status.includes('approved') ? '✓ Disetujui' : '✗ Ditolak'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MANAJEMEN PENGGUNA */}
      {activeTab === 'users' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Manajemen Pengguna & Saldo
              </h3>
              <p className="text-xs text-slate-400">
                Daftar akun pengguna terdaftar, status paket, dan opsi impersonasi aman untuk audit support.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari user (nama / email)..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Nama & Kontak</th>
                  <th className="py-3 px-4">Verifikasi WhatsApp</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Total Saldo</th>
                  <th className="py-3 px-4">Status Telegram</th>
                  <th className="py-3 px-4 text-center">Aksi Superadmin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {(liveUsers.length > 0 ? liveUsers : dataStore.users || []).filter(u => {
                  const q = userSearch.toLowerCase();
                  const name = (u.full_name || u.name || '').toLowerCase();
                  const email = (u.email || '').toLowerCase();
                  const phone = (u.phone_number || u.phoneNumber || '');
                  return !userSearch || name.includes(q) || email.includes(q) || phone.includes(q);
                }).map((u: any) => {
                  const isWa = u.is_whatsapp_verified ?? u.whatsapp_verified ?? u.is_phone_verified ?? true;
                  const uName = u.full_name || u.fullName || u.name || 'Pengguna';
                  const uBalance = u.total_balance ?? (u.wallets ? u.wallets.reduce((s: number, w: any) => s + (w.balance || 0), 0) : 0);

                  return (
                    <tr key={u.id} className="hover:bg-blue-950/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {uName}
                          {u.role === 'superadmin' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-cyan-400 font-bold border border-cyan-800/60">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{u.email || u.phone_number || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isWa ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> WhatsApp OK
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-800/60 font-semibold flex items-center gap-1 w-fit">
                            <Smartphone className="w-3 h-3" /> Pending WA
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.plan === 'pro'
                            ? 'bg-blue-950/70 text-cyan-400 border border-cyan-800/60'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {(u.plan || 'starter').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatRupiah(uBalance)}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.telegram_connection_status === 'connected' || u.tg ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                            ✓ Terhubung Bot
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full font-medium border border-slate-800">
                            Belum Link
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedProfileUser(u);
                              setProfileModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Lihat Profil Lengkap Pengguna (WhatsApp, Dompet, Transaksi)"
                          >
                            <User className="w-3.5 h-3.5 text-cyan-400" /> Profil
                          </button>
                          <button
                            onClick={() => handleImpersonateUser(uName, u.id)}
                            className="px-2.5 py-1 rounded-xl bg-blue-950/70 hover:bg-blue-900 text-cyan-400 border border-cyan-800/60 text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Masuk ke Akun Ini"
                          >
                            <Eye className="w-3.5 h-3.5" /> Masuk Akun
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INSPEKSI TRANSAKSI LIVE */}
      {activeTab === 'transactions' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                Inspeksi Transaksi Pengguna Real-Time
              </h3>
              <p className="text-xs text-slate-400">
                Memantau seluruh transaksi masuk dari chat Telegram, struk belanja OCR, atau web.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Tanggal & Jam</th>
                  <th className="py-3 px-4">Kategori & Catatan</th>
                  <th className="py-3 px-4">Dompet</th>
                  <th className="py-3 px-4">Sumber</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {dataStore.transactions
                  .filter(t => !txSearch || (t.notes || '').toLowerCase().includes(txSearch.toLowerCase()) || (t.categoryName || '').toLowerCase().includes(txSearch.toLowerCase()))
                  .slice(0, 10)
                  .map(t => (
                    <tr key={t.id} className="hover:bg-blue-950/20 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400 font-medium">
                        {formatWIBDate(t.transactionDate || t.transaction_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{t.notes || 'Transaksi'}</div>
                        <div className="text-xs text-slate-400">{t.categoryName || 'Makanan & Minuman'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">{t.walletName || 'Dompet Tunai'}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-950/70 text-cyan-400 border border-cyan-800/60">
                          {t.source || 'telegram_text'}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-black ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AI PROVIDERS & FAILOVER */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Mode Eksekusi Multi-Provider AI</h3>
                <p className="text-xs text-slate-400">
                  Konfigurasi orkestrasi pemanggilan LLM (Gemini, GPT, DeepSeek) saat memproses transaksi chat Telegram.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => {
                    dataStore.aiMode = 'single';
                    setAiMode('single');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    aiMode === 'single' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mode Single
                </button>
                <button
                  onClick={() => {
                    dataStore.aiMode = 'failover';
                    setAiMode('failover');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    aiMode === 'failover' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mode Failover Otomatis
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Nama Provider</th>
                  <th className="py-3 px-4">Model AI</th>
                  <th className="py-3 px-4">API Key Masked</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {providers.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-blue-950/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-cyan-400">#{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      {p.displayName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">{p.modelName}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{p.apiKeyMasked}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        p.isActive ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60' : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {p.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          p.isActive = !p.isActive;
                          setProviders([...providers]);
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
                      >
                        {p.isActive ? 'Matikan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOG KEBERLANJUTAN */}
      {activeTab === 'audit' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              Audit Log Forensik & Kepatuhan
            </h3>
            <p className="text-xs text-slate-400">
              Pencatatan aksi superadmin (approval, impersonasi, ekspor) demi transparansi dan kepatuhan perbankan.
            </p>
          </div>

          <div className="divide-y divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-cyan-400">{log.action}</span>
                  <span className="text-slate-400 mx-2">oleh {log.adminName || log.admin_id}</span>
                  <p className="text-slate-300 mt-0.5">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {})}</p>
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap font-mono">
                  {new Date(log.createdAt || log.created_at || Date.now()).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Ganti Foto Profil Superadmin */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0F172A] rounded-3xl border border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                Ganti Foto Profil Superadmin
              </h3>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
            </div>

            {/* Current Avatar Preview */}
            <div className="flex items-center gap-4">
              <img
                src={adminProfile.avatarUrl}
                alt="Preview"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-md"
              />
              <div>
                <div className="font-bold text-sm text-white">{adminProfile.name}</div>
                <div className="text-xs text-slate-400">{adminProfile.email}</div>
                <div className="text-[10px] text-cyan-400 font-semibold mt-0.5">Format: JPG, PNG, WEBP (Maks 5MB)</div>
              </div>
            </div>

            {/* Upload File Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Unggah File dari Komputer:</label>
              <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-blue-950/30 hover:bg-blue-950/50 cursor-pointer transition-all text-xs font-semibold text-cyan-300">
                <Upload className="w-4 h-4 text-cyan-400" />
                Pilih Foto dari Galeri / File
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Preset Avatars */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Atau Pilih Avatar Rekomendasi:</label>
              <div className="grid grid-cols-5 gap-2">
                {presetAvatars.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleUpdateAvatar(p.url)}
                    className={`p-1 rounded-xl border transition-all ${
                      adminProfile.avatarUrl === p.url
                        ? 'border-cyan-400 ring-2 ring-cyan-500/50'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="w-full h-10 object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Atau Masukkan URL Gambar:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  value={customAvatarInput}
                  onChange={e => setCustomAvatarInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500"
                />
                <button
                  onClick={() => {
                    if (customAvatarInput.trim()) {
                      handleUpdateAvatar(customAvatarInput.trim());
                      setCustomAvatarInput('');
                    }
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Telegram Simulator Modal in Admin */}
      <TelegramSimulatorModal
        isOpen={isBotSimulatorOpen}
        onClose={() => setIsBotSimulatorOpen(false)}
        onTransactionAdded={() => {
          setPayments([...dataStore.payments]);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
          }
        }}
      />

      {/* User Profile Inspection Modal in Admin Dashboard */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={selectedProfileUser}
        onChangePlan={(userId, newPlan) => {
          fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, plan: newPlan }),
          }).then(() => {
            loadLiveUsers();
            setActionMessage(`Paket user berhasil diubah menjadi ${newPlan.toUpperCase()}`);
            setTimeout(() => setActionMessage(''), 3000);
          });
        }}
        onImpersonate={(u) => handleImpersonateUser(u.full_name || u.name, u.id)}
      />
    </div>
  );
}
