'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  User,
  Eye,
  Shield,
  Search,
  Receipt,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Check,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';
import { Transaction } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDate } from '@/lib/utils/date';
import { dataStore } from '@/lib/storage-mock';
import UserProfileModal from '@/components/admin/UserProfileModal';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'pro' | 'starter'>('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const handleApproveUser = async (u: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, action: 'approve' }),
      });
      if (res.ok) {
        setActionNotice(`✅ Pendaftaran user ${u.full_name || u.email} resmi DISETUJUI! Akses platform langsung aktif.`);
        setTimeout(() => setActionNotice(null), 4000);
        await loadUsers();
      }
    } catch (e) {
      console.error('Failed to approve user:', e);
    }
  };

  const handleRejectUser = async (u: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, action: 'reject' }),
      });
      if (res.ok) {
        setActionNotice(`❌ Pendaftaran user ${u.full_name || u.email} berhasil DITOLAK.`);
        setTimeout(() => setActionNotice(null), 4000);
        await loadUsers();
      }
    } catch (e) {
      console.error('Failed to reject user:', e);
    }
  };

  const handleInspectTransactions = async (u: any) => {
    setSelectedUser(u);
    setInspectModalOpen(true);
    setLoadingTx(true);
    try {
      const res = await fetch(`/api/admin/user-transactions?userId=${u.id}&adminId=adm_unga_01`);
      const data = await res.json();
      setUserTransactions(data.transactions || []);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleChangePlan = async (userId: string, newPlan: 'starter' | 'pro') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: newPlan }),
      });
      if (res.ok) {
        setActionNotice(`Paket user berhasil diubah menjadi ${newPlan.toUpperCase()}`);
        setTimeout(() => setActionNotice(null), 3000);
        await loadUsers();
      }
    } catch (e) {
      console.error('Failed to change user plan:', e);
    }
  };

  const handleImpersonateUser = (u: any) => {
    dataStore.auditLogs.unshift({
      id: 'aud_' + Date.now(),
      admin_id: 'adm_unga_01',
      adminId: 'adm_unga_01',
      adminName: 'Unga Putri (Superadmin)',
      action: 'IMPERSONATE_USER',
      target_user_id: u.id,
      targetUserId: u.id,
      targetUserName: u.full_name || u.name,
      details: `Superadmin Unga Putri login sebagai pengguna ${u.full_name || u.name} tanpa sandi`,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_user_name', u.full_name || u.name);
      localStorage.setItem('tatadana_user_email', u.email || 'user@tatadana.app');
      localStorage.setItem('tatadana_user_role', 'user');
      localStorage.setItem('tatadana_impersonated_user_id', u.id);
    }

    // Navigate to dedicated Impersonation View with persistent banner & return button
    router.push(`/admin/impersonate?userId=${u.id}`);
  };

  const filteredUsers = users.filter((u) => {
    // 1. Text Search
    if (search) {
      const q = search.toLowerCase();
      const matchName = (u.full_name || '').toLowerCase().includes(q);
      const matchPhone = (u.phone_number || '').includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }

    // 2. Status Filter
    const uStatus = (u.status || u.approval_status || 'approved').toLowerCase();
    if (statusFilter === 'pending') return uStatus === 'pending';
    if (statusFilter === 'approved') return uStatus === 'approved';
    if (statusFilter === 'rejected') return uStatus === 'rejected';
    if (statusFilter === 'pro') return u.plan === 'pro';
    if (statusFilter === 'starter') return u.plan !== 'pro';

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-3.5 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-400" />
            Kelola Pengguna Platform
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Daftar user aktif, approval registrasi baru, status langganan, dan fasilitas impersonasi akun.
          </p>
        </div>

        <button
          onClick={() => window.open('/api/admin/export-all?format=excel', '_blank')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-xs font-semibold rounded-xl text-emerald-300 border border-emerald-800/60 shadow-sm transition-all self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Ekspor Data Excel
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#0F172A] p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, atau nomor HP pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-900 rounded-xl border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'Semua User' },
              { id: 'pending', label: `Pending Approval (${users.filter(u => (u.status || u.approval_status) === 'pending').length})` },
              { id: 'approved', label: 'Disetujui' },
              { id: 'rejected', label: 'Ditolak' },
              { id: 'pro', label: 'Pro' },
              { id: 'starter', label: 'Starter' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === f.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Nama & Kontak</th>
                <th className="py-3 px-4">Status Registrasi</th>
                <th className="py-3 px-4">Paket Aktif</th>
                <th className="py-3 px-4">Status Bot</th>
                <th className="py-3 px-4">Total Tx</th>
                <th className="py-3 px-4">Dompet</th>
                <th className="py-3 px-4 text-center">Aksi Superadmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Tidak ada pengguna pada kriteria filter ini.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const uStatus = (u.status || u.approval_status || 'approved').toLowerCase();
                  return (
                    <tr key={u.id} className="hover:bg-blue-950/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          {u.full_name}
                          {u.role === 'superadmin' ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-cyan-400 font-bold border border-cyan-800/60">
                              SUPERADMIN
                            </span>
                          ) : (u.is_whatsapp_verified || u.whatsapp_verified) ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-800/60 flex items-center gap-0.5" title="Nomor WhatsApp Terverifikasi">
                              <CheckCircle2 className="w-2.5 h-2.5" /> WA OK
                            </span>
                          ) : null}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">{u.phone_number || u.email || '-'}</div>
                      </td>

                      {/* Status Registrasi */}
                      <td className="py-3.5 px-4">
                        {uStatus === 'approved' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Disetujui
                          </span>
                        )}
                        {uStatus === 'pending' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-950/70 text-amber-400 border border-amber-800/60 animate-pulse flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" /> Menunggu Approval
                          </span>
                        )}
                        {uStatus === 'rejected' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-950/70 text-rose-400 border border-rose-800/60 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> Ditolak
                          </span>
                        )}
                      </td>

                      {/* Paket Aktif */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.plan === 'pro'
                              ? 'bg-blue-950/70 text-cyan-400 border border-cyan-800/60'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {u.plan ? u.plan.toUpperCase() : 'STARTER'}
                          </span>
                          <button
                            onClick={() => handleChangePlan(u.id, u.plan === 'pro' ? 'starter' : 'pro')}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                          >
                            Ubah
                          </button>
                        </div>
                      </td>

                      {/* Status Telegram */}
                      <td className="py-3.5 px-4">
                        {u.telegram_connection_status === 'connected' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                            ✓ Terhubung
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-500 border border-slate-700">
                            Belum
                          </span>
                        )}
                      </td>

                      {/* Total Tx */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {u.transaction_count ?? 0} tx
                      </td>

                      {/* Wallets */}
                      <td className="py-3.5 px-4 text-slate-400">{u.wallet_count || 1} dompet</td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Approve / Reject buttons if pending */}
                          {uStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveUser(u)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                                title="Setujui pendaftaran user"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectUser(u)}
                                className="px-2.5 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-[11px] flex items-center gap-1 transition-all"
                                title="Tolak pendaftaran user"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => {
                              setSelectedProfileUser(u);
                              setProfileModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 font-semibold text-[11px] flex items-center gap-1 transition-all"
                            title="Lihat profil lengkap user (WhatsApp, dompet, transaksi, paket)"
                          >
                            <User className="w-3 h-3 text-cyan-400" /> Profil
                          </button>

                          <button
                            onClick={() => handleInspectTransactions(u)}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-all"
                            title="Lihat transaksi (dengan audit log)"
                          >
                            <Receipt className="w-3 h-3 text-cyan-400" /> Transaksi
                          </button>

                          <button
                            onClick={() => handleImpersonateUser(u)}
                            className="px-2.5 py-1 rounded-xl bg-blue-950/70 hover:bg-blue-900 text-cyan-400 border border-cyan-800/60 font-semibold text-[11px] flex items-center gap-1 transition-all"
                            title="Impersonate akun ini tanpa kata sandi"
                          >
                            <Eye className="w-3 h-3" /> Masuk Akun
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Inspection Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={selectedProfileUser}
        onApprove={handleApproveUser}
        onReject={handleRejectUser}
        onChangePlan={handleChangePlan}
        onImpersonate={handleImpersonateUser}
      />

      {/* Transaction Inspection Modal (with Mandatory Audit Trail) */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title={`Inspeksi Transaksi: ${selectedUser?.full_name || ''}`}
        description="Aksi ini dicatat dalam log audit privasi demi keamanan pengguna."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-950/60 rounded-xl border border-amber-800/60 text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <b>Catatan Kepatuhan:</b> Akses ke data transaksi ini telah dicatat ke audit log Superadmin Unga Putri.
            </span>
          </div>

          {loadingTx ? (
            <div className="text-center py-8 text-slate-500">Memuat transaksi pengguna...</div>
          ) : userTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">User ini belum memiliki transaksi.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
              {userTransactions.map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">
                      {tx.notes || tx.category?.name || 'Transaksi'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatWIBDate(tx.transaction_date || (tx as any).transactionDate)} • {tx.wallet?.name || 'Dompet'} • {tx.source}
                    </div>
                  </div>
                  <div
                    className={`font-bold ${
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
      </Modal>
    </div>
  );
}
