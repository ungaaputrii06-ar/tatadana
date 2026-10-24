'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Sun,
  CalendarDays,
  Moon,
  Sparkle,
  Sliders,
  Filter,
  PieChart,
  Edit2,
  Check,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatRupiah } from '@/lib/utils/currency';
import { Budget, Category } from '@/lib/types';

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';
type CategoryGroup = 'all' | 'needs' | 'wants' | 'savings';
type StatusFilter = 'all' | 'safe' | 'warning' | 'danger';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('monthly');
  const [activeGroup, setActiveGroup] = useState<CategoryGroup>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const userId = 'usr_bunga_01';

  useEffect(() => {
    fetchBudgetsData(activePeriod);
    const handleUpdate = () => {
      fetchBudgetsData(activePeriod);
    };
    window.addEventListener('tatadana_data_updated', handleUpdate);
    const interval = setInterval(() => fetchBudgetsData(activePeriod), 4000);
    return () => {
      window.removeEventListener('tatadana_data_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [activePeriod]);

  const fetchBudgetsData = async (period: PeriodType) => {
    try {
      setLoading(true);
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/budgets?userId=${userId}&periodType=${period}`),
        fetch(`/api/categories?userId=${userId}`),
      ]);
      const bData = await bRes.json();
      const cData = await cRes.json();

      setBudgets(bData.budgets || []);
      const expenseCats = (cData.categories || []).filter((c: Category) => c.type === 'expense');
      setCategories(expenseCats);
      if (expenseCats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(expenseCats[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (b: Budget) => {
    const catId = b.category_id || b.categoryId || '';
    const currentLimit = b.monthly_amount || b.monthlyAmount || 0;
    setSelectedCategoryId(catId);
    setAmount(String(currentLimit));
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    if (categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
    setAmount('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          categoryId: selectedCategoryId,
          amount: Number(amount),
          periodType: activePeriod,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Gagal menyimpan target budget.');
      } else {
        setIsModalOpen(false);
        setSuccessToast(`Target budget berhasil disimpan untuk periode ${periodLabels[activePeriod].title}!`);
        setTimeout(() => setSuccessToast(''), 4000);
        await fetchBudgetsData(activePeriod);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
        }
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAmount = (addVal: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + addVal));
  };

  const handleSetExactAmount = (exactVal: number) => {
    setAmount(String(exactVal));
  };

  const periodLabels: Record<PeriodType, { title: string; desc: string; icon: any }> = {
    daily: { title: 'Harian (1 Hari)', desc: 'Batas belanja per hari', icon: Sun },
    weekly: { title: 'Mingguan (7 Hari)', desc: 'Target batas belanja pekanan', icon: CalendarDays },
    monthly: { title: 'Bulanan (1 Bulan)', desc: 'Standar plafon bulanan', icon: Moon },
    yearly: { title: 'Tahunan (1 Tahun)', desc: 'Akumulasi plafon satu tahun', icon: Sparkle },
  };

  const getCategoryGroup = (name?: string): CategoryGroup => {
    if (!name) return 'needs';
    const lower = name.toLowerCase();
    if (lower.includes('makan') || lower.includes('bensin') || lower.includes('tagihan') || lower.includes('kesehatan') || lower.includes('pendidikan')) {
      return 'needs';
    }
    if (lower.includes('kopi') || lower.includes('belanja') || lower.includes('hiburan') || lower.includes('pakaian')) {
      return 'wants';
    }
    return 'savings';
  };

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (activeGroup !== 'all') {
        const catName = b.category?.name || b.categoryName || '';
        const group = getCategoryGroup(catName);
        if (group !== activeGroup) return false;
      }

      if (statusFilter !== 'all') {
        const limit = b.monthly_amount || b.monthlyAmount || 1;
        const spent = b.spent_amount || b.spentAmount || 0;
        const pct = (spent / limit) * 100;
        if (statusFilter === 'danger' && pct < 100) return false;
        if (statusFilter === 'warning' && (pct < 80 || pct >= 100)) return false;
        if (statusFilter === 'safe' && pct >= 80) return false;
      }

      return true;
    });
  }, [budgets, activeGroup, statusFilter]);

  const totalBudget = budgets.reduce((s, b) => s + (b.monthly_amount || b.monthlyAmount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent_amount || b.spentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overallPercentage = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Target className="w-7 h-7 text-cyan-400" />
              Sistem Budgeting & Plafon Keuangan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-cyan-400 border border-cyan-800/60">
              Kategori Spesifik • Harian • Mingguan • Bulanan
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kendalikan cashflow dengan target spesifik per kategori. Peringatan otomatis 80% & 100% dikirim via Telegram bot <b>@ungakeuanganbot</b>.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 self-start sm:self-auto shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Pasang Target Budget Baru
        </button>
      </div>

      {/* Multi-Period Selector Tabs (Daily, Weekly, Monthly, Yearly) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0F172A] p-2 rounded-2xl border border-slate-800">
        {(['daily', 'weekly', 'monthly', 'yearly'] as PeriodType[]).map((periodKey) => {
          const item = periodLabels[periodKey];
          const Icon = item.icon;
          const isActive = activePeriod === periodKey;

          return (
            <button
              key={periodKey}
              onClick={() => setActivePeriod(periodKey)}
              className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold">{item.title}</span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <span className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                {item.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400">Total Plafon ({periodLabels[activePeriod].title.split(' ')[0]})</div>
          <div className="text-xl font-black text-white mt-0.5">{formatRupiah(totalBudget)}</div>
          <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> {budgets.length} kategori aktif
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400">Terpakai Saat Ini</div>
          <div className="text-xl font-black text-cyan-400 mt-0.5">{formatRupiah(totalSpent)}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Dihitung dari transaksi real-time</div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400">Sisa Kuota Anggaran</div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">{formatRupiah(totalRemaining)}</div>
          <div className="text-[10px] text-emerald-400 mt-1 font-semibold">Dapat dibelanjakan aman</div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400">Tingkat Penyerapan</div>
          <div className={`text-xl font-black mt-0.5 ${overallPercentage >= 80 ? 'text-rose-400' : 'text-white'}`}>
            {overallPercentage}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            {overallPercentage >= 100 ? '🚨 Lampaui Target' : overallPercentage >= 80 ? '⚠️ Batas Peringatan' : '✅ Kondisi Sehat'}
          </div>
        </div>
      </div>

      {/* 50/30/20 Smart Financial Planning Card */}
      <div className="bg-gradient-to-r from-blue-950/60 via-[#0F172A] to-[#0F172A] border border-cyan-800/40 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Pilar Alokasi Cerdas 50 / 30 / 20
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Distribusi Plafon Budget Berdasarkan Kategori
            </h3>
          </div>

          {/* Group Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {[
              { id: 'all', label: 'Semua Kategori' },
              { id: 'needs', label: '🍜 50% Pokok' },
              { id: 'wants', label: '☕ 30% Keinginan' },
              { id: 'savings', label: '💎 20% Tabungan' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeGroup === g.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Ratio Bar */}
        <div className="w-full h-3 bg-slate-800 rounded-full flex overflow-hidden border border-slate-700">
          <div className="bg-blue-500 h-full" style={{ width: '50%' }} title="50% Kebutuhan Pokok" />
          <div className="bg-cyan-400 h-full" style={{ width: '30%' }} title="30% Keinginan & Hiburan" />
          <div className="bg-emerald-500 h-full" style={{ width: '20%' }} title="20% Tabungan & Investasi" />
        </div>
      </div>

      {/* Budgets Grid */}
      {filteredBudgets.length === 0 ? (
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Belum Ada Target Budget di Kategori Ini</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Pasang target pengeluaran untuk mengendalikan pengeluaran harian, mingguan, dan bulanan kamu.
          </p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20"
          >
            Pasang Budget Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map((b) => {
            const limit = b.monthly_amount || b.monthlyAmount || 1;
            const spent = b.spent_amount || b.spentAmount || 0;
            const pct = Math.round((spent / limit) * 100);
            const remaining = Math.max(0, limit - spent);
            const isWarning = pct >= 80 && pct < 100;
            const isDanger = pct >= 100;
            const groupName = getCategoryGroup(b.category?.name || b.categoryName);

            return (
              <div
                key={b.id}
                className={`bg-[#0F172A] border rounded-2xl p-5 space-y-4 transition-all shadow-lg hover:border-cyan-500/40 relative group ${
                  isDanger
                    ? 'border-rose-800/80 bg-rose-950/20'
                    : isWarning
                    ? 'border-amber-800/80 bg-amber-950/20'
                    : 'border-slate-800'
                }`}
              >
                {/* Header & Badges */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-slate-900 rounded-xl border border-slate-800">
                      {b.category?.emoji || b.categoryEmoji || '🏷️'}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{b.category?.name || b.categoryName || 'Kategori'}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {groupName === 'needs' ? '🍜 Kebutuhan Pokok' : groupName === 'wants' ? '☕ Gaya Hidup' : '💎 Tabungan/Sosial'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[10px] text-cyan-400 font-bold">{periodLabels[activePeriod].title.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isDanger
                        ? 'bg-rose-950 text-rose-400 border-rose-800/60'
                        : isWarning
                        ? 'bg-amber-950 text-amber-400 border-amber-800/60'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                    }`}
                  >
                    {isDanger ? 'Over Budget' : isWarning ? 'Waspada 80%' : 'Aman'}
                  </span>
                </div>

                {/* Progress Bar Visual */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Terpakai: <b className="text-white">{formatRupiah(spent)}</b>
                    </span>
                    <span
                      className={`font-black ${
                        isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                {/* Remaining Info & Edit Button */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-medium">Plafon Anggaran:</span>
                    <span className="font-bold text-white">{formatRupiah(limit)}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] font-medium">Sisa Kuota:</span>
                    <span className={`font-bold ${remaining === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatRupiah(remaining)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-black transition-all ml-2"
                    title="Ubah Plafon Budget"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Set Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Pasang / Ubah Budget (${periodLabels[activePeriod].title.split(' ')[0]})`}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4 text-slate-200">
          {errorMsg && (
            <div className="p-3 bg-rose-950 border border-rose-800 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Pilih Kategori Spesifik</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-[#131B2E] border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white font-semibold outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.emoji || '🏷️'} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                Batas Anggaran Nominal (Rp)
              </label>
              {amount && Number(amount) > 0 && (
                <span className="text-xs font-black text-cyan-400">
                  {formatRupiah(Number(amount))}
                </span>
              )}
            </div>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 1500000"
              className="w-full bg-[#131B2E] border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Target plafon untuk jangka waktu: <b>{periodLabels[activePeriod].title}</b>
            </p>

            {/* Quick Preset Buttons */}
            <div className="mt-3 space-y-1.5">
              <div className="text-[10px] text-slate-400 font-bold">Tambah Cepat:</div>
              <div className="flex flex-wrap gap-1.5">
                {[100000, 250000, 500000, 1000000].map((addVal) => (
                  <button
                    key={addVal}
                    type="button"
                    onClick={() => handleAddAmount(addVal)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-semibold rounded-lg transition-all"
                  >
                    +{formatRupiah(addVal).replace('Rp', '')}
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-slate-400 font-bold pt-1">Atur Nominal Populer:</div>
              <div className="flex flex-wrap gap-1.5">
                {[500000, 1000000, 2000000, 3000000, 5000000].map((exactVal) => (
                  <button
                    key={exactVal}
                    type="button"
                    onClick={() => handleSetExactAmount(exactVal)}
                    className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 border border-cyan-800/60 text-[11px] text-cyan-400 font-bold rounded-lg transition-all"
                  >
                    {formatRupiah(exactVal)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Target Budget'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
