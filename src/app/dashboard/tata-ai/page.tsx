'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  RotateCcw,
  User,
  CheckCircle2,
  Calendar,
  Wallet as WalletIcon,
  CreditCard,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Receipt,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, parseIndonesianAmount, handleTelegramCommand } from '@/lib/telegram-parser';
import { dataStore } from '@/lib/storage-mock';
import { formatWIBDate, formatWIBDateTime, isBoostOrPercepatCommand } from '@/lib/utils/date';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider?: string;
  txDetails?: {
    type: 'income' | 'expense';
    amount: number;
    walletName: string;
    category: string;
    date: string;
  };
}

export default function TataAiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `Halo ${dataStore.user.fullName || 'Bunga Putri'}! 👋 Saya **Tata AI Bot**, asisten keuangan cerdas terintegrasi TataDana.\n\nAnda bisa mencatat transaksi langsung dari sini dengan memilih tanggal dan dompet (BCA, GoPay, Dompet Tunai), atau ketik perintah natural seperti:\n• "beli makan siang 25rb lewat BCA tanggal hari ini"\n• "beli bensin 30rb gopay kemarin"\n• "gajian 5jt ke bca"\n\nSetiap transaksi otomatis masuk ke menu Transaksi & Laporan Keuangan Anda!`,
      timestamp: 'Baru saja',
      provider: 'Tata AI Pro'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Quick Transaction Form State (Tanggal, Dompet: BCA, GoPay, Dompet Tunai, Jenis, Nominal, Kategori, Catatan)
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txWalletId, setTxWalletId] = useState('w_bca');
  const [txAmountInput, setTxAmountInput] = useState('');
  const [txCategory, setTxCategory] = useState('Makanan & Minuman Pokok');
  const [txNotes, setTxNotes] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const handleUpdate = () => {
      setDataVersion((v) => v + 1);
    };
    window.addEventListener('tatadana_data_updated', handleUpdate);
    return () => window.removeEventListener('tatadana_data_updated', handleUpdate);
  }, []);

  const wallets = dataStore.wallets;
  const categories = dataStore.categories;
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  const quickQuestions = [
    '/boost 10 menit lebih cepat',
    'Berapa sisa uang makan minggu ini?',
    'Buatkan strategi hemat akhir bulan',
    'Analisa pengeluaran terbesarku bulan ini',
    'Berapa total saldo di semua dompet?'
  ];

  // Helper to record transaction and sync across TataDana
  const executeRecordTransaction = async (params: {
    type: 'expense' | 'income';
    amount: number;
    walletId: string;
    walletName: string;
    category: string;
    notes: string;
    date: string;
  }) => {
    const targetWallet = wallets.find((w) => w.id === params.walletId) || wallets[0];
    const previousBalance = targetWallet.balance;
    const newBalance =
      params.type === 'expense'
        ? previousBalance - params.amount
        : previousBalance + params.amount;

    targetWallet.balance = newBalance;

    // Create transaction record
    const newTx = {
      id: 'tx_ai_' + Date.now(),
      user_id: dataStore.user.id || 'usr_bunga_01',
      userId: dataStore.user.id || 'usr_bunga_01',
      wallet_id: targetWallet.id,
      walletId: targetWallet.id,
      wallet_name: targetWallet.name,
      walletName: targetWallet.name,
      category_name: params.category,
      categoryName: params.category,
      type: params.type,
      amount: params.amount,
      notes: params.notes || (params.type === 'expense' ? 'Pengeluaran via Tata AI' : 'Pemasukan via Tata AI'),
      transaction_date: `${params.date}T12:00:00+07:00`,
      transactionDate: `${params.date}T12:00:00+07:00`,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: 'tata-ai-bot'
    };

    dataStore.transactions.unshift(newTx as any);
    dataStore.user.transactionsThisMonth = (dataStore.user.transactionsThisMonth || 0) + 1;

    // Persist via backend API
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: dataStore.user.id || 'usr_bunga_01',
          walletId: targetWallet.id,
          type: params.type,
          amount: params.amount,
          notes: newTx.notes,
          categoryName: params.category,
          transactionDate: newTx.transactionDate
        })
      });
    } catch (e) {
      console.warn('Backend sync warning:', e);
    }

    // Dispatch global data update so Transaksi & Laporan reflect immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
    }

    return {
      newTx,
      targetWallet,
      newBalance
    };
  };

  // Form submit handler
  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseIndonesianAmount(txAmountInput) || Number(txAmountInput);
    if (!parsedAmt || parsedAmt <= 0) {
      alert('Masukkan nominal yang valid (contoh: 25rb, 500k, 1.5jt, atau 50000)');
      return;
    }

    setLoading(true);
    const selectedW = wallets.find((w) => w.id === txWalletId) || wallets[0];

    const result = await executeRecordTransaction({
      type: txType,
      amount: parsedAmt,
      walletId: selectedW.id,
      walletName: selectedW.name,
      category: txCategory,
      notes: txNotes || (txType === 'expense' ? `Belanja ${txCategory}` : `Pemasukan`),
      date: txDate
    });

    // Append AI reply
    const formattedDate = formatWIBDate(`${txDate}T12:00:00+07:00`);
    const replyText =
      txType === 'expense'
        ? `📅 ${formattedDate} — ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n💸 **Pengeluaran Berhasil Dicatat!**\n├ Nominal : **${formatRupiah(parsedAmt)}**\n├ Kategori : 🛍️ ${txCategory}\n├ Dompet : 👛 ${selectedW.name}\n├ Tanggal : 🗓️ ${txDate}\n├ Catatan : ${txNotes || '-'}\n└ Saldo Baru : **${formatRupiah(result.newBalance)}**\n\n✅ *Transaksi sudah otomatis masuk ke menu Transaksi & Laporan Keuangan.*`
        : `📅 ${formattedDate} — ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n💰 **Pemasukan Berhasil Dicatat!**\n├ Nominal : **${formatRupiah(parsedAmt)}**\n├ Kategori : 💼 ${txCategory}\n├ Dompet : 👛 ${selectedW.name}\n├ Tanggal : 🗓️ ${txDate}\n├ Catatan : ${txNotes || '-'}\n└ Saldo Baru : **${formatRupiah(result.newBalance)}**\n\n💪 *Semangat terus! Catatan tersimpan rapi di Transaksi & Laporan.*`;

    setMessages((prev) => [
      ...prev,
      {
        id: 'user_form_' + Date.now(),
        sender: 'user',
        text: `Catat ${txType === 'expense' ? 'pengeluaran' : 'pemasukan'} ${formatRupiah(parsedAmt)} di ${selectedW.name} tanggal ${txDate}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      },
      {
        id: 'ai_resp_' + Date.now(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        provider: 'Tata AI Engine',
        txDetails: {
          type: txType,
          amount: parsedAmt,
          walletName: selectedW.name,
          category: txCategory,
          date: txDate
        }
      }
    ]);

    setTxAmountInput('');
    setTxNotes('');
    setFormSuccessMessage(`✅ Transaksi ${formatRupiah(parsedAmt)} berhasil dicatat ke ${selectedW.name}!`);
    setTimeout(() => setFormSuccessMessage(null), 4000);
    setLoading(false);
  };

  // Chat message send handler (supports natural language transaction parsing & general financial Q&A)
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'u_' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setLoading(true);

    const lower = textToSend.toLowerCase();

    // Check if user is invoking Turbo Boost command (e.g. /boost 10 menit lebih cepat, 10 menit lebih cepat, /percepat)
    if (isBoostOrPercepatCommand(textToSend)) {
      const reply = handleTelegramCommand(textToSend, {
        wallets,
        transactions: dataStore.transactions,
        budgets: dataStore.budgets,
        categories: dataStore.categories,
        user: dataStore.user,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'a_' + Date.now(),
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          provider: 'Tata AI Turbo Engine',
        }
      ]);
      setLoading(false);
      return;
    }

    // Check if user is asking to record a transaction in natural language
    const isRecordIntent =
      lower.includes('beli') ||
      lower.includes('bayar') ||
      lower.includes('catat') ||
      lower.includes('gajian') ||
      lower.includes('pemasukan') ||
      lower.includes('pengeluaran') ||
      lower.includes('makan') ||
      lower.includes('kopi') ||
      lower.includes('bensin') ||
      lower.includes('ongkir');

    const parsedAmount = parseIndonesianAmount(textToSend);

    if (isRecordIntent && parsedAmount && parsedAmount > 0) {
      // Natural language transaction detection
      const type: 'income' | 'expense' =
        lower.includes('gajian') || lower.includes('pemasukan') || lower.includes('dapat') || lower.includes('transfer masuk')
          ? 'income'
          : 'expense';

      // Detect wallet from text (BCA, GoPay, Dompet Tunai / Cash, Mandiri)
      let matchedWallet = wallets[0];
      if (lower.includes('gopay') || lower.includes('go-pay')) {
        matchedWallet = wallets.find((w) => w.id === 'w_gopay') || wallets[0];
      } else if (lower.includes('tunai') || lower.includes('cash') || lower.includes('dompet tunai')) {
        matchedWallet = wallets.find((w) => w.id === 'w_cash') || wallets[0];
      } else if (lower.includes('mandiri')) {
        matchedWallet = wallets.find((w) => w.id === 'w_mandiri') || wallets[0];
      } else if (lower.includes('bca')) {
        matchedWallet = wallets.find((w) => w.id === 'w_bca') || wallets[0];
      }

      // Detect date
      let chosenDate = new Date().toISOString().slice(0, 10);
      if (lower.includes('kemarin')) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        chosenDate = d.toISOString().slice(0, 10);
      } else if (lower.includes('lusa')) {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        chosenDate = d.toISOString().slice(0, 10);
      }

      // Detect category
      let category = type === 'income' ? 'Gaji & Upah' : 'Makanan & Minuman Pokok';
      if (lower.includes('bensin') || lower.includes('parkir') || lower.includes('tol')) category = 'Bensin, Parkir & Tol';
      else if (lower.includes('kopi') || lower.includes('nongkrong')) category = 'Kopi & Jajan Santai';
      else if (lower.includes('tagihan') || lower.includes('listrik') || lower.includes('pln') || lower.includes('air')) category = 'Tagihan Listrik PLN & Air';
      else if (lower.includes('belanja') || lower.includes('supermarket')) category = 'Belanja Bulanan & Supermarket';
      else if (lower.includes('ojol') || lower.includes('gojek') || lower.includes('grab')) category = 'Ojek & Transport Online';

      const result = await executeRecordTransaction({
        type,
        amount: parsedAmount,
        walletId: matchedWallet.id,
        walletName: matchedWallet.name,
        category,
        notes: textToSend,
        date: chosenDate
      });

      const formattedDate = formatWIBDate(`${chosenDate}T12:00:00+07:00`);
      const replyText =
        type === 'expense'
          ? `📅 ${formattedDate} — ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n💸 **Pengeluaran Tercatat Otomatis!**\n├ Nominal : **${formatRupiah(parsedAmount)}**\n├ Kategori : ${category}\n├ Dompet : 👛 ${matchedWallet.name}\n├ Tanggal : 🗓️ ${chosenDate}\n├ Catatan : "${textToSend}"\n└ Saldo : **${formatRupiah(result.newBalance)}**\n\n📊 *Data sudah langsung terhubung ke tabel Transaksi dan Laporan!*`
          : `📅 ${formattedDate} — ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n💰 **Pemasukan Tercatat Otomatis!**\n├ Nominal : **${formatRupiah(parsedAmount)}**\n├ Kategori : 💼 ${category}\n├ Dompet : 👛 ${matchedWallet.name}\n├ Tanggal : 🗓️ ${chosenDate}\n└ Saldo Baru : **${formatRupiah(result.newBalance)}**\n\n💪 *Luar biasa! Pemasukanmu sudah tersinkronisasi.*`;

      setMessages((prev) => [
        ...prev,
        {
          id: 'a_' + Date.now(),
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          provider: 'Tata AI NLP Parser',
          txDetails: {
            type,
            amount: parsedAmount,
            walletName: matchedWallet.name,
            category,
            date: chosenDate
          }
        }
      ]);

      setLoading(false);
      return;
    }

    // Otherwise, query general AI financial coach API
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });
      const data = await res.json();

      if (data.ok && data.answer) {
        const aiMsg: ChatMessage = {
          id: 'a_' + Date.now(),
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          provider: data.provider || 'Tata AI Engine'
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Gagal memproses jawaban AI');
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: 'a_' + Date.now(),
        sender: 'assistant',
        text: 'Maaf, terjadi gangguan sementara pada koneksi AI. Silakan coba kembali sesaat lagi.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        provider: 'fallback'
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Bot className="w-7 h-7 text-cyan-400" />
              Tata AI Bot & Pencatat Keuangan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-cyan-400 border border-cyan-800/60">
              v2.5 Pro Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Catat pengeluaran & pemasukan dengan tanggal spesifik dan pilihan dompet (BCA, GoPay, Tunai). Terhubung langsung ke Transaksi, Laporan, & Telegram!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://t.me/keuanganunga_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-cyan-800/60 text-cyan-400 text-xs font-bold transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5 -rotate-12" />
            Buka Bot Telegram (@keuanganunga_bot)
            <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-2 bg-[#0F172A] border border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs text-slate-300 font-semibold">Sinkron Real-time</span>
          </div>
        </div>
      </div>

      {/* Stats Cards: Live Balances of BCA, GoPay, Dompet Tunai */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400">Total Semua Saldo</div>
          <div className="text-xl font-black text-white mt-1">{formatRupiah(totalBalance)}</div>
          <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            {wallets.length} Dompet Aktif Terpantau
          </div>
        </div>

        {wallets.slice(0, 3).map((w) => (
          <div key={w.id} className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-cyan-500/50 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span className="truncate">{w.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {(w.type || 'wallet').toUpperCase()}
              </span>
            </div>
            <div className="text-lg font-extrabold text-cyan-400 mt-1">{formatRupiah(w.balance)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Siap untuk transaksi via Tata AI</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Form Pencatatan Cepat & Chat Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Form Input Pencatatan Cepat dengan Tanggal & Pilihan Dompet (5 Cols) */}
        <div className="lg:col-span-5 bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Catat Cepat via Tata AI</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-cyan-400 border border-cyan-800/60 font-bold">
                Masuk ke Transaksi & Laporan
              </span>
            </div>

            {formSuccessMessage && (
              <div className="mt-3 p-3 bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleQuickFormSubmit} className="space-y-3.5 mt-3">
              {/* Jenis: Pengeluaran / Pemasukan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('expense')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      txType === 'expense'
                        ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-900/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 text-white" />
                    💸 Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('income')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      txType === 'income'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-white" />
                    💰 Pemasukan
                  </button>
                </div>
              </div>

              {/* Tanggal Transaksi (User Request: adakan tanggal saat pengeluaran/pemasukan) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Tanggal Transaksi
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTxDate(new Date().toISOString().slice(0, 10))}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold"
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
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                    >
                      Kemarin
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:border-cyan-400 outline-none"
                  required
                />
              </div>

              {/* Pilihan Dompet: BCA, GoPay, Dompet Tunai (User Request: terus bisa pilih transaksi nya lewat BCA, Gopay, Dompet tunai) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Pilih Dompet / Rekening
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {wallets.map((w) => {
                    const isSelected = txWalletId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setTxWalletId(w.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-950 border-cyan-400 shadow-md shadow-blue-500/20'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                          {w.name}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 font-mono">
                          {formatRupiah(w.balance)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nominal Transaksi (Supports 15rb, 50k, 1.5jt) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nominal (Rupiah)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 font-mono">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={txAmountInput}
                    onChange={(e) => setTxAmountInput(e.target.value)}
                    placeholder="Contoh: 25rb, 50k, 1.5jt, atau 50000"
                    className="w-full bg-[#131B2E] border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none font-medium"
                    required
                  />
                </div>
                {txAmountInput && (
                  <p className="text-[11px] text-cyan-400 mt-1 font-medium">
                    Terbaca: {formatRupiah(parseIndonesianAmount(txAmountInput) || Number(txAmountInput) || 0)}
                  </p>
                )}
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Kategori Transaksi</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:border-cyan-400 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                      {c.iconEmoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Cth: Beli makan siang soto betawi"
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:border-cyan-400 outline-none placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !txAmountInput}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Catat Transaksi Sekarang via Tata AI
              </button>
            </form>
          </div>

          {/* Quick Links: Langsung ke Transaksi & Laporan */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <Link
              href="/dashboard/transactions"
              className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 font-semibold"
            >
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              Lihat di Transaksi &rarr;
            </Link>
            <Link
              href="/dashboard/reports"
              className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 font-semibold"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              Lihat di Laporan &rarr;
            </Link>
          </div>
        </div>

        {/* KANAN: Interactive AI Chat Box (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-[650px] bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800 bg-[#0B0F19] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Tata AI Natural Assistant
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/60 font-bold">
                    Online WIB
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Ketik transaksi sehari-hari atau tanyakan analisis keuangan
                </div>
              </div>
            </div>

            <button
              onClick={() => setMessages([messages[0]])}
              title="Reset Chat"
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#090D16]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-950 border border-cyan-800/60 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none font-medium'
                      : 'bg-[#0F172A] border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {/* If this message recorded a transaction, show deep links */}
                  {m.txDetails && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap items-center gap-2 text-xs">
                      <Link
                        href="/dashboard/transactions"
                        className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 border border-cyan-800/60 text-cyan-400 font-semibold transition-all flex items-center gap-1"
                      >
                        <CreditCard className="w-3 h-3" />
                        Buka Riwayat Transaksi
                      </Link>
                      <Link
                        href="/dashboard/reports"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold transition-all flex items-center gap-1"
                      >
                        <Receipt className="w-3 h-3" />
                        Export Laporan PDF/Excel
                      </Link>
                    </div>
                  )}

                  <div className={`mt-2 text-[10px] flex items-center justify-between gap-4 ${m.sender === 'user' ? 'text-blue-100' : 'text-slate-500 font-semibold'}`}>
                    <span>{m.timestamp}</span>
                    {m.provider && <span className="font-mono text-[9px] text-cyan-400/80">{m.provider}</span>}
                  </div>
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-cyan-800/60 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-[#0F172A] border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  Tata AI sedang memproses transaksi & menganalisa keuanganmu...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Strip */}
          <div className="px-4 py-2 border-t border-slate-800 bg-[#0B0F19] flex gap-2 overflow-x-auto text-xs no-scrollbar">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="whitespace-nowrap bg-slate-900 hover:bg-blue-950 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-slate-800 bg-[#0F172A]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Cth: 'beli makan siang 25rb lewat BCA kemarin' atau tanyakan budget..."
                className="flex-1 bg-[#131B2E] border border-slate-700 focus:border-cyan-400 focus:bg-[#151D33] rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all font-medium"
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
