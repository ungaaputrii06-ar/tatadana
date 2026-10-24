'use client';

import React from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CreditCard,
  Wallet,
  Receipt,
  Eye,
  Check,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDate, formatWIBDateTime } from '@/lib/utils/date';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  onApprove?: (user: any) => void;
  onReject?: (user: any) => void;
  onChangePlan?: (userId: string, newPlan: 'starter' | 'pro') => void;
  onImpersonate?: (user: any) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onApprove,
  onReject,
  onChangePlan,
  onImpersonate,
}: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const isWhatsAppVerified =
    user.is_whatsapp_verified ??
    user.whatsapp_verified ??
    user.whatsappVerified ??
    user.is_phone_verified ??
    user.phoneVerified ??
    true;

  const userStatus = (user.status || user.approval_status || 'approved').toLowerCase();
  const userPlan = (user.plan || user.subscriptionPlan || 'starter').toLowerCase();
  const wallets = user.wallets || [
    {
      id: 'w_default',
      name: 'Dompet Utama',
      type: 'cash',
      balance: user.total_balance || 0,
      is_default: true,
    },
  ];
  const totalBalance =
    user.total_balance ??
    wallets.reduce((sum: number, w: any) => sum + (Number(w.balance) || 0), 0);

  const transactions = user.transactions || [];
  const registrationDate =
    user.registration_date || user.created_at || user.createdAt || new Date().toISOString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-800/90 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              {user.avatar_url || user.avatarUrl ? (
                <img
                  src={user.avatar_url || user.avatarUrl}
                  alt={user.full_name || user.name || 'User'}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-cyan-400 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-blue-500/20">
                  {(user.full_name || user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {isWhatsAppVerified && (
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0B0F19] flex items-center justify-center text-[9px] text-white font-bold"
                  title="Nomor WhatsApp Terverifikasi"
                >
                  ✓
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {user.full_name || user.fullName || user.name || 'Pengguna TataDana'}
                </h2>
                {user.role === 'superadmin' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-cyan-400 font-bold border border-cyan-800/60 uppercase">
                    Superadmin
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700 uppercase">
                    User
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                <span>{user.email || 'Tanpa email terdaftar'}</span>
                <span>•</span>
                <span>ID: {user.id}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Status Verification & Registration Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* WhatsApp Verification Card */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isWhatsAppVerified
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  isWhatsAppVerified ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                  {isWhatsAppVerified ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Terverifikasi WhatsApp
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      Pending Verifikasi WhatsApp
                    </>
                  )}
                </div>
                <div className="font-mono text-xs font-semibold text-white mt-0.5">
                  {user.phone_number || user.phoneNumber || 'Belum ada nomor HP'}
                </div>
              </div>
            </div>

            {/* Registration Date Card */}
            <div className="p-3.5 rounded-2xl border bg-slate-900/80 border-slate-800 text-slate-300 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-cyan-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Tanggal Mendaftar
                </div>
                <div className="font-semibold text-white text-xs mt-0.5">
                  {formatWIBDate(registrationDate)}
                </div>
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Informasi Akun & Hak Akses
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Status Persetujuan</span>
                <span className="font-bold text-white capitalize mt-0.5 inline-block">
                  {userStatus === 'approved' && <span className="text-emerald-400">✓ Disetujui</span>}
                  {userStatus === 'pending' && <span className="text-amber-400">⏳ Menunggu</span>}
                  {userStatus === 'rejected' && <span className="text-rose-400">✗ Ditolak</span>}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Paket Langganan</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                      userPlan === 'pro'
                        ? 'bg-blue-950 text-cyan-300 border border-cyan-800/60'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {userPlan}
                  </span>
                  {onChangePlan && (
                    <button
                      onClick={() => onChangePlan(user.id, userPlan === 'pro' ? 'starter' : 'pro')}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
                    >
                      Ubah
                    </button>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Telegram Bot</span>
                <span className="font-semibold text-white mt-0.5 inline-block">
                  {user.telegram_connection_status === 'connected' ? (
                    <span className="text-emerald-400 font-bold">✓ Terhubung</span>
                  ) : (
                    <span className="text-slate-500 font-medium">Belum Link</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Wallet Summary Section */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400" />
                Ringkasan Dompet Pengguna
              </h3>
              <div className="text-xs font-bold text-emerald-400">
                Total: {formatRupiah(totalBalance)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {wallets.map((w: any) => (
                <div
                  key={w.id}
                  className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{w.name}</span>
                      {w.is_default && (
                        <span className="text-[9px] bg-blue-950 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-800/60">
                          Utama
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">{w.type || 'Bank'}</div>
                  </div>
                  <div className="font-mono font-bold text-cyan-300">
                    {formatRupiah(w.balance || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions Summary Section */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                Daftar Transaksi Pengguna ({transactions.length})
              </h3>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Belum ada transaksi yang tercatat untuk pengguna ini.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-800/80 pr-1">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1">
                        <span>{tx.notes || tx.category?.name || tx.categoryName || 'Transaksi'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatWIBDate(tx.transaction_date || tx.transactionDate || tx.created_at)} •{' '}
                        {tx.wallet?.name || tx.walletName || 'Dompet'}
                      </div>
                    </div>
                    <div
                      className={`font-mono font-bold ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatRupiah(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {userStatus === 'pending' && onApprove && (
              <button
                onClick={() => onApprove(user)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Approve Pendaftaran
              </button>
            )}
            {userStatus === 'pending' && onReject && (
              <button
                onClick={() => onReject(user)}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" /> Tolak
              </button>
            )}

            {onImpersonate && (
              <button
                onClick={() => onImpersonate(user)}
                className="px-3.5 py-2 rounded-xl bg-blue-950/70 hover:bg-blue-900 text-cyan-300 border border-cyan-800/60 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" /> Masuk Akun Ini (Impersonate)
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
