'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet as WalletIcon,
  TrendingDown,
  TrendingUp,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Bot,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Send,
  ArrowRightLeft,
  CreditCard,
  Smartphone,
  X,
  Receipt,
  Download,
  Check,
  Copy,
  Clock
} from 'lucide-react';
import { dataStore } from '@/lib/storage-mock';
import { formatRupiah, getWIBTimestamp, resolveTargetWallet } from '@/lib/telegram-parser';

export default function DashboardOverviewPage() {
  const [period, setPeriod] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('bulanan');
  const [dataVersion, setDataVersion] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [searchTx, setSearchTx] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'telegram'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // In-Page Quick Transaction Modal State
  const [isQuickRecordOpen, setIsQuickRecordOpen] = useState(false);
  const [modalTxType, setModalTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [modalAmount, setModalAmount] = useState('');
  const [modalWalletId, setModalWalletId] = useState('w_bca');
  const [modalToWalletId, setModalToWalletId] = useState('w_gopay');
  const [modalCategoryId, setModalCategoryId] = useState('cat_food');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalNotes, setModalNotes] = useState('');
  const [recordSuccessToast, setRecordSuccessToast] = useState<string | null>(null);

  // Sync data with server and listen for external additions (Telegram Bot, Simulator, etc.)
  useEffect(() => {
    const handleUpdate = () => {
      syncWithServer();
      setDataVersion((v) => v + 1);
    };
    window.addEventListener('tatadana_data_updated', handleUpdate);

    const syncWithServer = async () => {
      try {
        const targetUid = dataStore.user?.id || 'usr_bunga_01';
        const res = await fetch(`/api/transactions?userId=${targetUid}`);
        const data = await res.json();
        if (data && Array.isArray(data.transactions)) {
          let hasNew = false;
          for (const serverTx of data.transactions) {
            const alreadyExists = dataStore.transactions.some((dt) => {
              if (dt.id === serverTx.id) return true;
              if (dt.notes === serverTx.notes && dt.amount === serverTx.amount) {
                const t1 = new Date(dt.transactionDate || dt.transaction_date || 0).getTime();
                const t2 = new Date(serverTx.transaction_date || serverTx.transactionDate || 0).getTime();
                if (Math.abs(t1 - t2) < 5000) return true;
              }
              return false;
            });

            if (!alreadyExists) {
              const matchedWallet = resolveTargetWallet(
                dataStore.wallets,
                serverTx.wallet?.name || serverTx.walletName,
                serverTx.notes
              );

              dataStore.transactions.unshift({
                id: serverTx.id,
                userId: dataStore.user.id,
                walletId: matchedWallet.id,
                walletName: matchedWallet.name,
                categoryId: serverTx.category_id || 'cat_food',
                categoryName: serverTx.category?.name || 'Makanan & Minuman',
                categoryEmoji: serverTx.category?.emoji || '🍜',
                type: serverTx.type || 'expense',
                amount: serverTx.amount,
                notes: serverTx.notes,
                transactionDate: serverTx.transaction_date || serverTx.transactionDate || new Date().toISOString(),
                source: serverTx.source || 'telegram_text',
                items: serverTx.items || serverTx.receipt_items,
              });

              if (serverTx.type === 'expense') {
                matchedWallet.balance -= serverTx.amount;
                const catId = serverTx.category_id || 'cat_food';
                const b = dataStore.budgets.find((bg) => bg.categoryId === catId || bg.category_id === catId);
                if (b) {
                  b.spentAmount = (b.spentAmount || 0) + serverTx.amount;
                  b.spent_amount = (b.spent_amount || 0) + serverTx.amount;
                }
              } else if (serverTx.type === 'income') {
                matchedWallet.balance += serverTx.amount;
              }
              hasNew = true;
            }
          }
          if (hasNew) {
            setDataVersion((v) => v + 1);
          }
        }
      } catch (err) {
        // Fallback to local dataStore
      }
    };

    syncWithServer();
    const interval = setInterval(syncWithServer, 2000);

    return () => {
      window.removeEventListener('tatadana_data_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const user = dataStore.user;
  const wallets = dataStore.wallets;
  const transactions = dataStore.transactions;
  const budgets = dataStore.budgets;
  const categories = dataStore.categories;

  // Filter transactions based on selected Period
  const now = new Date();
  const filteredTransactionsByPeriod = useMemo(() => {
    return transactions.filter((t) => {
      const tTime = new Date(t.transactionDate || t.transaction_date || t.createdAt || t.created_at || 0).getTime();
      if (isNaN(tTime)) return true;

      if (period === 'harian') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return tTime >= startOfDay;
      }
      if (period === 'mingguan') {
        const sevenDaysAgo = now.getTime() - 7 * 86400000;
        return tTime >= sevenDaysAgo;
      }
      if (period === 'bulanan') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return tTime >= startOfMonth;
      }
      return true; // tahunan
    });
  }, [transactions, period, dataVersion]);

  const periodIncome = filteredTransactionsByPeriod
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const periodExpense = filteredTransactionsByPeriod
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const netCashflow = periodIncome - periodExpense;

  // Stats Calculations
  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
  const totalExpenseThisMonth = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalIncomeThisMonth = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalBudgetMonthly = budgets.reduce((acc, b) => acc + (b.monthlyAmount || b.monthly_amount || 0), 0);
  const remainingBudget = Math.max(totalBudgetMonthly - totalExpenseThisMonth, 0);
  const budgetUsagePercent = Math.min(Math.round((totalExpenseThisMonth / (totalBudgetMonthly || 1)) * 100), 100);

  // Category Expense Breakdown for Pie Chart
  const expenseByCategory = useMemo(() => {
    return categories
      .filter((c) => c.type === 'expense')
      .map((c) => {
        const spent = filteredTransactionsByPeriod
          .filter((t) => (t.categoryId === c.id || t.category_id === c.id) && t.type === 'expense')
          .reduce((acc, t) => acc + t.amount, 0);
        return { ...c, spent };
      })
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [categories, filteredTransactionsByPeriod]);

  // 6-Month Comparison Mock Data
  const monthlyCashflowData = [
    { month: 'Mei', income: 16000000, expense: 9800000 },
    { month: 'Jun', income: 17500000, expense: 11200000 },
    { month: 'Jul', income: 17000000, expense: 12500000 },
    { month: 'Ags', income: 18000000, expense: 10400000 },
    { month: 'Sep', income: 17800000, expense: 11900000 },
    { month: 'Okt', income: totalIncomeThisMonth, expense: totalExpenseThisMonth },
  ];

  // Daily Trend Mock Data for current month
  const dailySpendDays = Array.from({ length: 15 }, (_, i) => ({
    day: i + 1,
    amount: Math.round((Math.sin(i * 0.8) + 1.2) * 150000 + (i === 7 ? 600000 : 0)),
  }));
  const maxDaily = Math.max(...dailySpendDays.map((d) => d.amount), 800000);

  // Filtered Recent Transactions
  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (filterType === 'expense' && t.type !== 'expense') return false;
      if (filterType === 'income' && t.type !== 'income') return false;
      if (filterType === 'telegram' && !t.source?.startsWith('telegram')) return false;

      // Search query
      if (searchTx.trim()) {
        const q = searchTx.toLowerCase();
        const noteMatch = (t.notes || '').toLowerCase().includes(q);
        const catMatch = (t.categoryName || '').toLowerCase().includes(q);
        const walletMatch = (t.walletName || '').toLowerCase().includes(q);
        return noteMatch || catMatch || walletMatch;
      }
      return true;
    });
  }, [transactions, filterType, searchTx, dataVersion]);

  // Trigger Bot Simulator Modal
  const handleOpenSimulator = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tatadana_open_bot_simulator'));
    }
  };

  // Quick Copy Helper
  const handleCopyExample = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  // Submit in-page Quick Transaction
  const handleSaveQuickRecord = () => {
    const rawNum = parseInt(modalAmount.replace(/\D/g, ''), 10);
    if (!rawNum || rawNum <= 0) {
      alert('Masukkan nominal transaksi yang valid.');
      return;
    }

    const sourceWallet = wallets.find((w) => w.id === modalWalletId) || wallets[0];
    const cat = categories.find((c) => c.id === modalCategoryId) || categories[0];

    if (modalTxType === 'transfer') {
      const destWallet = wallets.find((w) => w.id === modalToWalletId) || wallets[1];
      if (sourceWallet.id === destWallet.id) {
        alert('Dompet asal dan dompet tujuan tidak boleh sama.');
        return;
      }
      sourceWallet.balance -= rawNum;
      destWallet.balance += rawNum;

      dataStore.addTransaction({
        userId: user.id,
        walletId: sourceWallet.id,
        walletName: sourceWallet.name,
        categoryId: 'cat_transfer',
        categoryName: 'Transfer Saldo',
        categoryEmoji: '🔄',
        type: 'transfer',
        amount: rawNum,
        notes: modalNotes.trim() || `Transfer dari ${sourceWallet.name} ke ${destWallet.name}`,
        transactionDate: new Date(modalDate).toISOString(),
        source: 'web_manual',
      });
    } else if (modalTxType === 'expense') {
      sourceWallet.balance -= rawNum;
      const b = budgets.find((bg) => bg.categoryId === cat.id || bg.category_id === cat.id);
      if (b) {
        b.spentAmount = (b.spentAmount || 0) + rawNum;
        b.spent_amount = (b.spent_amount || 0) + rawNum;
      }

      dataStore.addTransaction({
        userId: user.id,
        walletId: sourceWallet.id,
        walletName: sourceWallet.name,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryEmoji: cat.iconEmoji || '📝',
        type: 'expense',
        amount: rawNum,
        notes: modalNotes.trim() || `Pengeluaran ${cat.name}`,
        transactionDate: new Date(modalDate).toISOString(),
        source: 'web_manual',
      });
    } else {
      sourceWallet.balance += rawNum;
      dataStore.addTransaction({
        userId: user.id,
        walletId: sourceWallet.id,
        walletName: sourceWallet.name,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryEmoji: cat.iconEmoji || '💰',
        type: 'income',
        amount: rawNum,
        notes: modalNotes.trim() || 'Pemasukan Saldo',
        transactionDate: new Date(modalDate).toISOString(),
        source: 'web_manual',
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
    }

    setRecordSuccessToast(`Berhasil mencatat ${formatRupiah(rawNum)}!`);
    setTimeout(() => setRecordSuccessToast(null), 3500);

    // Reset Form
    setIsQuickRecordOpen(false);
    setModalAmount('');
    setModalNotes('');
    setDataVersion((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notifikasi Berhasil */}
      {recordSuccessToast && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{recordSuccessToast}</span>
        </div>
      )}

      {/* 1. WELCOME HERO BANNER (Financial Overview & Status) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#0B132B] to-[#0A192F] border border-blue-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-950/80 text-cyan-400 border border-cyan-800/80 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                TataDana Pro
              </span>
              <a
                href="https://t.me/keuanganunga_bot"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5 hover:bg-emerald-900/80 transition-colors"
                title="Buka Telegram Bot @keuanganunga_bot"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Bot Telegram @keuanganunga_bot Online
              </a>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-400 bg-slate-900/70 border border-slate-800 flex items-center gap-1">
                <Clock className="w-3 h-3" /> WIB (Asia/Jakarta)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Selamat Datang, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{user.fullName || 'Unga Putri'}</span>! 👋
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Catat keuangan semudah kirim chat Telegram. Semua transaksi otomatis dirapikan ke dompet dan laporanmu.
            </p>
          </div>

          {/* Quick Balance Preview with Eye Toggle */}
          <div className="bg-[#090D16]/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-[240px] shadow-inner backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400 font-semibold mb-1">
              <span>Total Saldo Siap Pakai</span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 rounded-lg hover:text-white hover:bg-slate-800 transition-colors text-slate-400"
                title={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {showBalance ? formatRupiah(totalBalance) : '••••••••••••'}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{wallets.length} Dompet Terhubung</span>
              <span className={`font-bold ${netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Arus Kas: {netCashflow >= 0 ? '+' : ''}{formatRupiah(netCashflow)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PINTASAN AKSI CEPAT (Interactive Quick Actions Hub) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Action 1: Catat Pengeluaran Langsung */}
        <button
          onClick={() => {
            setModalTxType('expense');
            setIsQuickRecordOpen(true);
          }}
          className="bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-900/40 hover:border-rose-500/80 p-4 rounded-2xl flex items-center gap-3.5 transition-all group shadow-md hover:scale-[1.02] text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:bg-rose-900 transition-colors">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors truncate">
              Catat Pengeluaran
            </div>
            <div className="text-[11px] text-slate-400 truncate">Makan, Kopi, Bensin</div>
          </div>
        </button>

        {/* Action 2: Catat Pemasukan Langsung */}
        <button
          onClick={() => {
            setModalTxType('income');
            setIsQuickRecordOpen(true);
          }}
          className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-900/40 hover:border-emerald-500/80 p-4 rounded-2xl flex items-center gap-3.5 transition-all group shadow-md hover:scale-[1.02] text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:bg-emerald-900 transition-colors">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
              Catat Pemasukan
            </div>
            <div className="text-[11px] text-slate-400 truncate">Gaji, Bonus, Usaha</div>
          </div>
        </button>

        {/* Action 3: Buka Telegram Bot / Simulator */}
        <button
          onClick={handleOpenSimulator}
          className="bg-gradient-to-r from-blue-950/50 to-slate-900 border border-blue-900/40 hover:border-cyan-400 p-4 rounded-2xl flex items-center gap-3.5 transition-all group shadow-md hover:scale-[1.02] text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate flex items-center gap-1.5">
              Chat Telegram
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] text-cyan-400 truncate font-semibold">@keuanganunga_bot</div>
          </div>
        </button>

        {/* Action 4: Ekspor Laporan PDF & Excel */}
        <Link
          href="/dashboard/reports"
          className="bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-900/40 hover:border-cyan-500/80 p-4 rounded-2xl flex items-center gap-3.5 transition-all group shadow-md hover:scale-[1.02]"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:bg-cyan-900 transition-colors">
            <Download className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
              Ekspor Laporan
            </div>
            <div className="text-[11px] text-slate-400 truncate">PDF Resmi & Excel .xlsx</div>
          </div>
        </Link>
      </div>

      {/* 3. PERIOD SELECTOR & STATS CARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Indikator Keuangan
              <span className="text-xs font-semibold text-slate-400">
                ({period === 'harian' ? 'Hari Ini' : period === 'mingguan' ? '7 Hari Terakhir' : period === 'bulanan' ? 'Bulan Ini' : 'Tahun Ini'})
              </span>
            </h2>
            <p className="text-xs text-slate-400">Pilih rentang waktu untuk mengamati arus kas Anda</p>
          </div>

          {/* Period Filter Buttons */}
          <div className="inline-flex items-center gap-1 bg-[#0F172A] border border-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs shadow-md">
            {[
              { id: 'harian', label: '1 Hari (Hari Ini)', icon: '⚡' },
              { id: 'mingguan', label: '7 Hari', icon: '📅' },
              { id: 'bulanan', label: '1 Bulan', icon: '🗓️' },
              { id: 'tahunan', label: 'Tahunan', icon: '📊' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  period === item.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Total */}
          <div className="bg-[#0F172A] border border-slate-800/90 rounded-2xl p-5 hover:border-cyan-500/50 hover:shadow-xl transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Total Kas</span>
              <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
                <WalletIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white tracking-tight">
                {showBalance ? formatRupiah(totalBalance) : '••••••••'}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1.5 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Tersebar di {wallets.length} dompet aktif</span>
              </div>
            </div>
          </div>

          {/* Card 2: Pemasukan Periode */}
          <div className="bg-[#0F172A] border border-slate-800/90 rounded-2xl p-5 hover:border-emerald-500/50 hover:shadow-xl transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pemasukan</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                +{showBalance ? formatRupiah(periodIncome) : '••••••••'}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1.5 font-medium">
                <span>{filteredTransactionsByPeriod.filter((t) => t.type === 'income').length} transaksi masuk</span>
              </div>
            </div>
          </div>

          {/* Card 3: Pengeluaran Periode */}
          <div className="bg-[#0F172A] border border-slate-800/90 rounded-2xl p-5 hover:border-rose-500/50 hover:shadow-xl transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pengeluaran</span>
              <div className="w-9 h-9 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-400 tracking-tight">
                -{showBalance ? formatRupiah(periodExpense) : '••••••••'}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1.5 font-medium">
                <span>{filteredTransactionsByPeriod.filter((t) => t.type === 'expense').length} transaksi keluar</span>
              </div>
            </div>
          </div>

          {/* Card 4: Sisa Budget & Progress */}
          <div className="bg-[#0F172A] border border-slate-800/90 rounded-2xl p-5 hover:border-cyan-500/50 hover:shadow-xl transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sisa Anggaran</span>
              <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
                <PieIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white tracking-tight">
                {showBalance ? formatRupiah(remainingBudget) : '••••••••'}
              </div>
              {/* Miniature Progress Bar */}
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      budgetUsagePercent >= 90
                        ? 'bg-rose-500'
                        : budgetUsagePercent >= 75
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                    }`}
                    style={{ width: `${budgetUsagePercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between font-semibold">
                  <span>{budgetUsagePercent}% terpakai</span>
                  <span className={budgetUsagePercent >= 90 ? 'text-rose-400' : 'text-emerald-400'}>
                    {budgetUsagePercent >= 90 ? 'Waspada' : 'Aman'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PANDUAN MUDAH DIPAHAMI: CONTOH CHAT TELEGRAM */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#0F172A] to-[#0A1120] border border-blue-800/40 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">💡 Panduan Cepat & Mudah</span>
              <span className="text-[10px] bg-blue-900/60 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-700/50">
                Bahasa Sehari-hari
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              Ketik di Telegram seperti chat ke teman — Bot langsung mencatat otomatis!
            </h3>
          </div>
          <button
            onClick={handleOpenSimulator}
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4" />
            Coba di Simulator Chat 💬
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              cmd: 'beli nasi padang 25rb tunai',
              desc: 'Catat pengeluaran Makanan Rp 25.000 ke Dompet Tunai',
              tag: 'Pengeluaran Makanan',
            },
            {
              cmd: 'kopi susu 18k gopay',
              desc: 'Catat Rp 18.000 terpotong langsung dari saldo GoPay',
              tag: 'Pengeluaran Jajan',
            },
            {
              cmd: 'gajian 5jt ke bca',
              desc: 'Catat pemasukan Gaji Rp 5.000.000 ke BCA Prioritas',
              tag: 'Pemasukan Gaji',
            },
            {
              cmd: '/saldo',
              desc: 'Cek rangkuman seluruh saldo dompet & sisa budget bulanan',
              tag: 'Cek Saldo Cepat',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-[#090D16]/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-cyan-500/50 transition-colors group"
            >
              <div>
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                  {item.tag}
                </div>
                <div className="font-mono text-xs font-bold text-white bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span>&quot;{item.cmd}&quot;</span>
                  <button
                    onClick={() => handleCopyExample(item.cmd)}
                    className="text-slate-400 hover:text-cyan-400 p-1"
                    title="Salin contoh perintah"
                  >
                    {copiedText === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. VISUAL ANALYTICS (Pie Chart & Bar Chart Cashflow) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart / Donut Pengeluaran per Kategori */}
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pengeluaran per Kategori</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">{expenseByCategory.length} Kategori</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Breakdown pengeluaran berdasarkan alokasi dana</p>

            {/* SVG Donut Chart */}
            <div className="flex justify-center my-4 relative">
              <svg width="190" height="190" viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1E293B" strokeWidth="16" />
                {expenseByCategory.map((c, i) => {
                  const total = expenseByCategory.reduce((a, b) => a + b.spent, 0) || 1;
                  const pct = c.spent / total;
                  const strokeDash = pct * 238.76;
                  const prevPct = expenseByCategory.slice(0, i).reduce((a, b) => a + b.spent / total, 0);
                  const strokeOffset = -prevPct * 238.76;

                  return (
                    <circle
                      key={c.id}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke={c.colorHex || '#2563EB'}
                      strokeWidth="16"
                      strokeDasharray={`${strokeDash} 238.76`}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-500 hover:stroke-width-18"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-medium">Total Keluar</span>
                <span className="text-sm font-black text-white mt-0.5">{formatRupiah(totalExpenseThisMonth)}</span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="space-y-2.5 mt-3">
              {expenseByCategory.slice(0, 4).map((c) => {
                const total = expenseByCategory.reduce((a, b) => a + b.spent, 0) || 1;
                const pct = Math.round((c.spent / total) * 100);
                return (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.iconEmoji}</span>
                      <span className="text-slate-300 font-medium truncate max-w-[130px]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">{pct}%</span>
                      <span className="font-bold text-white">{formatRupiah(c.spent)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/dashboard/reports"
            className="mt-5 pt-3.5 border-t border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center justify-center gap-1 transition-colors"
          >
            Lihat Laporan & Rincian Lengkap <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 6-Month Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800/90 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Arus Kas 6 Bulan Terakhir</h3>
                <p className="text-xs text-slate-400">Perbandingan pemasukan vs pengeluaran per bulan</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-slate-300 font-medium">Pemasukan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-cyan-500" />
                  <span className="text-slate-300 font-medium">Pengeluaran</span>
                </div>
              </div>
            </div>

            {/* Clean Bar Chart */}
            <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-800">
              {monthlyCashflowData.map((d, idx) => {
                const maxVal = 20000000;
                const incHeight = Math.round((d.income / maxVal) * 100);
                const expHeight = Math.round((d.expense / maxVal) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      {/* Income Bar */}
                      <div
                        style={{ height: `${incHeight}%` }}
                        className="w-1/2 max-w-[18px] bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all"
                        title={`Pemasukan: ${formatRupiah(d.income)}`}
                      />
                      {/* Expense Bar */}
                      <div
                        style={{ height: `${expHeight}%` }}
                        className="w-1/2 max-w-[18px] bg-cyan-500 hover:bg-cyan-400 rounded-t-sm transition-all"
                        title={`Pengeluaran: ${formatRupiah(d.expense)}`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-white font-semibold">
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Trend Line for Current Month */}
          <div className="mt-5 pt-2">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-200">Tren Pengeluaran Harian Bulan Ini</span>
              <span className="text-slate-400 text-[11px]">
                Rata-rata {formatRupiah(Math.round(totalExpenseThisMonth / 15))}/hari
              </span>
            </div>
            <div className="h-12 w-full flex items-end gap-1">
              {dailySpendDays.map((d, idx) => {
                const h = Math.round((d.amount / maxDaily) * 100);
                return (
                  <div
                    key={idx}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-blue-950 hover:bg-cyan-400 rounded-t-xs transition-colors cursor-pointer"
                    title={`Tgl ${d.day}: ${formatRupiah(d.amount)}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. TABEL 10 TRANSAKSI TERBARU DENGAN SEARCH & FILTER */}
      <div className="bg-[#0F172A] border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Transaksi Terbaru</span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                {visibleTransactions.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Sinkronisasi instan dari Web dan Chat Bot Telegram</p>
          </div>

          {/* Search and Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500/80 w-44 sm:w-56"
              />
            </div>

            <button
              onClick={() => {
                setModalTxType('expense');
                setIsQuickRecordOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold hover:from-blue-500 hover:to-cyan-400 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" /> Catat Transaksi
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'expense', label: '💸 Pengeluaran' },
            { id: 'income', label: '💰 Pemasukan' },
            { id: 'telegram', label: '🤖 Dari Telegram' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id as any)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterType === pill.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold">
                <th className="pb-3">Tanggal</th>
                <th className="pb-3">Kategori / Keterangan</th>
                <th className="pb-3">Dompet</th>
                <th className="pb-3">Sumber Transaksi</th>
                <th className="pb-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {visibleTransactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="py-3.5 text-slate-400 text-xs whitespace-nowrap font-medium">
                    {new Date(t.transactionDate || t.transaction_date || '').toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 font-medium text-white">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-1.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                        {t.categoryEmoji || (t.type === 'income' ? '💰' : '🏷️')}
                      </span>
                      <div>
                        <div className="text-white font-semibold text-xs sm:text-sm">{t.notes || t.categoryName}</div>
                        {t.items && t.items.length > 0 && (
                          <div className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Receipt className="w-3 h-3" /> Struk Terurai ({t.items.length} item)
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-300 text-xs whitespace-nowrap font-medium">
                    <span className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
                      👛 {t.walletName || 'BCA Prioritas'}
                    </span>
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        t.source?.startsWith('telegram')
                          ? 'bg-blue-950 text-cyan-400 border-cyan-800/80'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      {t.source === 'telegram_text'
                        ? '🤖 Telegram Chat'
                        : t.source === 'telegram_photo'
                        ? '📸 Struk OCR'
                        : t.source === 'telegram_voice'
                        ? '🎙️ Voice Note'
                        : '💻 Web Manual'}
                    </span>
                  </td>
                  <td
                    className={`py-3.5 text-right font-black whitespace-nowrap text-xs sm:text-sm ${
                      t.type === 'expense'
                        ? 'text-rose-400'
                        : t.type === 'income'
                        ? 'text-emerald-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {t.type === 'expense'
                      ? `- ${formatRupiah(t.amount)}`
                      : t.type === 'income'
                      ? `+ ${formatRupiah(t.amount)}`
                      : formatRupiah(t.amount)}
                  </td>
                </tr>
              ))}

              {visibleTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="text-3xl">🔍</div>
                      <div className="font-bold text-white">Tidak ada transaksi ditemukan</div>
                      <div className="text-slate-500">Coba ubah kata kunci pencarian atau filter di atas.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. IN-PAGE QUICK TRANSACTION RECORDER MODAL */}
      {isQuickRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B0F19] border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  ⚡
                </span>
                <h3 className="font-bold text-white text-base">Catat Transaksi Cepat</h3>
              </div>
              <button
                onClick={() => setIsQuickRecordOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-bold">
              {[
                { id: 'expense', label: '💸 Pengeluaran' },
                { id: 'income', label: '💰 Pemasukan' },
                { id: 'transfer', label: '🔄 Transfer' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setModalTxType(t.id as any)}
                  className={`py-2 rounded-xl transition-all ${
                    modalTxType === t.id
                      ? t.id === 'expense'
                        ? 'bg-rose-600 text-white shadow-md'
                        : t.id === 'income'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Amount Input with Quick Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Nominal (Rp)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="text"
                  placeholder="25.000"
                  value={modalAmount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setModalAmount(clean ? parseInt(clean, 10).toLocaleString('id-ID') : '');
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-lg font-black text-white focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10000, 25000, 50000, 100000, 500000].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setModalAmount(chip.toLocaleString('id-ID'))}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-800 hover:border-cyan-500/50 transition-colors"
                  >
                    +{formatRupiah(chip).replace('Rp', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                {modalTxType === 'transfer' ? 'Dari Dompet Asal' : 'Pilih Dompet'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setModalWalletId(w.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                      modalWalletId === w.id
                        ? 'bg-blue-950/80 border-cyan-400 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{w.name}</span>
                    <span className="text-[10px] text-cyan-400 font-bold">{formatRupiah(w.balance)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* If Transfer: Destination Wallet */}
            {modalTxType === 'transfer' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Ke Dompet Tujuan</label>
                <div className="grid grid-cols-2 gap-2">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setModalToWalletId(w.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                        modalToWalletId === w.id
                          ? 'bg-blue-950/80 border-cyan-400 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{w.name}</span>
                      <span className="text-[10px] text-cyan-400 font-bold">{formatRupiah(w.balance)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Selection (if expense or income) */}
            {modalTxType !== 'transfer' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Kategori</label>
                <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {categories
                    .filter((c) => (modalTxType === 'income' ? c.type === 'income' : c.type === 'expense'))
                    .map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setModalCategoryId(cat.id)}
                        className={`p-2 rounded-xl border text-left text-xs font-semibold flex items-center gap-1.5 truncate transition-all ${
                          modalCategoryId === cat.id
                            ? 'bg-blue-950/80 border-cyan-400 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{cat.iconEmoji}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Date and Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tanggal</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Makan Siang Nasi Padang"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsQuickRecordOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveQuickRecord}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-md"
              >
                Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
