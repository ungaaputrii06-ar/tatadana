'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Receipt,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDate, formatWIBDateTime } from '@/lib/utils/date';
import { Transaction, Wallet, Category, TransactionType } from '@/lib/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '7d' | '1m' | 'all'>('1m');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [formWalletId, setFormWalletId] = useState('');
  const [formToWalletId, setFormToWalletId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Export State
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const handlePrint = () => {
    setShowPdfMenu(false);
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const userId = 'usr_bunga_01';

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('tatadana_data_updated', handleUpdate);
    const interval = setInterval(loadData, 2500);
    return () => {
      window.removeEventListener('tatadana_data_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      const [txRes, wRes, cRes] = await Promise.all([
        fetch(`/api/transactions?userId=${userId}`),
        fetch(`/api/wallets?userId=${userId}`),
        fetch(`/api/categories?userId=${userId}`),
      ]);

      const txData = await txRes.json();
      const wData = await wRes.json();
      const cData = await cRes.json();

      setTransactions(txData.transactions || []);
      setWallets(wData.wallets || []);
      setCategories(cData.categories || []);

      if (wData.wallets && wData.wallets.length > 0) {
        setFormWalletId(wData.wallets[0].id);
        if (wData.wallets.length > 1) {
          setFormToWalletId(wData.wallets[1].id);
        }
      }
      if (cData.categories && cData.categories.length > 0) {
        setFormCategoryId(cData.categories[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(format);
    setShowPdfMenu(false);
    setShowExcelMenu(false);
    try {
      const endpoint =
        format === 'pdf'
          ? '/api/reports/export-pdf'
          : format === 'csv'
          ? '/api/reports/export-csv'
          : '/api/reports/export-excel';

      let startDate: string | undefined = undefined;
      const now = new Date();
      if (selectedPeriod === '1d') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (selectedPeriod === '7d') {
        startDate = new Date(now.getTime() - 7 * 86400000).toISOString();
      } else if (selectedPeriod === '1m') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          startDate,
          walletId: selectedWallet !== 'all' ? selectedWallet : undefined,
          type: selectedType !== 'all' ? selectedType : undefined,
          format,
        }),
      });

      if (!res.ok) {
        alert('Gagal mendownload file transaksi.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
      a.download = `TataDana_Transaksi_${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportSuccessMessage(
        format === 'pdf'
          ? '📄 File PDF berhasil diunduh!'
          : format === 'excel'
          ? '📊 File Excel (.xlsx) berhasil diunduh!'
          : '📝 File CSV berhasil diunduh!'
      );
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          walletId: formWalletId,
          toWalletId: modalMode === 'transfer' ? formToWalletId : undefined,
          categoryId: modalMode !== 'transfer' ? formCategoryId : undefined,
          type: modalMode,
          amount: Number(amount),
          notes,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setAmount('');
        setNotes('');
        await loadData();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isWithinPeriod = (dateStr: string | undefined, period: '1d' | '7d' | '1m' | 'all') => {
    if (period === 'all') return true;
    if (!dateStr) return false;
    const txTime = new Date(dateStr).getTime();
    if (isNaN(txTime)) return false;
    const now = new Date();

    if (period === '1d') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return txTime >= startOfDay;
    }
    if (period === '7d') {
      const sevenDaysAgo = now.getTime() - 7 * 86400000;
      return txTime >= sevenDaysAgo;
    }
    if (period === '1m') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return txTime >= startOfMonth;
    }
    return true;
  };

  const filteredTransactions = transactions.filter((tx) => {
    const txDate = tx.transaction_date || tx.transactionDate || tx.created_at;
    if (!isWithinPeriod(txDate, selectedPeriod)) return false;
    if (selectedType !== 'all' && tx.type !== selectedType) return false;
    if (selectedWallet !== 'all' && tx.wallet_id !== selectedWallet) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNote = (tx.notes || '').toLowerCase().includes(q);
      const matchCat = (tx.category?.name || '').toLowerCase().includes(q);
      if (!matchNote && !matchCat) return false;
    }
    return true;
  });

  // Calculate Period Metrics
  const periodIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodNet = periodIncome - periodExpense;
  const periodDaysCount = selectedPeriod === '1d' ? 1 : selectedPeriod === '7d' ? 7 : 30;
  const dailyAverage = Math.round(periodExpense / periodDaysCount);

  return (
    <div className="space-y-6">
      {/* Print-Only Executive Header Block (Visible only when Cetak / window.print is active) */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-black">TataDana — Laporan Transaksi Keuangan</h1>
            <p className="text-xs text-gray-700">Pengguna: Bunga Putri (bungaputri@gmail.com | +6281298765432)</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Waktu Cetak: {formatWIBDateTime()}</p>
            <p>Filter Aktif: {selectedPeriod === '1d' ? '1 Hari Terakhir' : selectedPeriod === '7d' ? '7 Hari Terakhir' : selectedPeriod === '1m' ? '1 Bulan Ini' : 'Semua Riwayat'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-gray-200 text-xs">
          <div>Total Pemasukan: <strong className="text-green-700">{formatRupiah(periodIncome)}</strong></div>
          <div>Total Pengeluaran: <strong className="text-red-700">{formatRupiah(periodExpense)}</strong></div>
          <div>Arus Kas Bersih: <strong className={periodNet >= 0 ? "text-green-700" : "text-red-700"}>{formatRupiah(periodNet)}</strong></div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {exportSuccessMessage && (
        <div className="no-print p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">{exportSuccessMessage}</span>
          </div>
          <button
            onClick={() => setExportSuccessMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Daftar Transaksi</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/70 text-cyan-400 border border-cyan-800/60">
              Multi-Periode
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pantau riwayat keuangan, cetak struk PDF, atau unduh laporan Excel (.xlsx) dengan filter fleksibel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cetak / PDF Button with Menu */}
          <div className="relative">
            <Button
              onClick={() => {
                setShowPdfMenu(!showPdfMenu);
                setShowExcelMenu(false);
              }}
              variant="outline"
              size="sm"
              loading={exporting === 'pdf'}
              className="border-slate-800 hover:border-cyan-500/40 bg-slate-900 text-slate-200 hover:text-white text-xs rounded-xl flex items-center gap-1.5 font-semibold"
              icon={<Printer className="w-4 h-4 text-rose-400" />}
            >
              <span>{exporting === 'pdf' ? 'Membuat PDF...' : 'Ekspor PDF'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>

            {showPdfMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl z-30 py-1.5 overflow-hidden">
                <button
                  onClick={handlePrint}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="font-semibold text-white">Cetak Transaksi</div>
                    <div className="text-[10px] text-slate-400">Dialog cetak printer / save PDF</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowPdfMenu(false);
                    handleExport('pdf');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors border-t border-slate-800"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="font-semibold text-white">Unduh File PDF</div>
                    <div className="text-[10px] text-slate-400">File dokumen PDF resmi</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Unduh Excel Button with Menu */}
          <div className="relative">
            <Button
              onClick={() => {
                setShowExcelMenu(!showExcelMenu);
                setShowPdfMenu(false);
              }}
              variant="outline"
              size="sm"
              loading={exporting === 'excel' || exporting === 'csv'}
              className="border-slate-800 hover:border-cyan-500/40 bg-slate-900 text-slate-200 hover:text-white text-xs rounded-xl flex items-center gap-1.5 font-semibold"
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            >
              <span>{exporting === 'excel' ? 'Exporting...' : 'Ekspor Excel'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>

            {showExcelMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl z-30 py-1.5 overflow-hidden">
                <button
                  onClick={() => {
                    setShowExcelMenu(false);
                    handleExport('excel');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">Unduh Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-400">Spreadsheet format cell akuntansi</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowExcelMenu(false);
                    handleExport('csv');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors border-t border-slate-800"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">Unduh CSV (.csv)</div>
                    <div className="text-[10px] text-slate-400">Format data standar koma</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              setModalMode('expense');
              setIsModalOpen(true);
            }}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25"
            icon={<Plus className="w-4 h-4" />}
          >
            Tambah Transaksi
          </Button>
          <Button
            onClick={() => {
              setModalMode('transfer');
              setIsModalOpen(true);
            }}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 text-xs rounded-xl font-semibold"
            icon={<ArrowRightLeft className="w-4 h-4" />}
          >
            Transfer Dompet
          </Button>
        </div>
      </div>

      {/* 4 PERIOD ANALYTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pemasukan Periode */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              Pemasukan ({selectedPeriod === '1d' ? 'Hari Ini' : selectedPeriod === '7d' ? '7 Hari' : selectedPeriod === '1m' ? 'Bulan Ini' : 'Semua'})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white mt-2">
            {formatRupiah(periodIncome)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-semibold">
            +{filteredTransactions.filter(t => t.type === 'income').length} transaksi masuk
          </div>
        </div>

        {/* Pengeluaran Periode */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              Pengeluaran ({selectedPeriod === '1d' ? 'Hari Ini' : selectedPeriod === '7d' ? '7 Hari' : selectedPeriod === '1m' ? 'Bulan Ini' : 'Semua'})
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white mt-2">
            {formatRupiah(periodExpense)}
          </div>
          <div className="text-[11px] text-rose-400 mt-1 font-semibold">
            -{filteredTransactions.filter(t => t.type === 'expense').length} transaksi belanja
          </div>
        </div>

        {/* Arus Kas Bersih */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Arus Kas Bersih (Net)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              periodNet >= 0 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
            }`}>
              {periodNet >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-lg sm:text-xl font-black mt-2 ${periodNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatRupiah(periodNet)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {periodNet >= 0 ? '✨ Surplus arus kas positif' : '⚠️ Defisit pengeluaran'}
          </div>
        </div>

        {/* Rata-rata Harian & Total */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Rata-rata Pengeluaran / Hari</span>
            <div className="w-8 h-8 rounded-xl bg-blue-950/60 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white mt-2">
            {formatRupiah(dailyAverage)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Total {filteredTransactions.length} transaksi di periode ini
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS: PERIOD BUTTONS & FILTERS */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl no-print">
        {/* Quick Period Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Pilih Rentang Waktu:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {[
              { id: '1d', label: '1 Hari (Hari Ini)', icon: '⚡' },
              { id: '7d', label: '7 Hari Terakhir', icon: '📅' },
              { id: '1m', label: '1 Bulan (Bulan Ini)', icon: '🗓️' },
              { id: 'all', label: 'Semua Transaksi', icon: '📊' },
            ].map((p) => {
              const active = selectedPeriod === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Type, and Wallet Filters */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari transaksi berdasarkan catatan atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 text-slate-200 w-full md:w-auto font-medium"
          >
            <option value="all">Semua Jenis Transaksi</option>
            <option value="expense">Hanya Pengeluaran (Expense)</option>
            <option value="income">Hanya Pemasukan (Income)</option>
            <option value="transfer">Hanya Transfer Antar Dompet</option>
          </select>

          {/* Wallet Filter */}
          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 text-slate-200 w-full md:w-auto font-medium"
          >
            <option value="all">Semua Dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <Card className="overflow-hidden p-0 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal & Jam</th>
                <th className="py-3 px-4">Kategori & Catatan</th>
                <th className="py-3 px-4">Dompet</th>
                <th className="py-3 px-4">Sumber</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    Tidak ada transaksi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isExpanded = expandedTxId === tx.id;
                  const hasReceiptItems = tx.receipt_items && tx.receipt_items.length > 0;

                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-blue-950/20 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400 font-medium">
                          {formatWIBDate(tx.transaction_date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">
                              {tx.category?.emoji || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '🔁' : '💸')}
                            </span>
                            <div>
                              <div className="font-semibold text-white">
                                {tx.notes || tx.category?.name || 'Transaksi'}
                              </div>
                              <div className="text-xs text-slate-400">
                                {tx.type === 'transfer'
                                  ? `Transfer ke ${tx.to_wallet?.name || 'Dompet Lain'}`
                                  : tx.category?.name || 'Umum'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-300">
                          {tx.wallet?.name || '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tx.source === 'telegram_text' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-950/70 text-cyan-400 border border-cyan-800/60">
                              🤖 Telegram Chat
                            </span>
                          )}
                          {tx.source === 'telegram_receipt' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-950/70 text-amber-400 border border-amber-800/60">
                              📸 Struk OCR
                            </span>
                          )}
                          {tx.source === 'telegram_voice' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-950/70 text-purple-400 border border-purple-800/60">
                              🎙️ Voice Note
                            </span>
                          )}
                          {tx.source === 'web_manual' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              💻 Web Input
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-3.5 px-4 whitespace-nowrap text-right font-black text-sm ${
                            tx.type === 'income'
                              ? 'text-emerald-400'
                              : tx.type === 'transfer'
                              ? 'text-cyan-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatRupiah(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {hasReceiptItems ? (
                            <button
                              onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/60"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Tutup Item' : `Lihat (${tx.receipt_items?.length})`}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Receipt Breakdown Row */}
                      {isExpanded && hasReceiptItems && (
                        <tr className="bg-slate-900/60 border-b border-slate-800">
                          <td colSpan={6} className="p-4">
                            <div className="bg-[#090D16] rounded-xl border border-cyan-800/60 p-4 shadow-xl max-w-2xl mx-auto">
                              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                  <Receipt className="w-4 h-4 text-cyan-400" />
                                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                                    Rincian Item Struk Belanja (OCR Vision)
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-cyan-400">
                                  Total: {formatRupiah(tx.amount)}
                                </span>
                              </div>
                              <div className="divide-y divide-slate-800 text-xs">
                                {tx.receipt_items?.map((item, idx) => (
                                  <div key={idx} className="py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-blue-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center text-[10px] font-bold">
                                        {idx + 1}
                                      </span>
                                      <span className="font-semibold text-slate-200">{item.item_name}</span>
                                      {item.category_name && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                                          {item.category_name}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-white">
                                      {formatRupiah(item.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Transfer Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'transfer'
            ? 'Transfer Antar Dompet'
            : modalMode === 'income'
            ? 'Catat Pemasukan'
            : 'Catat Pengeluaran'
        }
        description="Data akan langsung memengaruhi saldo dompetmu."
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nominal Transaksi (Rp)
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="Contoh: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 focus:outline-none focus:border-cyan-400 text-sm font-semibold text-white placeholder-slate-500"
            />
          </div>

          {modalMode === 'transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dari Dompet
                </label>
                <select
                  value={formWalletId}
                  onChange={(e) => setFormWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 focus:outline-none focus:border-cyan-400 text-sm text-slate-200 font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ke Dompet
                </label>
                <select
                  value={formToWalletId}
                  onChange={(e) => setFormToWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 focus:outline-none focus:border-cyan-400 text-sm text-slate-200 font-medium"
                >
                  {wallets
                    .filter((w) => w.id !== formWalletId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Dompet
                </label>
                <select
                  value={formWalletId}
                  onChange={(e) => setFormWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 focus:outline-none focus:border-cyan-400 text-sm text-slate-200 font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 focus:outline-none focus:border-cyan-400 text-sm text-slate-200 font-medium"
                >
                  {categories
                    .filter((c) => (modalMode === 'income' ? c.type === 'income' : c.type === 'expense'))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Makan siang, bayar tagihan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 focus:outline-none focus:border-cyan-400 text-sm text-white placeholder-slate-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold"
            >
              Simpan Transaksi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
