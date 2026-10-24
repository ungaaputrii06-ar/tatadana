'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowRightLeft,
  Check,
  Star,
  Sparkles,
  CreditCard,
  Landmark,
  Smartphone,
  Banknote,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatRupiah } from '@/lib/utils/currency';
import { Wallet } from '@/lib/types';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // New Wallet Modal
  const [isNewWalletModalOpen, setIsNewWalletModalOpen] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [walletColor, setWalletColor] = useState('#2563EB');
  const [submittingWallet, setSubmittingWallet] = useState(false);
  const [walletError, setWalletError] = useState('');

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferError, setTransferError] = useState('');

  const userId = 'usr_bunga_01';

  useEffect(() => {
    fetchWallets();
    const handleUpdate = () => {
      fetchWallets();
    };
    window.addEventListener('tatadana_data_updated', handleUpdate);
    const interval = setInterval(fetchWallets, 3000);
    return () => {
      window.removeEventListener('tatadana_data_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchWallets = async () => {
    try {
      const res = await fetch(`/api/wallets?userId=${userId}`);
      const data = await res.json();
      setWallets(data.wallets || []);
      if (data.wallets && data.wallets.length >= 2) {
        setFromWalletId(data.wallets[0].id);
        setToWalletId(data.wallets[1].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (walletId: string) => {
    try {
      const res = await fetch('/api/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, isDefault: true }),
      });
      if (res.ok) {
        await fetchWallets();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    setWalletError('');
    setSubmittingWallet(true);

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: walletName.trim(),
          initialBalance: Number(initialBalance || 0),
          color: walletColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWalletError(data.error || 'Gagal membuat dompet.');
      } else {
        setIsNewWalletModalOpen(false);
        setWalletName('');
        setInitialBalance('');
        await fetchWallets();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
      }
    } catch {
      setWalletError('Terjadi kesalahan jaringan.');
    } finally {
      setSubmittingWallet(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAmount || Number(transferAmount) <= 0) return;
    if (fromWalletId === toWalletId) {
      setTransferError('Dompet asal dan tujuan tidak boleh sama.');
      return;
    }

    setTransferError('');
    setSubmittingTransfer(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          walletId: fromWalletId,
          toWalletId,
          type: 'transfer',
          amount: Number(transferAmount),
          notes: transferNotes || 'Transfer saldo antar dompet',
        }),
      });

      if (!res.ok) {
        setTransferError('Gagal melakukan transfer.');
      } else {
        setIsTransferModalOpen(false);
        setTransferAmount('');
        setTransferNotes('');
        await fetchWallets();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
      }
    } catch {
      setTransferError('Terjadi kesalahan jaringan.');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <WalletIcon className="w-7 h-7 text-cyan-400" />
            Manajemen Multi-Dompet
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola rekening bank (BCA, Mandiri), e-wallet (GoPay, OVO), dan kas tunai. Tentukan 1 dompet default untuk Telegram bot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTransferError('');
              setIsTransferModalOpen(true);
            }}
            className="border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            Transfer Antar Dompet
          </button>

          <button
            onClick={() => {
              setWalletError('');
              setIsNewWalletModalOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Dompet Baru
          </button>
        </div>
      </div>

      {/* Summary Total */}
      <div className="bg-gradient-to-r from-blue-950/60 via-[#0F172A] to-[#0F172A] border border-cyan-800/40 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Total Kekayaan Terpantau
            </span>
            <div className="text-3xl sm:text-4xl font-black mt-1 tracking-tight text-white">
              {formatRupiah(totalBalance)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Terdistribusi di {wallets.length} dompet aktif (BCA, E-Wallet, & Kas Tunai)
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-950 text-cyan-400 border border-cyan-800/60 self-start sm:self-auto flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-cyan-400" />
            Terhubung ke Telegram @ungakeuanganbot
          </span>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {wallets.map((w) => {
          return (
            <div key={w.id} className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-4 relative overflow-hidden hover:border-cyan-500/40 transition-all shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-md"
                    style={{ backgroundColor: w.colorHex || w.color || '#2563EB' }}
                  >
                    <WalletIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-base text-white">{w.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">ID: {w.id}</div>
                  </div>
                </div>

                {w.is_default || w.isDefault ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-950 text-cyan-400 border border-cyan-800/60 flex items-center">
                    <Star className="w-3 h-3 fill-cyan-400 mr-1" /> Default Bot
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(w.id)}
                    className="text-[11px] text-slate-400 hover:text-cyan-400 font-semibold transition-colors"
                  >
                    Jadikan Default
                  </button>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">Saldo Saat Ini</div>
                <div className="text-2xl font-black text-cyan-400 mt-0.5">
                  {formatRupiah(w.balance)}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  {w.is_default || w.isDefault
                    ? 'Transaksi Telegram otomatis masuk ke sini'
                    : 'Bisa dipilih saat catat transaksi'}
                </span>
                {!w.is_default && !w.isDefault && (
                  <button
                    className="text-cyan-400 hover:underline font-bold text-xs"
                    onClick={() => handleSetDefault(w.id)}
                  >
                    Set Default
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Dompet */}
      <Modal
        isOpen={isNewWalletModalOpen}
        onClose={() => setIsNewWalletModalOpen(false)}
        title="Tambah Dompet Baru"
        description="Buat rekening bank, e-wallet, atau pos simpanan baru"
      >
        <form onSubmit={handleCreateWallet} className="space-y-4 text-slate-200">
          {walletError && (
            <div className="p-3 bg-rose-950 border border-rose-800 text-rose-400 text-xs rounded-xl font-medium">
              {walletError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Pilih Tipe Akun & Instansi</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { name: 'BCA', type: 'bank', color: '#2563EB' },
                { name: 'Mandiri', type: 'bank', color: '#0284c7' },
                { name: 'BRI', type: 'bank', color: '#0369a1' },
                { name: 'GoPay', type: 'ewallet', color: '#00D2FF' },
                { name: 'OVO', type: 'ewallet', color: '#8b5cf6' },
                { name: 'ShopeePay', type: 'ewallet', color: '#ea580c' },
                { name: 'Tunai/Cash', type: 'cash', color: '#10b981' },
                { name: 'Tabungan Darurat', type: 'savings', color: '#6366f1' },
                { name: 'Kartu Kredit', type: 'credit_card', color: '#ef4444' }
              ].map((inst) => (
                <button
                  key={inst.name}
                  type="button"
                  onClick={() => {
                    setWalletName(inst.name);
                    setWalletColor(inst.color);
                  }}
                  className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                    walletName === inst.name
                      ? 'border-cyan-400 bg-blue-950 text-cyan-400 ring-1 ring-cyan-400'
                      : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {inst.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Nama Dompet Kustom</label>
            <input
              type="text"
              required
              placeholder="Contoh: BCA Prioritas, Mandiri Payroll, Kas Kecil"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#131B2E] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Saldo Awal (Rp)
            </label>
            <input
              type="number"
              placeholder="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#131B2E] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm font-bold font-mono transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Warna Kartu Dompet</label>
            <div className="flex items-center gap-3">
              {['#2563EB', '#00D2FF', '#10b981', '#a855f7', '#ef4444', '#06b6d4', '#f59e0b'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setWalletColor(col)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    walletColor === col ? 'ring-2 ring-offset-2 ring-offset-black ring-cyan-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Jadikan Dompet Utama Telegram</div>
              <div className="text-[11px] text-slate-400">Transaksi teks bot Telegram otomatis memakai dompet ini</div>
            </div>
            <input
              type="checkbox"
              defaultChecked={wallets.length === 0}
              className="w-4 h-4 text-cyan-500 rounded border-slate-700 focus:ring-cyan-400"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              onClick={() => setIsNewWalletModalOpen(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingWallet}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25"
            >
              Simpan Dompet
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Transfer Antar Dompet */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Saldo Antar Dompet"
        description="Pindahkan dana antar rekening atau dompet digital tanpa mengubah total kekayaan"
      >
        <form onSubmit={handleTransfer} className="space-y-4 text-slate-200">
          {transferError && (
            <div className="p-3 bg-rose-950 border border-rose-800 text-rose-400 text-xs rounded-xl font-medium">
              {transferError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Dari Dompet (Asal)
              </label>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#131B2E] text-white focus:outline-none focus:border-cyan-400 text-xs font-medium"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Ke Dompet (Tujuan)
              </label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#131B2E] text-white focus:outline-none focus:border-cyan-400 text-xs font-medium"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Nominal Transfer (Rp)
            </label>
            <input
              type="number"
              required
              placeholder="0"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#131B2E] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm font-bold font-mono transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Catatan Transfer (Opsional)
            </label>
            <input
              type="text"
              placeholder="Cth: Top-up saldo GoPay dari BCA"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#131B2E] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              onClick={() => setIsTransferModalOpen(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingTransfer}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25"
            >
              Kirim Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
