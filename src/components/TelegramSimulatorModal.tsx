'use client';

import React, { useState } from 'react';
import { Send, Image, Mic, X, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatRupiah } from '@/lib/telegram-parser';
import { dataStore } from '@/lib/storage-mock';

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  type?: 'text' | 'photo' | 'voice';
}

interface TelegramSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded?: () => void;
}

export default function TelegramSimulatorModal({ isOpen, onClose, onTransactionAdded }: TelegramSimulatorModalProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm_init',
      sender: 'bot',
      text: `👋 Halo ${dataStore.user?.fullName || 'Bunga Putri'}! Selamat datang di TataDana Telegram Bot.

Ketik transaksimu dengan bahasa santai, contoh:
• "beli makan malam 15k tunai"
• "gajian 5jt ke bca"
• "/boost 10 menit lebih cepat"
• "/saldo"

Atau coba kirim foto struk belanja / voice note!`,
      time: '12:00',
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const sendMessage = async (customPayload?: any, displayUserMsg?: string, type: 'text' | 'photo' | 'voice' = 'text') => {
    const textToSend = customPayload?.message?.text || displayUserMsg || inputText.trim();
    if (!textToSend && !customPayload?.message?.photo && !customPayload?.message?.voice) return;

    const userMessage: MessageItem = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: displayUserMsg || textToSend,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customPayload) setInputText('');
    setLoading(true);

    try {
      const payload = customPayload || {
        update_id: Math.floor(Math.random() * 900000) + 100000,
        message: {
          message_id: Date.now(),
          from: { id: 5829104, first_name: 'Budi', username: 'budisantoso_id' },
          chat: { id: 5829104, type: 'private' },
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

      const botReply: MessageItem = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: data.reply || (data.status === 'skipped' ? 'Idempotent skip.' : 'Pesan diterima.'),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      };

      setMessages(prev => [...prev, botReply]);
      if (onTransactionAdded) onTransactionAdded();
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text: '❌ Gagal terhubung ke webhook TataDana.',
        time: 'Now',
        type: 'text'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePhoto = () => {
    const payload = {
      update_id: Math.floor(Math.random() * 900000) + 100000,
      message: {
        message_id: Date.now(),
        from: { id: 5829104, first_name: 'Budi' },
        chat: { id: 5829104 },
        photo: [{ file_id: 'photo_mock_receipt_01' }]
      }
    };
    sendMessage(payload, '📸 [Foto Struk Minimarket Dikirim]', 'photo');
  };

  const handleSimulateVoice = () => {
    const payload = {
      update_id: Math.floor(Math.random() * 900000) + 100000,
      message: {
        message_id: Date.now(),
        from: { id: 5829104, first_name: 'Budi' },
        chat: { id: 5829104 },
        voice: { duration: 12, file_id: 'voice_mock_01' }
      }
    };
    sendMessage(payload, '🎙️ [Voice Note: 12 detik]', 'voice');
  };

  const handleClearMessages = () => {
    setMessages([
      {
        id: 'm_init',
        sender: 'bot',
        text: `👋 Halo ${dataStore.user?.fullName || 'Bunga Putri'}! Selamat datang di TataDana Telegram Bot.

Ketik transaksimu dengan bahasa santai, contoh:
• "beli makan malam 15k tunai"
• "gajian 5jt ke bca"
• "/boost 10 menit lebih cepat"
• "/saldo"

Atau coba kirim foto struk belanja / voice note!`,
        time: '12:00',
        type: 'text'
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-black border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[670px] max-h-[92vh]">
        {/* Telegram Header - Pure Black */}
        <div className="bg-black px-4 py-3.5 border-b border-zinc-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white text-sm">Tata dana bunga</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-zinc-800 font-mono">ONLINE</span>
              </div>
              <span className="text-[11px] text-zinc-400">@keuanganunga_bot · Simulator Berlatar Hitam</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearMessages}
              title="Bersihkan Chat"
              className="px-2.5 py-1 text-[11px] rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips - Black bar */}
        <div className="bg-black px-3.5 py-2.5 border-b border-zinc-900 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
          <span className="text-zinc-400 font-medium text-[11px]">Contoh:</span>
          <button
            onClick={() => sendMessage(undefined, 'beli makan malam 15k tunai')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-cyan-500/15 hover:text-cyan-400 hover:border-cyan-500/30 text-zinc-300 border border-zinc-800/80 transition-colors"
          >
            🍜 "beli makan malam 15k tunai"
          </button>
          <button
            onClick={() => sendMessage(undefined, 'gajian 5jt ke bca')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/30 text-zinc-300 border border-zinc-800/80 transition-colors"
          >
            💼 "gajian 5jt ke bca"
          </button>
          <button
            onClick={() => sendMessage(undefined, '/boost 10 menit lebih cepat')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-amber-500/15 hover:text-amber-400 hover:border-amber-500/30 text-zinc-300 border border-zinc-800/80 transition-colors"
          >
            ⚡ /boost 10 menit lebih cepat
          </button>
          <button
            onClick={() => sendMessage(undefined, '/boost 5 menit lebih cpt')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-amber-500/15 hover:text-amber-400 hover:border-amber-500/30 text-zinc-300 border border-zinc-800/80 transition-colors"
          >
            ⚡ /boost 5 menit lebih cpt
          </button>
          <button
            onClick={() => sendMessage(undefined, '/saldo')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-blue-500/15 hover:text-blue-400 hover:border-blue-500/30 text-zinc-300 border border-zinc-800/80 transition-colors"
          >
            👛 /saldo
          </button>
          <button
            onClick={() => sendMessage(undefined, '/budget')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-purple-500/15 hover:text-purple-400 hover:border-purple-500/30 text-zinc-300 border border-zinc-800/80 transition-colors"
          >
            📊 /budget
          </button>
        </div>

        {/* Chat Messages Body - Pure Black */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-black">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-md ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-none font-sans font-medium'
                    : 'bg-[#121214] text-zinc-100 border border-zinc-800/90 rounded-bl-none font-mono text-xs sm:text-[13px]'
                }`}
              >
                {m.text}
                <div
                  className={`text-[10px] mt-1 text-right ${
                    m.sender === 'user' ? 'text-blue-100' : 'text-zinc-500'
                  }`}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#121214] text-zinc-400 border border-zinc-800/90 rounded-2xl rounded-bl-none px-4 py-2 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>Tata dana bunga sedang mengetik...</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Input & Media Simulator - Pure Black */}
        <div className="bg-black p-3.5 border-t border-zinc-800/90 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulatePhoto}
              title="Kirim Foto Struk (Pro OCR)"
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-blue-950/60 text-zinc-300 hover:text-cyan-400 border border-zinc-800 transition-colors"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              onClick={handleSimulateVoice}
              title="Kirim Voice Note (Speech to Text)"
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-blue-950/60 text-zinc-300 hover:text-cyan-400 border border-zinc-800 transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ketik 'beli makan malam 15k tunai'..."
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
            <span>● Mode Hitam OLED Aktif</span>
            <span>Tersinkronisasi otomatis dengan Dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
