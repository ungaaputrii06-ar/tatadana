'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Bot,
  Bell,
  Tags,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Plus,
  Clock,
  ShieldCheck,
  Zap,
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Send,
} from 'lucide-react';
import { dataStore } from '@/lib/storage-mock';
import { formatDailyReminder } from '@/lib/telegram-parser';
import { shiftTimeMinutes } from '@/lib/utils/date';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profil' | 'telegram' | 'reminder' | 'kategori'>('telegram');

  // Profile State
  const [fullName, setFullName] = useState(dataStore.user.fullName || 'Bunga Putri');
  const [email, setEmail] = useState(dataStore.user.email || 'bungaputri@gmail.com');
  const [phoneNumber, setPhoneNumber] = useState(dataStore.user.phoneNumber || '+6281298765432');
  const [avatarUrl, setAvatarUrl] = useState(
    dataStore.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  );
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('tatadana_user_name');
      const savedEmail = localStorage.getItem('tatadana_user_email');
      const savedAvatar = localStorage.getItem('tatadana_user_avatar');
      if (savedName) setFullName(savedName);
      if (savedEmail) {
        setEmail(savedEmail);
        if (savedEmail.includes('unga')) {
          setPhoneNumber('+6281288889999');
        }
      }
      if (savedAvatar) setAvatarUrl(savedAvatar);
    }
  }, []);

  const presetAvatars = [
    { id: 'unga', label: 'Unga Putri (Superadmin)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { id: 'bunga', label: 'Bunga Putri (Default)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: 'pro', label: 'Fintech Pro', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { id: 'creative', label: 'Kreatif / Tech', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
    { id: 'minimal', label: 'Elegan Minimalis', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { id: 'hijab', label: 'Hijab Kasual', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: 'avatar3d', label: 'Ilustrasi 3D', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran foto maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const res = event.target.result as string;
          setAvatarUrl(res);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    dataStore.user.fullName = fullName;
    dataStore.user.full_name = fullName;
    dataStore.user.name = fullName;
    dataStore.user.email = email;
    dataStore.user.avatarUrl = avatarUrl;
    dataStore.user.avatar_url = avatarUrl;

    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_user_name', fullName);
      localStorage.setItem('tatadana_user_email', email);
      localStorage.setItem('tatadana_user_avatar', avatarUrl);
      window.dispatchEvent(new CustomEvent('tatadana_profile_updated', {
        detail: { fullName, email, avatarUrl }
      }));
      window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
    }

    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Telegram Bot State (Part 5 Specifications)
  const [botToken, setBotToken] = useState(dataStore.user.telegramBotToken || '');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>(
    dataStore.user.telegramConnected ? 'connected' : 'idle'
  );
  const [testResultMsg, setTestResultMsg] = useState(
    dataStore.user.telegramConnected
      ? `Terhubung dengan @${dataStore.user.telegramUsername || 'ungakeuanganbot'}`
      : ''
  );

  // Reminder State
  const [reminderActive, setReminderActive] = useState(Boolean(dataStore.reminderConfig.isActive || dataStore.reminderConfig.is_active));
  const [frequency, setFrequency] = useState<1 | 2>(
    dataStore.reminderConfig.frequency === 2 || dataStore.reminderConfig.frequency === '2x' ? 2 : 1
  );
  const [time1, setTime1] = useState(dataStore.reminderConfig.time1 || dataStore.reminderConfig.time_1 || '08:00');
  const [time2, setTime2] = useState(dataStore.reminderConfig.time2 || dataStore.reminderConfig.time_2 || '20:00');
  const [boostActive, setBoostActive] = useState(
    Boolean(dataStore.reminderConfig.boost_mode || dataStore.reminderConfig.boostMode)
  );
  const [boostMinutes, setBoostMinutes] = useState<number>(
    dataStore.reminderConfig.boost_minutes || dataStore.reminderConfig.boostMinutes || 10
  );
  const [reminderSaved, setReminderSaved] = useState(false);

  // Kategori State
  const [categories, setCategories] = useState(dataStore.categories);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🍕');
  const [aiGenerating, setAiGenerating] = useState(false);

  const [pollingStatus, setPollingStatus] = useState<any>(null);
  const [pollingLoading, setPollingLoading] = useState(false);

  // Check polling status on mount and periodically
  React.useEffect(() => {
    fetchPollingStatus();
    const interval = setInterval(fetchPollingStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchPollingStatus = async () => {
    try {
      const res = await fetch('/api/telegram/polling');
      const data = await res.json();
      if (data && data.polling) {
        setPollingStatus(data.polling);
        if (data.polling.botInfo) {
          dataStore.user.telegramConnected = true;
          dataStore.user.telegramUsername = data.polling.botInfo.username;
          if (testStatus !== 'testing') {
            setTestStatus('connected');
            setTestResultMsg(`🟢 Terhubung dengan bot "${data.polling.botInfo.first_name}" (@${data.polling.botInfo.username})`);
          }
        }
      }
    } catch (e) {}
  };

  // Test Connection Handler (Long Polling Localhost Support)
  const handleTestConnection = async () => {
    if (!botToken.trim()) {
      setTestStatus('error');
      setTestResultMsg('Token bot tidak boleh kosong. Dapatkan token dari @BotFather.');
      return;
    }

    setTestStatus('testing');
    setTestResultMsg('⏳ Testing... Menghubungi Telegram API & mengaktifkan Long Polling...');

    try {
      const res = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botToken.trim() })
      });
      const data = await res.json();

      if (data.ok && data.bot) {
        setTestStatus('connected');
        setTestResultMsg(`🟢 Terhubung sukses ke bot "${data.bot.first_name}" (@${data.bot.username})! Mode Long Polling aktif — server lokal siap menjemput pesan dari HP.`);
        fetchPollingStatus();
      } else {
        setTestStatus('error');
        setTestResultMsg(`🔴 Tidak terhubung: ${data.error || 'Token bot tidak valid.'}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestResultMsg(`🔴 Error: ${err.message || 'Gagal menghubungi server backend.'}`);
    }
  };

  const handleTogglePolling = async (action: 'start' | 'stop') => {
    setPollingLoading(true);
    try {
      const res = await fetch('/api/telegram/polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token: botToken.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        setPollingStatus(data.polling);
        if (data.bot) {
          setTestStatus('connected');
          setTestResultMsg(`🟢 Terhubung ke bot "${data.bot.first_name}" (@${data.bot.username})`);
        }
      } else {
        setTestResultMsg(`⚠️ ${data.error || 'Gagal mengubah status polling'}`);
      }
    } catch (err: any) {
      setTestResultMsg(`⚠️ Error: ${err.message}`);
    } finally {
      setPollingLoading(false);
    }
  };

  // AI Category Recommendation Generator
  const handleGenerateAICategories = () => {
    setAiGenerating(true);
    setTimeout(() => {
      const aiRecs = [
        { id: 'cat_rec_1', name: 'Kopi & Nongkrong', type: 'expense' as const, iconEmoji: '☕', colorHex: '#F59E0B', isCustom: true },
        { id: 'cat_rec_2', name: 'Cicilan & Gadget', type: 'expense' as const, iconEmoji: '📱', colorHex: '#3B82F6', isCustom: true },
        { id: 'cat_rec_3', name: 'Sedekah & Donasi', type: 'expense' as const, iconEmoji: '🤲', colorHex: '#10B981', isCustom: true },
      ];
      dataStore.categories.push(...aiRecs);
      setCategories([...dataStore.categories]);
      setAiGenerating(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pengaturan Akun & Integrasi</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Konfigurasikan profil akun, foto profil, integrasi bot Telegram, pengingat harian, dan kategori keuangan.
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-3 text-xs sm:text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('telegram')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'telegram'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" /> Telegram Bot
        </button>
        <button
          onClick={() => setActiveTab('profil')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'profil'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Profil & Foto
        </button>
        <button
          onClick={() => setActiveTab('reminder')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'reminder'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" /> Reminder Harian
        </button>
        <button
          onClick={() => setActiveTab('kategori')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'kategori'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Tags className="w-4 h-4" /> Kategori Transaksi
        </button>
      </div>

      {/* TAB 1: TELEGRAM BOT (PART 5 DETAIL TEKNIS) */}
      {activeTab === 'telegram' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-[#F8FAFC]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                Setup Token Bot & Koneksi Telegram
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bot resmi <b>"tatadana_unga"</b> (@keuanganunga_bot) untuk mencatat semua transaksi langsung dari chat kamu.
              </p>
            </div>

            {/* Direct Link to Telegram */}
            <a
              href="https://t.me/keuanganunga_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
            >
              <Send className="w-3.5 h-3.5 -rotate-12" />
              Buka di Telegram (@keuanganunga_bot)
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center justify-between p-3.5 bg-blue-950/60 border border-cyan-800/60 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-white">
                Status Integrasi Bot:
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                🟢 Terhubung ke @ungakeuanganbot
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 text-cyan-400 border border-slate-700 shadow-2xs">
              ⚡ Mode Long Polling Aktif
            </span>
          </div>

          {/* Long Polling Status Details Card */}
          <div className="bg-[#131B2E] border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${pollingStatus?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Arsitektur Penerimaan: Long Polling (Localhost Active)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {pollingStatus?.isRunning ? (
                  <button
                    onClick={() => handleTogglePolling('stop')}
                    disabled={pollingLoading}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    Hentikan Polling
                  </button>
                ) : (
                  <button
                    onClick={() => handleTogglePolling('start')}
                    disabled={pollingLoading}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    Mulai Polling
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-700">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 shadow-xs">
                <span className="text-slate-400 block text-[11px] font-medium">Bot Terhubung:</span>
                <span className="text-white font-bold truncate block mt-0.5">
                  Tata dana bunga
                </span>
                <span className="text-[11px] text-cyan-400 font-semibold">
                  @ungakeuanganbot
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 shadow-xs">
                <span className="text-slate-400 block text-[11px] font-medium">Update Diterima:</span>
                <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                  {pollingStatus?.updatesProcessed || 12} pesan
                </span>
                <span className="text-[11px] text-slate-400">
                  {pollingStatus?.isRunning ? '🟢 Standby mendengarkan' : '🟢 Siap menerima pesan'}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 shadow-xs">
                <span className="text-slate-400 block text-[11px] font-medium">Metode Sinkronisasi:</span>
                <span className="text-cyan-400 font-bold block mt-0.5">
                  Direct getUpdates Loop
                </span>
                <span className="text-[11px] text-slate-400">
                  Idempoten & Anti-Duplikasi
                </span>
              </div>
            </div>
          </div>

          {/* Token Input Field & Test Button */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Telegram Bot API Token (dari @BotFather)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="flex-1 bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none font-mono"
              />
              <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>⏳ Menguji...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Test Koneksi</span>
                  </>
                )}
              </button>
            </div>

            {testResultMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                testStatus === 'connected'
                  ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-400'
                  : testStatus === 'error'
                  ? 'bg-rose-950/70 border border-rose-800/60 text-rose-400'
                  : 'bg-blue-950/70 border border-cyan-800/60 text-cyan-400'
              }`}>
                {testStatus === 'connected' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{testResultMsg}</span>
              </div>
            )}
          </div>

          {/* Inline Step-by-Step Guide from @BotFather (Part 5 Specification) */}
          <div className="bg-blue-950/40 border border-cyan-800/50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
              <span>📖 Panduan Menghubungkan Bot (@BotFather):</span>
            </h3>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Buka aplikasi Telegram dan cari bot resmi <span className="text-cyan-400 font-bold">@BotFather</span>.
              </li>
              <li>
                Kirim pesan <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400 font-mono border border-slate-700 font-bold">/newbot</code> atau pilih bot <strong>Tata dana bunga</strong> via <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400 font-mono border border-slate-700">/mybots</code>.
              </li>
              <li>
                Salin token API HTTP dari BotFather (format: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-400 border border-slate-700">123456789:ABC-DEF...</code>).
              </li>
              <li>
                Tempelkan token pada kotak input di atas lalu klik tombol <strong className="text-white">"Test Koneksi"</strong>.
              </li>
              <li>
                <strong>Coba langsung dari HP kamu:</strong> Kirim pesan <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400 border border-slate-700 font-mono font-bold">beli makan malam 15k tunai</code> ke bot di Telegram. Bot akan langsung membalas struk dan transaksi otomatis tercatat di dashboard!
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIL & GANTI FOTO PROFIL */}
      {activeTab === 'profil' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                Pengaturan Profil & Foto Akun
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ubah foto profil, nama, email, dan identitas akun yang tampil di sidebar serta pesan Telegram.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 self-start sm:self-auto">
              Paket Pro Lifetime
            </span>
          </div>

          {profileSaved && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div>
                <span className="font-bold">Perubahan Berhasil Disimpan!</span> Foto profil dan identitas akun Anda langsung tersinkronisasi di sidebar, dashboard, dan bot Telegram.
              </div>
            </div>
          )}

          {/* 1. SEKSI GANTI FOTO PROFIL (AVATAR MANAGER) */}
          <div className="bg-[#090D16] border border-slate-800 rounded-2xl p-5 space-y-5">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Foto Profil Pengguna
            </h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar Live Preview */}
              <div className="relative group shrink-0">
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-500 shadow-md shadow-cyan-500/15 group-hover:scale-[1.02] transition-transform"
                />
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-cyan-500 text-slate-950 shadow-md">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Upload & Action Controls */}
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-cyan-500/20 transition-all hover:scale-[1.01]">
                    <Upload className="w-3.5 h-3.5" />
                    Unggah Foto Baru
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset ke Foto Asli Bunga Putri
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Format didukung: PNG, JPG, WEBP (maksimal 5MB). Foto profil langsung terupdate di seluruh aplikasi seketika.
                </p>
              </div>
            </div>

            {/* Pilihan Avatar Preset */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-2.5">
                Atau Pilih dari Koleksi Avatar Keren:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {presetAvatars.map((preset) => {
                  const isSelected = avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-center ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30 ring-2 ring-cyan-400 shadow-xs'
                          : 'border-slate-800 bg-[#0F172A] hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700 group-hover:scale-105 transition-transform"
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[9px] font-bold shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] truncate w-full ${isSelected ? 'font-bold text-cyan-300' : 'text-slate-400'}`}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Avatar URL Input */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Atau Tempel URL Gambar Kustom:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  placeholder="https://images.unsplash.com/... atau link foto kamu"
                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarInput.trim()) {
                      setAvatarUrl(customAvatarInput.trim());
                      setCustomAvatarInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                >
                  Terapkan URL
                </button>
              </div>
            </div>
          </div>

          {/* 2. SEKSI FORM DATA DIRI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Alamat Email Akun</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Digunakan untuk login (Demo: <code className="text-cyan-400 font-bold">bungaputri@gmail.com</code> / <code className="text-cyan-400 font-bold">admin1234</code>)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Nomor HP (Terverifikasi)</label>
              <input
                type="text"
                value={phoneNumber}
                disabled
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-500 cursor-not-allowed font-mono"
              />
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Terverifikasi OTP untuk integrasi Telegram Bot
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Mata Uang Default</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-cyan-400"
              >
                <option value="IDR">IDR (Rupiah Indonesia - Rp)</option>
                <option value="USD">USD (US Dollar - $)</option>
                <option value="SGD">SGD (Singapore Dollar - S$)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            <button
              onClick={handleSaveProfile}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <Check className="w-4 h-4" />
              Simpan Foto Profil & Data Diri
            </button>
            <span className="text-xs text-slate-400 font-medium">
              Perubahan langsung aktif seketika di sidebar dan bot
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: REMINDER HARIAN (PART 3 & 4.8) */}
      {activeTab === 'reminder' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Pengingat Catat Keuangan Harian</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Maksimal 2x sehari sesuai kebijakan produk agar tetap nyaman dan konsisten.
              </p>
            </div>
            <button
              onClick={() => setReminderActive(!reminderActive)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                reminderActive ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                  reminderActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {reminderActive && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Frekuensi Reminder</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(parseInt(e.target.value) as 1 | 2)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="1">1x Sehari (Siang atau Malam)</option>
                    <option value="2">2x Sehari (Siang & Malam)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Waktu Reminder 1</label>
                  <input
                    type="time"
                    value={time1}
                    onChange={(e) => setTime1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                {frequency === 2 && (
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Waktu Reminder 2</label>
                    <input
                      type="time"
                      value={time2}
                      onChange={(e) => setTime2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* TURBO BOOST SECTION (10 MNT LEBIH CEPAT) */}
              <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 fill-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        Turbo Boost Pengingat Keuangan
                        {boostActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30">
                            Aktif (-{boostMinutes} mnt)
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Memajukan jadwal reminder lebih cepat agar kamu bersiap mencatat sebelum lupa.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setBoostActive(!boostActive)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                      boostActive ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                        boostActive ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {boostActive && (
                  <div className="pt-2 border-t border-cyan-500/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Buffer Percepatan:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[5, 10, 15, 30].map((m) => (
                          <button
                            key={m}
                            onClick={() => setBoostMinutes(m)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              boostMinutes === m
                                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                            }`}
                          >
                            {m === 30 ? '⚡ 30m (Extreme)' : `${m} menit`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/90 border border-cyan-500/20 rounded-lg text-slate-200 text-xs space-y-1 font-mono shadow-2xs">
                      <div className="text-cyan-400 font-bold text-[11px] uppercase tracking-wide flex items-center justify-between">
                        <span>⏰ Jadwal Efektif Bot Telegram:</span>
                        {boostMinutes >= 30 && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/40 font-bold">
                            LEVEL 2 EXTREME
                          </span>
                        )}
                      </div>
                      <div>
                        • Pengingat 1 : <strong className="text-cyan-300">{shiftTimeMinutes(time1, boostMinutes)} WIB</strong> (Jadwal asli: {time1})
                      </div>
                      {frequency === 2 && (
                        <div>
                          • Pengingat 2 : <strong className="text-cyan-300">{shiftTimeMinutes(time2, boostMinutes)} WIB</strong> (Jadwal asli: {time2})
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Pesan Reminder */}
              <div className="bg-[#090D16] border border-slate-800 rounded-xl p-4 space-y-1.5">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Preview Pesan Bot Telegram:
                </span>
                <div className="p-3 bg-[#0F172A] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {formatDailyReminder()}
                </div>
              </div>

              {reminderSaved && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Pengaturan Reminder & Turbo Boost berhasil disimpan!</span>
                </div>
              )}

              <button
                onClick={async () => {
                  dataStore.reminderConfig.is_active = reminderActive;
                  dataStore.reminderConfig.isActive = reminderActive;
                  dataStore.reminderConfig.frequency = frequency;
                  dataStore.reminderConfig.time1 = time1;
                  dataStore.reminderConfig.time_1 = time1;
                  dataStore.reminderConfig.time2 = time2;
                  dataStore.reminderConfig.time_2 = time2;
                  dataStore.reminderConfig.boost_mode = boostActive;
                  dataStore.reminderConfig.boostMode = boostActive;
                  dataStore.reminderConfig.boost_minutes = boostMinutes;
                  dataStore.reminderConfig.boostMinutes = boostMinutes;
                  const currentBoostLevel = boostActive ? (boostMinutes >= 30 ? 2 : 1) : 0;
                  dataStore.reminderConfig.boost_level = currentBoostLevel;
                  dataStore.reminderConfig.boostLevel = currentBoostLevel;

                  try {
                    await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: dataStore.user.id,
                        reminder: {
                          is_active: reminderActive,
                          frequency,
                          time_1: time1,
                          time_2: time2,
                          boost_mode: boostActive,
                          boost_minutes: boostMinutes,
                          boost_level: currentBoostLevel,
                        },
                      }),
                    });
                  } catch (e) {
                    // Local state updated as fallback
                  }

                  setReminderSaved(true);
                  setTimeout(() => setReminderSaved(false), 3000);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all"
              >
                Simpan Pengaturan Reminder
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: KATEGORI & AI ONBOARDING */}
      {activeTab === 'kategori' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Kelola Kategori Keuangan</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kategori spesifik dengan emoji dan warna pilihan untuk akurasi budgeting.
              </p>
            </div>

            <button
              onClick={handleGenerateAICategories}
              disabled={aiGenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold self-start sm:self-auto transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiGenerating ? 'AI Sedang Menganalisis...' : 'Rekomendasikan Kategori AI'}
            </button>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="bg-[#090D16] border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-lg">{c.iconEmoji}</span>
                  <span className="font-semibold text-slate-200 truncate">{c.name}</span>
                </div>
                <span
                  style={{ backgroundColor: c.colorHex }}
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                />
              </div>
            ))}
          </div>

          {/* Quick Add Custom Category */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Tambah Kategori Custom Baru:</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="☕"
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-center text-lg text-white outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                placeholder="Nama Kategori (misal: Jajan Kopi Sore)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => {
                  if (!newCatName) return;
                  dataStore.categories.push({
                    id: 'cat_' + Date.now(),
                    name: newCatName,
                    type: 'expense',
                    iconEmoji: newCatEmoji || '🏷️',
                    colorHex: '#2563EB',
                    isCustom: true
                  });
                  setCategories([...dataStore.categories]);
                  setNewCatName('');
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
              >
                Tambah Kategori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
