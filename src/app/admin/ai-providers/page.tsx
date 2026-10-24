'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Key,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { AIProviderConfig, AIMode } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminAIProvidersPage() {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [mode, setMode] = useState<AIMode>('failover');
  const [defaultProvider, setDefaultProvider] = useState('gemini');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const res = await fetch('/api/admin/ai-providers');
      const data = await res.json();
      setProviders(data.providers || []);
      if (data.settings) {
        setMode(data.settings.mode || 'failover');
        setDefaultProvider(data.settings.default_provider || 'gemini');
      }
    } catch (e) {
      console.error('Failed to load AI providers:', e);
    }
  };

  const handleUpdateProviderKey = (name: string, key: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.name === name ? { ...p, api_key_encrypted: key } : p))
    );
  };

  const handleToggleActive = async (name: string) => {
    const updated = providers.map((p) =>
      p.name === name ? { ...p, is_active: !p.is_active } : p
    );
    setProviders(updated);
    await saveCurrentConfig(mode, updated);
  };

  const handleSelectMode = async (newMode: AIMode) => {
    setMode(newMode);
    await saveCurrentConfig(newMode, providers);
    setMessage(
      newMode === 'single'
        ? 'Mode beralih ke Single Provider. Hanya provider utama yang dieksekusi.'
        : 'Mode beralih ke Parallel Failover. Sistem otomatis memanggil fallback jika provider utama offline.'
    );
    setTimeout(() => setMessage(''), 4000);
  };

  const saveCurrentConfig = async (currentMode: AIMode, currentProviders: AIProviderConfig[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: currentMode,
          defaultProvider,
          providerUpdates: currentProviders.map((p) => ({
            name: p.name,
            api_key_encrypted: p.api_key_encrypted,
            is_active: p.is_active,
            priority: p.priority,
            model_text: p.model_text,
          })),
        }),
      });

      if (res.ok) {
        setMessage('Konfigurasi AI Provider berhasil disimpan dan langsung aktif!');
        setTimeout(() => setMessage(''), 3500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = () => saveCurrentConfig(mode, providers);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-cyan-400" />
            Konfigurasi Multi-Provider AI Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Toggle mode eksekusi AI antara Single Provider dan Parallel Failover (Gemini, OpenAI, DeepSeek).
          </p>
        </div>

        <Button
          onClick={handleSaveConfig}
          loading={saving}
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-blue-500/25"
        >
          <Save className="w-4 h-4" /> Simpan Konfigurasi
        </Button>
      </div>

      {message && (
        <div className="p-3.5 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Mode Selector Toggle Cards */}
      <div className="bg-[#0F172A] p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Mode Eksekusi Multi-AI Provider
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            Status: <b className="text-cyan-400">{mode === 'single' ? 'Single Provider' : 'Parallel Failover Mode'}</b>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Single Provider */}
          <div
            onClick={() => handleSelectMode('single')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'single'
                ? 'border-cyan-400 bg-blue-950/40 ring-1 ring-cyan-500/50 shadow-md shadow-blue-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> Mode Single Provider
              </span>
              {mode === 'single' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-cyan-400 border border-cyan-800/60 font-bold">
                  ✓ Aktif
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Klik untuk beralih</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Hanya memanggil 1 provider utama (Gemini). Lebih hemat token, tetapi tidak ada otomatis failover jika API pihak ketiga mengalami rate limit atau downtime.
            </p>
          </div>

          {/* Card 2: Parallel Failover Mode */}
          <div
            onClick={() => handleSelectMode('failover')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'failover' || mode === 'parallel_failover'
                ? 'border-cyan-400 bg-blue-950/40 ring-1 ring-cyan-500/50 shadow-md shadow-blue-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Mode Parallel Failover (Rekomendasi)
              </span>
              {(mode === 'failover' || mode === 'parallel_failover') ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold">
                  ✓ Aktif
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Klik untuk beralih</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Failover berjenjang otomatis: <b>Gemini → OpenAI (GPT-4o) → DeepSeek</b>. Menjamin bot Telegram dan parser web 99.9% uptime tanpa downtime.
            </p>
          </div>
        </div>
      </div>

      {/* Providers Priority & Status Table */}
      <div className="bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Daftar Adapter Model AI Terdaftar</h2>
          <span className="text-xs text-slate-400">{providers.length} Model Terkonfigurasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Prioritas</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Model Default</th>
                <th className="py-3 px-4">API Key Masked</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {providers.map((p) => (
                <tr key={p.id} className="hover:bg-blue-950/20 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-cyan-400">#{p.priority}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      {p.display_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{p.name}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{p.model_text || '-'}</td>
                  <td className="py-3.5 px-4">
                    <input
                      type="password"
                      value={p.api_key_encrypted || ''}
                      onChange={(e) => handleUpdateProviderKey(p.name, e.target.value)}
                      placeholder="sk_..."
                      className="px-2.5 py-1 text-xs bg-slate-900 rounded-lg border border-slate-700 text-white font-mono w-40 focus:outline-none focus:border-cyan-400"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    {p.is_active ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(p.name)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        p.is_active
                          ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800/60'
                          : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/60'
                      }`}
                    >
                      {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
