'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { PaymentRecord } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDate } from '@/lib/utils/date';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      setPayments(data.payments || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action, adminId: 'adm_unga_01' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice(action === 'approve'
          ? '✅ Transaksi berhasil disetujui! Status user otomatis menjadi PRO (Unlimited) dan tersinkronisasi ke seluruh database.'
          : '❌ Transaksi berhasil ditolak.'
        );
        setTimeout(() => setActionNotice(null), 5000);
        await loadPayments();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
      }
    } catch (e) {
      console.error('Failed to process payment:', e);
    }
  };

  const filtered = payments.filter((p) => {
    if (filter === 'pending') return p.status === 'pending' || p.status === 'manual_pending';
    if (filter === 'approved') return p.status === 'settlement' || p.status === 'approved_manual' || p.status === 'success';
    if (filter === 'rejected') return p.status === 'rejected' || p.status === 'rejected_manual';
    return true;
  });

  return (
    <div className="space-y-6">
      {actionNotice && (
        <div className="p-3.5 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-cyan-400" />
            Approval Pembayaran & Midtrans Gateway
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Verifikasi transfer manual bank dan pantau status transaksi otomatis gateway Midtrans.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pending', label: 'Menunggu Approval' },
            { id: 'approved', label: 'Disetujui' },
            { id: 'rejected', label: 'Ditolak' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === f.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Order ID & Tanggal</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Paket</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi Superadmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Tidak ada pembayaran pada filter ini.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-950/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-white">{p.order_id || p.orderId}</div>
                      <div className="text-[11px] text-slate-400">
                        {formatWIBDate(p.created_at || p.createdAt || new Date().toISOString())}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{p.user?.full_name || p.userName || 'User'}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{p.user?.phone_number || p.userEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/70 text-cyan-400 border border-cyan-800/60 uppercase">
                        {(p.plan || 'pro').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 capitalize">
                      {p.payment_type?.replace(/_/g, ' ') || p.paymentMethod || 'Manual Transfer'}
                    </td>
                    <td className="py-3.5 px-4">
                      {(p.status === 'success' || p.status === 'approved_manual' || p.status === 'settlement') && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                          Disetujui
                        </span>
                      )}
                      {(p.status === 'manual_pending' || p.status === 'pending') && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-950/70 text-amber-400 border border-amber-800/60 animate-pulse">
                          Menunggu Approval
                        </span>
                      )}
                      {(p.status === 'rejected' || p.status === 'rejected_manual') && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-950/70 text-rose-400 border border-rose-800/60">
                          Ditolak
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === 'manual_pending' || p.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAction(p.id, 'approve')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-md transition-all"
                            title="Setujui dan Upgrade ke Pro"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(p.id, 'reject')}
                            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                            title="Tolak pembayaran ini"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs font-medium">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
