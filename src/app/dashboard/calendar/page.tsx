'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  DollarSign,
  Tag
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDate } from '@/lib/utils/date';
import { Transaction, RecurringBill } from '@/lib/types';
import { dataStore } from '@/lib/storage-mock';

export default function FinancialCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // October 2026 (matching dataset)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);

  // Drilldown Modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Quick Add Transaction Modal
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txCategory, setTxCategory] = useState('Makanan & Minuman Pokok');

  useEffect(() => {
    loadCalendarData();
    const handleUpdate = () => loadCalendarData();
    window.addEventListener('tatadana_data_updated', handleUpdate);
    return () => window.removeEventListener('tatadana_data_updated', handleUpdate);
  }, []);

  const loadCalendarData = async () => {
    try {
      setTransactions([...dataStore.transactions]);
      const res = await fetch('/api/recurring-bills?userId=' + dataStore.user.id);
      const data = await res.json();
      if (data.bills) setRecurringBills(data.bills);
    } finally {
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 11));
  };

  // Build Day Cells
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Group transactions by date string YYYY-MM-DD
  const txByDay: Record<string, { income: number; expense: number; list: Transaction[] }> = {};
  transactions.forEach((tx) => {
    const raw = tx.transactionDate || tx.transaction_date || '';
    if (raw) {
      const dateKey = raw.slice(0, 10);
      if (!txByDay[dateKey]) txByDay[dateKey] = { income: 0, expense: 0, list: [] };
      if (tx.type === 'income') txByDay[dateKey].income += tx.amount;
      if (tx.type === 'expense') txByDay[dateKey].expense += tx.amount;
      txByDay[dateKey].list.push(tx);
    }
  });

  // Calculate monthly sum
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  transactions.forEach((tx) => {
    const raw = tx.transactionDate || tx.transaction_date || '';
    if (raw) {
      const d = new Date(raw);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (tx.type === 'income') monthlyIncome += tx.amount;
        if (tx.type === 'expense') monthlyExpense += tx.amount;
      }
    }
  });

  const handleCellClick = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setIsDetailModalOpen(true);
  };

  const handleQuickAddForDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0 || !selectedDateStr) return;

    const amt = Number(txAmount);
    const newTx: any = {
      id: 'tx_cal_' + Date.now(),
      user_id: dataStore.user.id || 'usr_bunga_01',
      userId: dataStore.user.id || 'usr_bunga_01',
      wallet_id: dataStore.wallets[0]?.id || 'w_bca',
      walletId: dataStore.wallets[0]?.id || 'w_bca',
      wallet_name: dataStore.wallets[0]?.name || 'BCA Prioritas',
      walletName: dataStore.wallets[0]?.name || 'BCA Prioritas',
      category_name: txCategory,
      categoryName: txCategory,
      type: txType,
      amount: amt,
      notes: txNotes || `Transaksi Kalender ${selectedDateStr}`,
      transaction_date: `${selectedDateStr}T12:00:00+07:00`,
      transactionDate: `${selectedDateStr}T12:00:00+07:00`,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    dataStore.transactions.unshift(newTx);

    // Update wallet balance
    if (dataStore.wallets[0]) {
      if (txType === 'expense') dataStore.wallets[0].balance -= amt;
      else dataStore.wallets[0].balance += amt;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
    }

    setIsAddTxModalOpen(false);
    setTxAmount('');
    setTxNotes('');
    loadCalendarData();
  };

  const selectedDayTxs = selectedDateStr ? (txByDay[selectedDateStr]?.list || []) : [];
  const selectedDayBills = selectedDateStr
    ? recurringBills.filter((b) => Number(b.dueDate || b.due_date) === Number(selectedDateStr.split('-')[2]))
    : [];

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-cyan-400" />
              Kalender Keuangan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-cyan-400 border border-cyan-800/60">
              Arus Kas & Agenda
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pantau arus kas harian, drill-down transaksi per tanggal, dan jadwal jatuh tempo tagihan berulang.
          </p>
        </div>

        {/* View & Navigation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'month' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulan
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'week' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Minggu
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#0F172A] border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-white px-2 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-800 shadow-sm"
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-semibold text-slate-400">Total Pemasukan Bulan Ini</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{formatRupiah(monthlyIncome)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-semibold text-slate-400">Total Pengeluaran Bulan Ini</div>
            <div className="text-lg font-black text-cyan-400 mt-0.5">{formatRupiah(monthlyExpense)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-semibold text-slate-400">Net Arus Kas (Net Cashflow)</div>
            <div className={`text-lg font-black mt-0.5 ${monthlyIncome - monthlyExpense >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatRupiah(monthlyIncome - monthlyExpense)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 flex items-center justify-center font-bold text-xs">
            {monthlyIncome - monthlyExpense >= 0 ? 'SURPLUS' : 'DEFISIT'}
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar Grid & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View (3 Cols) */}
        <div className="lg:col-span-3 bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            <span className="text-rose-400">Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span className="text-cyan-400">Sab</span>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((dayNum, idx) => {
              if (dayNum === null) {
                return (
                  <div
                    key={'empty_' + idx}
                    className="min-h-[85px] sm:min-h-[105px] rounded-xl bg-slate-900/40 border border-slate-800/40 p-2"
                  />
                );
              }

              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayData = txByDay[dateKey];
              const hasRecurring = recurringBills.some((b) => Number(b.dueDate || b.due_date) === dayNum);
              const isToday = dayNum === 11 && month === 9 && year === 2026;

              return (
                <div
                  key={'day_' + dayNum}
                  onClick={() => handleCellClick(dayNum)}
                  className={`min-h-[85px] sm:min-h-[105px] rounded-xl p-2 border transition-all cursor-pointer flex flex-col justify-between select-none group ${
                    isToday
                      ? 'border-cyan-400 bg-blue-950/60 shadow-md ring-1 ring-cyan-500/30'
                      : 'border-slate-800 bg-[#0B0F19] hover:border-cyan-500/50 hover:bg-slate-900'
                  }`}
                >
                  {/* Top Bar: Date Number + Recurring Indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white' : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {hasRecurring && (
                      <span
                        title="Tagihan Jatuh Tempo"
                        className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                      />
                    )}
                  </div>

                  {/* Transactions Badge Info */}
                  <div className="space-y-1 mt-1 text-[10px] leading-tight overflow-hidden">
                    {dayData && dayData.income > 0 && (
                      <div className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded truncate font-bold">
                        +{formatRupiah(dayData.income)}
                      </div>
                    )}
                    {dayData && dayData.expense > 0 && (
                      <div className="bg-rose-950/80 text-rose-400 border border-rose-800/60 px-1.5 py-0.5 rounded truncate font-bold">
                        -{formatRupiah(dayData.expense)}
                      </div>
                    )}
                    {dayData && (
                      <div className="text-[9px] text-slate-500 font-mono text-right font-medium">
                        {dayData.list.length} tx
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar: Recurring Bills & Upcoming Agenda (1 Col) */}
        <div className="space-y-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Tagihan Berulang
              </span>
              <span className="text-[10px] bg-blue-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800/60 font-bold">
                Rutin
              </span>
            </div>
            <div className="space-y-2.5">
              {recurringBills.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-200">{b.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      b.status === 'paid'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                        : 'bg-amber-950 text-amber-400 border-amber-800/60'
                    }`}>
                      {b.status === 'paid' ? 'Lunas' : 'Jatuh Tempo'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Tgl {b.dueDate || b.due_date} setiap bulan</span>
                    <span className="font-bold text-cyan-400">{formatRupiah(b.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Sinkronisasi Bot Telegram
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Ketik <code className="text-cyan-400 font-mono font-bold">/saldo</code> atau <code className="text-cyan-400 font-mono font-bold">/hari ini</code> di Telegram bot kapan saja untuk melihat agenda transaksi terdekat.
            </p>
          </div>
        </div>
      </div>

      {/* Drill-down Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedDateStr ? `Rincian Transaksi (${formatWIBDate(selectedDateStr + 'T12:00:00+07:00')})` : 'Rincian Tanggal'}
      >
        <div className="space-y-4 text-slate-200">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-semibold">Total {selectedDayTxs.length} Transaksi Tercatat</span>
            <button
              onClick={() => setIsAddTxModalOpen(true)}
              className="text-xs bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Transaksi
            </button>
          </div>

          {selectedDayBills.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 space-y-1 text-xs">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Ada Tagihan Berulang:
              </div>
              {selectedDayBills.map((b) => (
                <div key={b.id} className="flex justify-between text-slate-300">
                  <span>{b.name}</span>
                  <span className="font-bold text-white">{formatRupiah(b.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {selectedDayTxs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Tidak ada catatan transaksi pada tanggal ini.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selectedDayTxs.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{t.categoryName || t.category_name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({t.walletName || t.wallet_name || 'BCA'})</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{t.notes}</div>
                  </div>
                  <div className={`font-black text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Quick Add Transaction Modal */}
      <Modal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        title="Catat Transaksi Pada Tanggal Terpilih"
      >
        <form onSubmit={handleQuickAddForDate} className="space-y-4 text-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal</label>
            <input
              type="text"
              disabled
              value={selectedDateStr || ''}
              className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                txType === 'expense'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              💸 Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                txType === 'income'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              💰 Pemasukan
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Nominal (Rp)</label>
            <input
              type="number"
              required
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              placeholder="Contoh: 35000"
              className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Catatan</label>
            <input
              type="text"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Cth: Beli bensin, bayar parkir"
              className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddTxModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25"
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
