'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle, Zap, Cpu, RefreshCw } from 'lucide-react';
import { AILog } from '@/lib/types';
import { formatWIBDate, formatWIBTime } from '@/lib/utils/date';

export default function AdminAILogsPage() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    fetch('/api/admin/ai-logs')
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-cyan-400" />
            Log Panggilan & Telemetri AI Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Riwayat pemanggilan LLM, prompt dikirim, pemakaian token, latensi respon, dan status failover provider (Gemini, OpenAI, DeepSeek).
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Log
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Total Panggilan AI</div>
          <div className="text-2xl font-black text-white mt-1">{logs.length} Log</div>
        </div>
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Tingkat Keberhasilan</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {logs.length > 0 ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100) : 100}%
          </div>
        </div>
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Rata-Rata Latensi</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {logs.length > 0
              ? Math.round(logs.reduce((acc, l) => acc + (l.latency_ms ?? l.latencyMs ?? 0), 0) / logs.length)
              : 0} ms
          </div>
        </div>
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Total Akumulasi Token</div>
          <div className="text-2xl font-black text-white mt-1">
            {logs.reduce((acc, l) => acc + (l.prompt_tokens ?? l.promptTokens ?? 0) + (l.completion_tokens ?? l.completionTokens ?? 0), 0).toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Telemetry Logs Table */}
      <div className="bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Fitur</th>
                <th className="py-3 px-4 max-w-xs">Prompt</th>
                <th className="py-3 px-4">Tokens (In / Out)</th>
                <th className="py-3 px-4">Latensi</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Belum ada riwayat panggilan AI telemetry tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const promptText = l.prompt || l.prompt_text || '-';
                  const promptTokens = l.prompt_tokens ?? l.promptTokens ?? 0;
                  const completionTokens = l.completion_tokens ?? l.completionTokens ?? 0;
                  const latency = l.latency_ms ?? l.latencyMs ?? 0;

                  return (
                    <tr key={l.id} className="hover:bg-blue-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
                        {formatWIBDate(l.created_at || l.createdAt || new Date().toISOString())}{' '}
                        {formatWIBTime(l.created_at || l.createdAt || new Date().toISOString())}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white uppercase text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {l.provider || l.providerName || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize text-xs">
                        {(l.feature || l.endpointType || '-').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-mono text-[11px] text-slate-300 truncate" title={promptText}>
                          {promptText}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-cyan-400">
                        {promptTokens} <span className="text-slate-500">/</span> {completionTokens}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        <span className={latency < 600 ? 'text-emerald-400' : latency < 1500 ? 'text-amber-400' : 'text-rose-400'}>
                          {latency} ms
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {l.status === 'success' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                            Sukses
                          </span>
                        )}
                        {l.status === 'fallback_triggered' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-950/70 text-amber-400 border border-amber-800/60">
                            Fallback
                          </span>
                        )}
                        {l.status === 'failed' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-950/70 text-rose-400 border border-rose-800/60">
                            Gagal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
