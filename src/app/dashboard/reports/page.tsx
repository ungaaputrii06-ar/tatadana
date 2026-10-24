'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  History,
  Calendar,
  Sparkles,
  Receipt,
  Layers,
  ArrowRight,
  Printer,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDate, formatWIBDateTime } from '@/lib/utils/date';
import { Transaction, Wallet, Category, ExportHistoryItem } from '@/lib/types';

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchNotes, setSearchNotes] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Receipt Multi-Item Expand State
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

  // Export State
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'laporan' | 'riwayat'>('laporan');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const userId = 'usr_bunga_01';

  useEffect(() => {
    fetchData();
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('tatadana_data_updated', handleUpdate);
    const interval = setInterval(fetchData, 3000);
    return () => {
      window.removeEventListener('tatadana_data_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [txRes, wRes, cRes, hRes] = await Promise.all([
        fetch(`/api/transactions?userId=${userId}`),
        fetch(`/api/wallets?userId=${userId}`),
        fetch(`/api/categories?userId=${userId}`),
        fetch(`/api/reports/history?userId=${userId}`),
      ]);

      const txData = await txRes.json();
      const wData = await wRes.json();
      const cData = await cRes.json();
      const hData = await hRes.json();

      setTransactions(txData.transactions || []);
      setWallets(wData.wallets || []);
      setCategories(cData.categories || []);
      setExportHistory(hData.history || []);
    } finally {
      setLoading(false);
    }
  };

  const toggleReceiptExpand = (txId: string) => {
    setExpandedTxIds((prev) => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  // Filter Transactions
  const filtered = transactions.filter((tx) => {
    const rawDate = tx.transaction_date || tx.transactionDate || '';
    if (startDate && new Date(rawDate) < new Date(startDate)) return false;
    if (endDate && new Date(rawDate) > new Date(endDate + 'T23:59:59')) return false;
    if (selectedCategory !== 'all' && (tx.category_id || tx.categoryId) !== selectedCategory) return false;
    if (selectedWallet !== 'all' && (tx.wallet_id || tx.walletId) !== selectedWallet) return false;
    if (selectedType !== 'all' && tx.type !== selectedType) return false;
    if (searchNotes) {
      const q = searchNotes.toLowerCase();
      const matchNote = (tx.notes || '').toLowerCase().includes(q);
      const matchCat = (tx.category?.name || tx.categoryName || '').toLowerCase().includes(q);
      if (!matchNote && !matchCat) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'date') {
      const rawA = a.transaction_date || a.transactionDate || '';
      const rawB = b.transaction_date || b.transactionDate || '';
      const timeA = new Date(rawA).getTime();
      const timeB = new Date(rawB).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }
    if (sortField === 'amount') {
      return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    }
    return 0;
  });

  // Pagination Slice
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Summary Metrics
  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  // Top 5 Expenses
  const categoryMap = new Map<string, { name: string; amount: number; color: string }>();
  filtered
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const name = t.category?.name || 'Lainnya';
      const color = t.category?.color || '#3B82F6';
      const current = categoryMap.get(name) || { name, amount: 0, color };
      current.amount += t.amount;
      categoryMap.set(name, current);
    });
  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(format);
    try {
      const endpoint =
        format === 'pdf'
          ? '/api/reports/export-pdf'
          : format === 'csv'
          ? '/api/reports/export-csv'
          : '/api/reports/export-excel';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
          walletId: selectedWallet !== 'all' ? selectedWallet : undefined,
          type: selectedType !== 'all' ? selectedType : undefined,
          format,
        }),
      });

      if (res.status === 403) {
        setUpgradeModalOpen(true);
        return;
      }

      if (!res.ok) {
        alert('Gagal mengekspor laporan.');
        return;
      }

      // Download file directly
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
      a.download = `TataDana_Laporan_${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportSuccessMessage(
        format === 'pdf'
          ? '📄 File Laporan PDF berhasil diunduh!'
          : format === 'excel'
          ? '📊 File Laporan Excel (.xlsx) berhasil diunduh!'
          : '📝 File Laporan CSV berhasil diunduh!'
      );
      setTimeout(() => setExportSuccessMessage(null), 4000);

      // Refresh history
      const hRes = await fetch(`/api/reports/history?userId=${userId}`);
      const hData = await hRes.json();
      setExportHistory(hData.history || []);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Executive Header Block */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-black">TataDana — Laporan Keuangan Pribadi</h1>
            <p className="text-xs text-gray-700">Pengguna: Bunga Putri (bungaputri@gmail.com | +6281298765432)</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Waktu Cetak: {formatWIBDateTime()}</p>
            <p>Periode: {startDate && endDate ? `${formatWIBDate(startDate)} s/d ${formatWIBDate(endDate)}` : 'Semua Riwayat'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-gray-200 text-xs">
          <div>Total Pemasukan: <strong className="text-green-700">{formatRupiah(totalIncome)}</strong></div>
          <div>Total Pengeluaran: <strong className="text-red-700">{formatRupiah(totalExpense)}</strong></div>
          <div>Arus Kas Bersih: <strong className={netCashflow >= 0 ? "text-green-700" : "text-red-700"}>{formatRupiah(netCashflow)}</strong></div>
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
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Laporan Keuangan Native
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              ⚡ Realtime Terhubung
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Tabel transaksi lengkap, analisis net cashflow, cetak printer, dan generator unduhan file PDF, Excel, & CSV.
          </p>
        </div>

        {/* Tab & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('laporan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'laporan'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 Tabel Laporan
            </button>
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'riwayat'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Riwayat Export ({exportHistory.length})
            </button>
          </div>

          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs rounded-xl font-semibold"
            icon={<Printer className="w-4 h-4 text-slate-400" />}
          >
            Cetak
          </Button>

          <Button
            onClick={() => handleExport('pdf')}
            loading={exporting === 'pdf'}
            variant="outline"
            size="sm"
            className="border-rose-900/60 hover:border-rose-700 bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 text-xs rounded-xl font-semibold"
            icon={<FileText className="w-4 h-4 text-rose-400" />}
          >
            Unduh PDF
          </Button>

          <Button
            onClick={() => handleExport('excel')}
            loading={exporting === 'excel'}
            variant="outline"
            size="sm"
            className="border-emerald-900/60 hover:border-emerald-700 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 text-xs rounded-xl font-semibold"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
          >
            Unduh Excel
          </Button>

          <Button
            onClick={() => handleExport('csv')}
            loading={exporting === 'csv'}
            variant="outline"
            size="sm"
            className="border-cyan-900/60 hover:border-cyan-700 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 text-xs rounded-xl font-semibold"
            icon={<Download className="w-4 h-4 text-cyan-400" />}
          >
            CSV
          </Button>
        </div>
      </div>

      {/* 4 Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Total Pemasukan
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {formatRupiah(totalIncome)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Sesuai filter periode aktif</div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">
            Total Pengeluaran
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {formatRupiah(totalExpense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Belanja & tagihan</div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            Net Cashflow
          </div>
          <div
            className={`text-xl sm:text-2xl font-black mt-1 ${
              netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatRupiah(netCashflow)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {netCashflow >= 0 ? '✨ Surplus kas positif' : '⚠️ Defisit kas'}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Jumlah Transaksi
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {filtered.length} Transaksi
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Tersimpan di Supabase</div>
        </div>
      </div>

      {activeTab === 'laporan' ? (
        <>
          {/* Top 5 Expense Categories Progress */}
          {topCategories.length > 0 && (
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">
                  Top 5 Pengeluaran Berdasarkan Kategori
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">Total: {formatRupiah(totalExpense)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {topCategories.map((c, i) => {
                  const pct = Math.round((c.amount / (totalExpense || 1)) * 100);
                  return (
                    <div key={i} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="truncate">{c.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 font-semibold">{formatRupiah(c.amount)}</div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="p-4 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl space-y-3 no-print">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filter & Pencarian Riwayat</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
              {/* Search Notes */}
              <div className="lg:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari catatan / nama item..."
                  value={searchNotes}
                  onChange={(e) => setSearchNotes(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 bg-slate-900 text-white placeholder-slate-500 transition-all font-medium"
                />
              </div>

              {/* Start Date */}
              <div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 bg-slate-900 text-slate-200 font-medium"
                  title="Tanggal Awal"
                />
              </div>

              {/* End Date */}
              <div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 bg-slate-900 text-slate-200 font-medium"
                  title="Tanggal Akhir"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 bg-slate-900 text-slate-200 font-medium"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Wallet Filter */}
              <div>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 bg-slate-900 text-slate-200 font-medium"
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
          </div>

          {/* Transactions Table with Sortable Columns & Accordion Expand */}
          <div className="overflow-hidden bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => toggleSort('date')}
                        className="flex items-center gap-1 hover:text-white font-semibold"
                      >
                        Tanggal <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Dompet</th>
                    <th className="py-3 px-4">Catatan / Detail</th>
                    <th className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleSort('amount')}
                        className="flex items-center gap-1 ml-auto hover:text-white font-semibold"
                      >
                        Nominal <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-center">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Tidak ada transaksi yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((tx) => {
                      const hasReceiptItems =
                        tx.receipt_items && tx.receipt_items.length > 0;
                      const isExpanded = !!expandedTxIds[tx.id];

                      return (
                        <React.Fragment key={tx.id}>
                          <tr className="hover:bg-blue-950/20 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-slate-200 whitespace-nowrap">
                              {formatWIBDate(tx.transaction_date)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  tx.type === 'income'
                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                                    : tx.type === 'expense'
                                    ? 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                                    : 'bg-blue-950/70 text-cyan-400 border border-blue-800/60'
                                }`}
                              >
                                {tx.type === 'income'
                                  ? 'Pemasukan'
                                  : tx.type === 'expense'
                                  ? 'Pengeluaran'
                                  : 'Transfer'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-semibold text-white">
                                <span>{tx.category?.emoji || '🏷️'}</span>
                                <span>{tx.category?.name || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium">
                              {tx.wallet?.name || 'Dompet Utama'}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate text-slate-300 font-medium">
                              {tx.notes || '-'}
                            </td>
                            <td
                              className={`py-3.5 px-4 text-right font-black whitespace-nowrap ${
                                tx.type === 'income'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}
                              {formatRupiah(tx.amount)}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {hasReceiptItems ? (
                                <button
                                  onClick={() => toggleReceiptExpand(tx.id)}
                                  className="p-1 rounded-md hover:bg-slate-800 text-cyan-400"
                                  title="Expand rincian item struk"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          </tr>

                          {/* Accordion Detail: Transaksi dari Foto Struk Multi-item */}
                          {hasReceiptItems && isExpanded && (
                            <tr className="bg-slate-900/60">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                                    <span className="flex items-center gap-1.5">
                                      <Receipt className="w-4 h-4 text-cyan-400" />
                                      Rincian Item Struk Belanja ({tx.receipt_items?.length} Item)
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-400">
                                      Diekstraksi via AI OCR Vision
                                    </span>
                                  </div>
                                  <div className="bg-[#090D16] rounded-xl border border-cyan-800/60 divide-y divide-slate-800 shadow-xl">
                                    {tx.receipt_items?.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="py-2 px-3 flex items-center justify-between text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-500 font-semibold">{idx + 1}.</span>
                                          <span className="font-semibold text-white">
                                            {item.item_name}
                                          </span>
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

            {/* Pagination Bar */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs no-print">
              <span className="text-slate-400">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, sorted.length)} dari {sorted.length} transaksi
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Sebelumnya
                </Button>
                <span className="px-2 font-bold text-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Riwayat Unduhan Export Tab */
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl divide-y divide-slate-800">
          <div className="p-5">
            <h3 className="text-base font-bold text-white">Riwayat File Unduhan Export</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Download ulang file laporan yang pernah di-generate tanpa harus memproses ulang.
            </p>
          </div>

          {exportHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Belum ada riwayat unduhan export. Klik &apos;Unduh PDF&apos;, &apos;Unduh Excel&apos;, atau &apos;CSV&apos; untuk mulai.
            </div>
          ) : (
            exportHistory.map((item) => (
              <div
                key={item.id}
                className="py-4 px-6 flex items-center justify-between hover:bg-blue-950/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      item.file_type === 'pdf'
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                        : item.file_type === 'csv'
                        ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/60'
                        : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                    }`}
                  >
                    {item.file_type === 'pdf' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{item.file_name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                      <span>Dibuat: {formatWIBDateTime(item.created_at || item.createdAt || '')}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold">{item.file_type || item.fileFormat || 'FILE'}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() =>
                    handleExport(
                      item.file_type === 'csv'
                        ? 'csv'
                        : item.file_type === 'xlsx' || item.fileFormat === 'xlsx'
                        ? 'excel'
                        : 'pdf'
                    )
                  }
                >
                  Unduh Ulang
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upgrade to Pro Modal */}
      <Modal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="Upgrade ke TataDana Pro"
        description="Fitur Export Laporan Lengkap ke PDF, Excel, dan CSV hanya tersedia untuk Pro Member."
      >
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-blue-950 via-[#0F172A] to-[#0B0F19] rounded-2xl border border-cyan-800/60">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>TataDana Pro — Rp99.000 Sekali Bayar</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dapatkan akses download laporan PDF/Excel/CSV unlimited seumur hidup, scan struk dengan AI
              Vision, AI Financial Advisor proaktif, dan tanpa batasan transaksi.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setUpgradeModalOpen(false)} className="border-slate-700 text-slate-300">
              Nanti Saja
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold"
              onClick={() => {
                setUpgradeModalOpen(false);
                alert('Membuka gateway Midtrans untuk upgrade Pro...');
              }}
            >
              Upgrade Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
