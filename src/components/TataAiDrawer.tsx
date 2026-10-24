'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bot,
  Sparkles,
  Calendar,
  Wallet as WalletIcon,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Send,
  Zap,
  RotateCcw,
  Check
} from 'lucide-react';
import { formatRupiah, parseIndonesianNominal, parseIndonesianMessage, isBoostOrPercepatCommand, handleTelegramCommand } from '@/lib/telegram-parser';
import { dataStore } from '@/lib/storage-mock';
import { formatWIBDate } from '@/lib/utils/date';
import { Wallet, Category } from '@/lib/types';

interface TataAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded?: () => void;
  initialDate?: string;
  initialWalletId?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export default function TataAiDrawer({
  isOpen,
  onClose,
  onTransactionAdded,
  initialDate,
  initialWalletId
}: TataAiDrawerProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'chat'>('form');

  // Form State
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [txDate, setTxDate] = useState(() => initialDate || new Date().toISOString().slice(0, 10));
  const [sourceWalletId, setSourceWalletId] = useState(() => initialWalletId || 'w_bca');
  const [destWalletId, setDestWalletId] = useState('w_gopay');
  const [txCategory, setTxCategory] = useState('Makanan & Minuman Pokok');
  const [txAmountInput, setTxAmountInput] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: `👋 Halo! Saya **Tata AI Assistant**.\nKetik transaksi natural kamu di sini, contoh:\n• "beli makan siang 25rb pakai GoPay"\n• "gajian 5jt ke BCA"\n• "/boost 10 menit lebih cepat"\n• "transfer 100k dari BCA ke Mandiri"\n\nTransaksi langsung tercatat otomatis di dompet & laporan!`,
      time: 'Baru saja'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Listen to external drawer open event
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      if (e.detail?.date) setTxDate(e.detail.date);
      if (e.detail?.walletId) setSourceWalletId(e.detail.walletId);
      if (e.detail?.type) setTxType(e.detail.type);
    };
    window.addEventListener('tatadana_open_tata_ai_drawer', handleOpenEvent);
    return () => window.removeEventListener('tatadana_open_tata_ai_drawer', handleOpenEvent);
  }, []);

  // Update initial props when changed
  useEffect(() => {
    if (initialDate) setTxDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialWalletId) setSourceWalletId(initialWalletId);
  }, [initialWalletId]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  const wallets = dataStore.wallets;
  const categories = dataStore.categories;

  // Resolve active source and destination wallets
  const sourceWallet = wallets.find((w) => w.id === sourceWalletId) || wallets[0];
  const destWallet = wallets.find((w) => w.id === destWalletId) || wallets[1] || wallets[0];

  // Quick Amount helper
  const handleAddAmount = (addValue: number) => {
    const currentVal = parseIndonesianNominal(txAmountInput) || 0;
    const newVal = currentVal + addValue;
    setTxAmountInput(String(newVal));
  };

  // Submit Quick Entry Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const parsedAmount = parseIndonesianNominal(txAmountInput);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Nominal transaksi tidak valid. Contoh: 25rb, 50k, 1.5jt, atau 50000');
      return;
    }

    if (txType === 'transfer' && sourceWallet.id === destWallet.id) {
      setFormError('Dompet sumber dan dompet tujuan tidak boleh sama.');
      return;
    }

    if (txType === 'expense' && sourceWallet.balance < parsedAmount) {
      setFormError(`Saldo ${sourceWallet.name} tidak cukup (${formatRupiah(sourceWallet.balance)}).`);
      return;
    }

    if (txType === 'transfer' && sourceWallet.balance < parsedAmount) {
      setFormError(`Saldo ${sourceWallet.name} tidak mencukupi untuk transfer (${formatRupiah(sourceWallet.balance)}).`);
      return;
    }

    setSubmitting(true);

    try {
      const formattedDate = `${txDate}T12:00:00+07:00`;

      // Record transaction into dataStore
      const tx = dataStore.addTransaction({
        type: txType,
        amount: parsedAmount,
        wallet_id: sourceWallet.id,
        walletId: sourceWallet.id,
        walletName: sourceWallet.name,
        destinationWalletId: txType === 'transfer' ? destWallet.id : undefined,
        destinationWalletName: txType === 'transfer' ? destWallet.name : undefined,
        to_wallet_id: txType === 'transfer' ? destWallet.id : undefined,
        category_name: txType === 'transfer' ? 'Transfer Antar Dompet' : txCategory,
        categoryName: txType === 'transfer' ? 'Transfer Antar Dompet' : txCategory,
        notes: txNotes || (txType === 'transfer' ? `Transfer ke ${destWallet.name}` : `${txCategory}`),
        transaction_date: formattedDate,
        transactionDate: formattedDate,
        source: 'web_manual'
      });

      // Synchronize with API in background
      try {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: dataStore.user.id || 'usr_bunga_01',
            walletId: sourceWallet.id,
            toWalletId: txType === 'transfer' ? destWallet.id : undefined,
            type: txType,
            amount: parsedAmount,
            notes: tx.notes,
            categoryName: tx.categoryName,
            transactionDate: formattedDate
          })
        });
      } catch (err) {
        // Fallback to dataStore
      }

      // Notify application of data change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
      }
      onTransactionAdded?.();

      setFormSuccess(
        txType === 'transfer'
          ? `Transfer ${formatRupiah(parsedAmount)} dari ${sourceWallet.name} ke ${destWallet.name} berhasil!`
          : `Catatan ${txType === 'expense' ? 'pengeluaran' : 'pemasukan'} ${formatRupiah(parsedAmount)} berhasil disimpan!`
      );

      // Reset form
      setTxAmountInput('');
      setTxNotes('');
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Chat Message
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt || chatLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Check if user is invoking Turbo Boost command (e.g. /boost 10 menit lebih cepat, 10 menit lebih cepat, /percepat)
      if (isBoostOrPercepatCommand(prompt)) {
        const reply = handleTelegramCommand(prompt, {
          wallets,
          transactions: dataStore.transactions,
          budgets: dataStore.budgets,
          categories: dataStore.categories,
          user: dataStore.user,
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
        onTransactionAdded?.();

        const botReply: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        };

        setChatMessages((prev) => [...prev, botReply]);
        setChatLoading(false);
        return;
      }

      // Natural language transaction parsing
      const parsed = parseIndonesianMessage(prompt);

      if (parsed && parsed.amount > 0) {
        // Find matching wallet or default
        let targetW = sourceWallet;
        if (parsed.wallet) {
          const match = wallets.find((w) =>
            w.name.toLowerCase().includes(parsed.wallet!.toLowerCase())
          );
          if (match) targetW = match;
        }

        let targetDestW = destWallet;
        if (parsed.destinationWalletName) {
          const matchDest = wallets.find((w) =>
            w.name.toLowerCase().includes(parsed.destinationWalletName!.toLowerCase())
          );
          if (matchDest) targetDestW = matchDest;
        }

        const nowIso = new Date().toISOString();
        const tx = dataStore.addTransaction({
          type: parsed.type,
          amount: parsed.amount,
          wallet_id: targetW.id,
          walletId: targetW.id,
          walletName: targetW.name,
          destinationWalletId: parsed.type === 'transfer' ? targetDestW.id : undefined,
          destinationWalletName: parsed.type === 'transfer' ? targetDestW.name : undefined,
          to_wallet_id: parsed.type === 'transfer' ? targetDestW.id : undefined,
          category_name: parsed.type === 'transfer' ? 'Transfer Antar Dompet' : (parsed.categoryName || 'Makanan & Minuman Pokok'),
          categoryName: parsed.type === 'transfer' ? 'Transfer Antar Dompet' : (parsed.categoryName || 'Makanan & Minuman Pokok'),
          notes: parsed.notes || prompt,
          transaction_date: nowIso,
          transactionDate: nowIso,
          source: 'telegram_text'
        });

        // Notify application
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
        onTransactionAdded?.();

        const botReply: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text:
            parsed.type === 'transfer'
              ? `🔄 **Transfer Berhasil Diproses!**\n├ Nominal: **${formatRupiah(parsed.amount)}**\n├ Dari: 👛 ${targetW.name}\n├ Ke: 📥 ${targetDestW.name}\n└ Sisa Saldo ${targetW.name}: **${formatRupiah(targetW.balance)}**\n\n✅ Transaksi langsung tercatat di data keuangan!`
              : `🧾 **Transaksi Berhasil Dicatat!**\n├ Tipe: ${parsed.type === 'expense' ? '💸 Pengeluaran' : '💰 Pemasukan'}\n├ Nominal: **${formatRupiah(parsed.amount)}**\n├ Kategori: 🏷️ ${parsed.categoryName || 'Umum'}\n├ Dompet: 👛 ${targetW.name}\n└ Saldo Baru: **${formatRupiah(targetW.balance)}**\n\n✅ Tersinkronisasi ke Dashboard & Laporan!`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        };

        setChatMessages((prev) => [...prev, botReply]);
      } else {
        // Conversational Q&A fallback
        const totalBal = wallets.reduce((s, w) => s + w.balance, 0);
        let answer = `Saya mengerti pertanyaanmu: "${prompt}".\n\n💡 Total saldo kamu saat ini di 5 dompet adalah **${formatRupiah(totalBal)}**.\n\nKamu juga bisa langsung mengetik perintah catat transaksi seperti: *"beli kopi 25k bca"* atau *"transfer 50k bca ke gopay"*.`;
        if (prompt.toLowerCase().includes('saldo')) {
          answer = `📊 **Ringkasan Saldo 5 Dompet:**\n` +
            wallets.map((w) => `• ${w.name}: **${formatRupiah(w.balance)}**`).join('\n') +
            `\n\n💰 **Total Bersih:** **${formatRupiah(totalBal)}**`;
        }

        const botReply: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: answer,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        };
        setChatMessages((prev) => [...prev, botReply]);
      }
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#090D16] border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="px-6 py-4 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Tata AI Drawer
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono font-bold border border-cyan-500/30">
                    Live Sync
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Pencatatan Cepat & Asisten Cerdas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="px-6 pt-4 pb-2 bg-[#090D16]">
            <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'form'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Catat Cepat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'chat'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                Tata AI Simulator
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {activeTab === 'form' ? (
              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* Status messages */}
                {formSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{formSuccess}</span>
                  </div>
                )}
                {formError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Transaction Type Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Jenis Transaksi:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('expense')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        txType === 'expense'
                          ? 'border-rose-500 bg-rose-950/30 text-rose-300 ring-1 ring-rose-500'
                          : 'border-slate-800 bg-[#0F172A] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                      Pengeluaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('income')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        txType === 'income'
                          ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 ring-1 ring-emerald-500'
                          : 'border-slate-800 bg-[#0F172A] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      Pemasukan
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('transfer')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        txType === 'transfer'
                          ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300 ring-1 ring-cyan-500'
                          : 'border-slate-800 bg-[#0F172A] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                      Transfer
                    </button>
                  </div>
                </div>

                {/* 2. Tanggal Transaksi */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Tanggal Transaksi:</span>
                    <span className="text-[11px] text-cyan-400 font-normal">
                      {formatWIBDate(`${txDate}T12:00:00+07:00`)}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
                    />
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTxDate(new Date().toISOString().slice(0, 10))}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setTxDate(d.toISOString().slice(0, 10));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    >
                      Kemarin
                    </button>
                  </div>
                </div>

                {/* 3. Dompet Sumber (BCA, Mandiri, GoPay, OVO, Dompet Tunai) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{txType === 'transfer' ? 'Dari Dompet (Sumber):' : 'Pilih Dompet:'}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Saldo: {formatRupiah(sourceWallet.balance)}
                    </span>
                  </label>
                  <select
                    value={sourceWalletId}
                    onChange={(e) => setSourceWalletId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} — {formatRupiah(w.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Dompet Tujuan (Hanya saat Transfer) */}
                {txType === 'transfer' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Ke Dompet (Tujuan):</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Saldo: {formatRupiah(destWallet.balance)}
                      </span>
                    </label>
                    <select
                      value={destWalletId}
                      onChange={(e) => setDestWalletId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      {wallets
                        .filter((w) => w.id !== sourceWalletId)
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} — {formatRupiah(w.balance)}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* 5. Kategori (Hanya saat Expense/Income) */}
                {txType !== 'transfer' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Kategori Keuangan:
                    </label>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.iconEmoji || '🏷️'} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 6. Nominal Input with Quick Chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Nominal Transaksi (Rp):</span>
                    {txAmountInput && (
                      <span className="text-[11px] text-cyan-400 font-mono font-bold">
                        {formatRupiah(parseIndonesianNominal(txAmountInput) || 0)}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={txAmountInput}
                    onChange={(e) => setTxAmountInput(e.target.value)}
                    placeholder="Contoh: 25rb, 50k, 1.5jt, atau 50000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono font-bold"
                  />
                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[10000, 25000, 50000, 100000, 500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleAddAmount(amt)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-700 transition-colors"
                      >
                        +{formatRupiah(amt).replace('Rp ', '')}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTxAmountInput('')}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-900 text-rose-400 hover:bg-rose-950/40 border border-slate-800 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* 7. Catatan Transaksi */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Catatan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder="Contoh: Beli kopi espresso, makan siang bareng tim"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {submitting
                    ? 'Menyimpan...'
                    : txType === 'transfer'
                    ? 'Proses Transfer Antar Dompet'
                    : 'Simpan Transaksi Sekarang'}
                </button>
              </form>
            ) : (
              /* TAB 2: CHAT SIMULATOR */
              <div className="flex flex-col h-[520px]">
                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none'
                            : 'bg-[#0F172A] border border-slate-800 text-slate-200 rounded-tl-none font-mono'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      Tata AI sedang mencatat transaksi...
                    </div>
                  )}
                  <div ref={chatScrollRef} />
                </div>

                {/* Quick Prompt Suggestions */}
                <div className="pt-2 pb-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChatInput('beli makan malam 25rb tunai')}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800"
                  >
                    🍜 makan 25rb tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput('transfer 50k bca ke gopay')}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800"
                  >
                    🔄 transfer 50k bca ke gopay
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput('gajian 5jt ke bca')}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800"
                  >
                    💰 gajian 5jt bca
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput('saldo semua dompet')}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  >
                    📊 saldo dompet
                  </button>
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={handleSendChat} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ketik transaksi (mis: beli bensin 30rb ovo)..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white transition-all disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('tatadana_open_bot_simulator'));
                      }
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Buka Simulator Bot Telegram Lengkap
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
