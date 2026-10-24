'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldAlert,
  Eye,
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Target,
  Calendar,
  Sparkles,
  Bot,
  ExternalLink,
  CheckCircle2,
  Clock,
  LogOut,
  Receipt
} from 'lucide-react';
import { mockStore } from '@/lib/supabase/mock-store';
import { dataStore } from '@/lib/storage-mock';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDate } from '@/lib/utils/date';
import { UserProfile, Transaction, Budget, Wallet as WalletType } from '@/lib/types';

function ImpersonateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId') || 'user-starter-123';

  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch user profile from mockStore / dataStore
    let profile = mockStore.profiles.get(targetUserId);
    if (!profile) {
      if (dataStore.user.id === targetUserId) profile = dataStore.user;
      else profile = Array.from(mockStore.profiles.values())[0];
    }

    if (profile) {
      setUser(profile);
      const userWallets = mockStore.getWalletsByUser(profile.id);
      setWallets(userWallets.length > 0 ? userWallets : dataStore.wallets);

      const userTxs = mockStore.getTransactionsByUser(profile.id);
      setTransactions(userTxs.length > 0 ? userTxs : dataStore.transactions.slice(0, 10));

      const userBudgets = mockStore.getBudgetsByUser(profile.id, 10, 2026);
      setBudgets(userBudgets.length > 0 ? userBudgets : dataStore.budgets);

      // Record audit log entry
      mockStore.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        admin_id: 'adm_unga_01',
        action: 'IMPERSONATE_USER_SESSION_ACTIVE',
        target_user_id: profile.id,
        details: {
          admin: 'Unga Putri (Superadmin)',
          impersonatedUser: profile.full_name || profile.id,
          email: profile.email || profile.phone_number,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });
    }

    setLoading(false);
  }, [targetUserId]);

  const handleReturnToAdmin = () => {
    // Safely exit impersonation and log
    mockStore.auditLogs.unshift({
      id: 'aud-' + Date.now(),
      admin_id: 'adm_unga_01',
      action: 'EXIT_IMPERSONATION_SESSION',
      target_user_id: user?.id,
      details: `Superadmin Unga Putri keluar dari mode impersonasi ${user?.full_name || 'pengguna'}`,
      created_at: new Date().toISOString()
    });

    if (typeof window !== 'undefined') {
      localStorage.removeItem('tatadana_impersonated_user_id');
      localStorage.setItem('tatadana_user_role', 'superadmin');
      localStorage.setItem('tatadana_user_name', 'Unga Putri');
      localStorage.setItem('tatadana_user_email', 'ungaaputrii@gmail.com');
    }

    router.push('/admin/users');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-white text-xs">
        Memuat sesi impersonasi pengguna...
      </div>
    );
  }

  const totalBalance = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] pb-16">
      {/* 1. Mandatory Impersonation Warning Banner & Return to Admin Button */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 text-white px-4 py-3 shadow-xl border-b-2 border-amber-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <span className="p-1 rounded bg-black/30 animate-pulse">⚠️</span>
            <span>
              <b>MODE IMPERSONASI AKTIF:</b> Anda sedang melihat dashboard keuangan sebagai{' '}
              <span className="underline font-extrabold text-white">{user.full_name || user.fullName}</span>{' '}
              ({user.email || user.phone_number || 'ID: ' + user.id}) tanpa memerlukan kata sandi.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReturnToAdmin}
              className="px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-black text-amber-300 hover:text-white font-extrabold text-xs flex items-center gap-1.5 border border-amber-400 shadow-md transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Panel Admin
            </button>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka di /dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* User Profile Card */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url || user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user.full_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">{user.full_name || user.fullName}</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-950 text-cyan-400 border border-cyan-800/60 font-bold uppercase">
                  {(user.plan || 'starter').toUpperCase()}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold">
                  {user.status === 'approved' ? 'Disetujui' : 'Aktif'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{user.email || '-'}</span>
                <span>•</span>
                <span>{user.phone_number || '-'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  Telegram: {user.telegram_connection_status === 'connected' ? '✓ Terhubung' : 'Offline'}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Total Kekayaan Bersih</div>
            <div className="text-2xl font-black text-white mt-0.5">{formatRupiah(totalBalance)}</div>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Total Pemasukan
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{formatRupiah(totalIncome)}</div>
          </div>
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-400" /> Total Pengeluaran
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">{formatRupiah(totalExpense)}</div>
          </div>
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-cyan-400" /> Arus Kas Bersih
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${totalIncome - totalExpense >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {formatRupiah(totalIncome - totalExpense)}
            </div>
          </div>
        </div>

        {/* Multi-Wallet Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-400" />
            Daftar Dompet Pengguna ({wallets.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map(w => (
              <div key={w.id} className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-md flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white">{w.name}</div>
                  <div className="text-[11px] text-slate-400 capitalize">{w.type || 'Dompet'}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-cyan-400">{formatRupiah(w.balance || 0)}</div>
                  {w.is_default && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                      Utama
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xl overflow-hidden space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              Transaksi Terakhir Pengguna
            </h2>
            <span className="text-xs text-slate-400">{transactions.length} transaksi dimuat</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Catatan / Kategori</th>
                  <th className="py-2.5 px-3">Dompet</th>
                  <th className="py-2.5 px-3">Sumber</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      User belum memiliki riwayat transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-blue-950/20 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {formatWIBDate(t.transaction_date || (t as any).transactionDate)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{t.notes || t.category?.name || 'Transaksi'}</div>
                        <div className="text-[11px] text-slate-400">{t.category?.name || (t as any).categoryName || '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {t.wallet?.name || (t as any).walletName || 'Dompet'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {t.source || 'web'}
                      </td>
                      <td className={`py-3 px-3 text-right font-extrabold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'} {formatRupiah(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090D16] flex items-center justify-center text-white text-xs">Memuat...</div>}>
      <ImpersonateContent />
    </Suspense>
  );
}
