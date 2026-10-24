'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Send,
  Image,
  Mic,
  Bot,
  User,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Zap,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Wallet,
  Receipt,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { dataStore } from '@/lib/storage-mock';
import { formatRupiah } from '@/lib/telegram-parser';

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  type?: 'text' | 'photo' | 'voice';
}

export default function BotSimulatorPage() {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm_init',
      sender: 'bot',
      text: `👋 Halo ${dataStore.user.fullName || 'Bunga Putri'}! Selamat datang di Telegram Bot Simulator TataDana (@keuanganunga_bot).

Ketik transaksi keuanganmu dengan bahasa natural, contoh:
• "beli makan malam 15k tunai"
• "kopi susu 25k"
• "gajian 5jt ke bca"
• "/boost 10 menit lebih cepat"
• "/boost 5 menit lebih cpt"
• "/saldo"

Setiap transaksi yang dicatat di simulator ini langsung tersimpan ke database & terupdate otomatis di Dashboard.`,
      time: '12:00',
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollerStatus, setPollerStatus] = useState<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchPollerStatus = async () => {
      try {
        const res = await fetch('/api/telegram/polling');
        const data = await res.json();
        setPollerStatus(data);
      } catch (e) {
        // Fallback
      }
    };
    fetchPollerStatus();
    const interval = setInterval(fetchPollerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async (
    customPayload?: any,
    displayUserMsg?: string,
    type: 'text' | 'photo' | 'voice' = 'text'
  ) => {
    const textToSend = customPayload?.message?.text || displayUserMsg || inputText.trim();
    if (!textToSend && !customPayload?.message?.photo && !customPayload?.message?.voice) return;

    const userMessage: MessageItem = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: displayUserMsg || textToSend,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPayload) setInputText('');
    setLoading(true);

    try {
      const payload = customPayload || {
        update_id: Date.now(),
        message: {
          message_id: Date.now(),
          from: {
            id: 5829104,
            is_bot: false,
            first_name: dataStore.user.fullName?.split(' ')[0] || 'Bunga',
            username: 'bungaputri'
          },
          chat: {
            id: 5829104,
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: textToSend
        }
      };

      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      let botReply =
        data.reply ||
        data.message ||
        'Pesan diterima! Transaksi telah diproses ke database TataDana.';

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: botReply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        }
      ]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_err_' + Date.now(),
          sender: 'bot',
          text: '⚠️ Terjadi kesalahan koneksi saat memproses webhook.',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePhoto = () => {
    const payload = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: { id: 5829104, first_name: 'Bunga' },
        chat: { id: 5829104 },
        photo: [
          { file_id: 'ph_small', width: 320, height: 240 },
          { file_id: 'ph_large', width: 1280, height: 960 }
        ],
        caption: 'Struk Belanja Supermarket Bulanan'
      }
    };
    sendMessage(payload, '📸 [Mengirim Foto Struk Belanja Supermarket]', 'photo');
  };

  const handleSimulateVoice = () => {
    const payload = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: { id: 5829104, first_name: 'Bunga' },
        chat: { id: 5829104 },
        voice: { duration: 12, file_id: 'voice_mock_01' }
      }
    };
    sendMessage(payload, '🎙️ [Voice Note: 12 detik]', 'voice');
  };

  const handleClearMessages = () => {
    setMessages([
      {
        id: 'm_init_' + Date.now(),
        sender: 'bot',
        text: '🧹 Riwayat simulator dibersihkan. Silakan mulai chat baru!',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      }
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Telegram Bot Simulator
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/70 text-cyan-400 border border-cyan-800/60 font-bold">
                @ungakeuanganbot
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Simulasi interaktif Telegram Bot TataDana (Tata dana bunga) langsung di browser Anda.
          </p>
        </div>

        {/* Live Bot Indicator Card */}
        <div className="flex items-center gap-3 bg-[#0F172A] border border-slate-800 px-3.5 py-2 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              Tata dana bunga
              <span className="text-[10px] text-cyan-400 font-mono font-bold">ONLINE</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {pollerStatus?.isRunning ? 'Long Polling Aktif' : 'Engine Siap Menerima Pesan'}
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="text-[11px] text-cyan-400 hover:text-cyan-300 ml-2 font-bold"
          >
            Settings &rarr;
          </Link>
        </div>
      </div>

      {/* Main Grid: Chat Terminal & Command Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Bot Chat Terminal (8 cols) */}
        <div className="lg:col-span-8 bg-[#0B0F19] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[700px]">
          {/* Header Bar */}
          <div className="bg-[#090D16] px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/25">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Tata dana bunga</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                    @ungakeuanganbot
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  WIB (Asia/Jakarta) · Antrian Transaksi Real-Time
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearMessages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Reset Riwayat Chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Quick Command Suggestions Chips */}
          <div className="bg-[#090D16] px-4 py-2.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
            <span className="text-slate-400 font-semibold text-[11px]">Coba Kilat:</span>
            <button
              onClick={() => sendMessage(undefined, 'beli makan malam 15k tunai')}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-blue-950/60 hover:text-cyan-400 hover:border-cyan-500/40 text-slate-300 border border-slate-800 transition-colors"
            >
              🍜 "beli makan malam 15k tunai"
            </button>
            <button
              onClick={() => sendMessage(undefined, 'gajian 5jt ke bca')}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-emerald-950/60 hover:text-emerald-400 hover:border-emerald-500/40 text-slate-300 border border-slate-800 transition-colors"
            >
              💼 "gajian 5jt ke bca"
            </button>
            <button
              onClick={() => sendMessage(undefined, '/boost 10 menit lebih cepat')}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-amber-950/60 hover:text-amber-400 hover:border-amber-500/40 text-slate-300 border border-slate-800 transition-colors"
            >
              ⚡ /boost 10 menit lebih cepat
            </button>
            <button
              onClick={() => sendMessage(undefined, '/boost 5 menit lebih cpt')}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-amber-950/60 hover:text-amber-400 hover:border-amber-500/40 text-slate-300 border border-slate-800 transition-colors"
            >
              ⚡ /boost 5 menit lebih cpt
            </button>
            <button
              onClick={() => sendMessage(undefined, '/saldo')}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-blue-950/60 hover:text-cyan-400 hover:border-cyan-500/40 text-slate-300 border border-slate-800 transition-colors"
            >
              👛 /saldo
            </button>
            <button
              onClick={() => sendMessage(undefined, '/budget')}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-purple-950/60 hover:text-purple-400 hover:border-purple-500/40 text-slate-300 border border-slate-800 transition-colors"
            >
              🎯 /budget
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#0B0F19]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-lg ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-none font-medium'
                      : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-none font-mono text-xs sm:text-[13px]'
                  }`}
                >
                  {m.text}
                  <div
                    className={`text-[10px] mt-1.5 text-right ${
                      m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 text-slate-300 border border-slate-800 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Tata dana bunga sedang memproses pesan...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="bg-[#090D16] p-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulatePhoto}
                title="Simulasi Kirim Foto Struk Belanja"
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-blue-950/60 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors"
              >
                <Image className="w-4 h-4" />
              </button>
              <button
                onClick={handleSimulateVoice}
                title="Simulasi Kirim Voice Note"
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-blue-950/60 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ketik 'beli makan malam 15k tunai' atau /bantuan..."
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />

              <button
                onClick={() => sendMessage()}
                disabled={loading || !inputText.trim()}
                className="p-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 text-white font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all"
              >
                <span className="text-xs hidden sm:inline">Kirim</span>
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>● TataDana Telegram Bot Engine</span>
              <span>Terhubung langsung ke database</span>
            </div>
          </div>
        </div>

        {/* Right: Command Reference & Quick Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Action Card: Check Dashboard */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-950/70 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Real-Time Data Pipeline</h3>
                <p className="text-[11px] text-slate-400">Setiap pesan di simulator langsung dicatat ke data web.</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href="/dashboard"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900 hover:bg-blue-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs text-white transition-all group font-semibold"
              >
                <div className="flex items-center gap-2">
                  <span>📊</span>
                  <span>Lihat di Dashboard Overview</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
              </Link>

              <Link
                href="/dashboard/reports"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900 hover:bg-blue-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs text-white transition-all group font-semibold"
              >
                <div className="flex items-center gap-2">
                  <span>📑</span>
                  <span>Lihat di Halaman Laporan</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
              </Link>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              Daftar Perintah & Contoh Input
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-cyan-400 font-bold font-mono text-[11px]">1. Pencatatan Alami:</div>
                <div className="text-slate-400">
                  • <code className="text-white font-semibold">beli makan malam 15k tunai</code><br />
                  • <code className="text-white font-semibold">kopi susu 25k</code><br />
                  • <code className="text-white font-semibold">gajian 5jt ke bca</code>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-cyan-400 font-bold font-mono text-[11px]">2. Akselerasi Reminder:</div>
                <div className="text-slate-400">
                  • <code className="text-white font-semibold">/boost 5 menit lebih cpt</code><br />
                  • <code className="text-white font-semibold">/boost percepat</code><br />
                  • <code className="text-white font-semibold">/boost status</code>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-cyan-400 font-bold font-mono text-[11px]">3. Rekap & Laporan:</div>
                <div className="text-slate-400">
                  • <code className="text-white font-semibold">/saldo</code> — Cek total saldo<br />
                  • <code className="text-white font-semibold">/budget</code> — Progres anggaran<br />
                  • <code className="text-white font-semibold">/sheet</code> — Link spreadsheet
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
