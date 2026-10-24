import { mockStore } from '../supabase/mock-store';
import { Budget, Transaction, UserProfile } from '../types';
import { formatRupiah } from '../utils/currency';
import { formatFinancialAdvisorMessage } from '../telegram/reply-formatter';

export interface AdvisorAnalysisResult {
  triggered: boolean;
  message?: string;
  reason?: 'surge_category' | 'expense_over_80_income' | 'large_single_expense';
}

export function evaluateFinancialAdvisorTriggers(
  user: UserProfile,
  latestTransaction: Transaction,
  categoryBudget?: Budget
): AdvisorAnalysisResult {
  // Pro plan only feature
  if (user.plan !== 'pro') {
    return { triggered: false };
  }

  const budgetMonthly = (categoryBudget?.monthly_amount || categoryBudget?.monthlyAmount || 0);
  const firstName = (user.full_name || user.fullName || 'Sobat').split(' ')[0];

  // Trigger 3: Pengeluaran besar (>20% dari total budget kategori dalam 1 transaksi)
  if (
    latestTransaction.type === 'expense' &&
    categoryBudget &&
    budgetMonthly > 0 &&
    latestTransaction.amount >= budgetMonthly * 0.2
  ) {
    const pct = Math.round((latestTransaction.amount / budgetMonthly) * 100);
    const catName = latestTransaction.category?.name || 'kategori ini';
    const analysis = `Transaksi pengeluaran baru saja memakan ${pct}% dari total alokasi budget bulanan ${catName} (${formatRupiah(latestTransaction.amount)} dari total ${formatRupiah(budgetMonthly)}).`;
    const advice = `Pertimbangkan untuk menahan pengeluaran ${catName} lainnya hingga pertengahan bulan agar budget tidak jebol.`;

    return {
      triggered: true,
      reason: 'large_single_expense',
      message: formatFinancialAdvisorMessage(firstName, analysis, advice),
    };
  }

  // Trigger 2: Total pengeluaran bulan ini sudah >80% dari total pemasukan bulan ini
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const userTxs = mockStore.getTransactionsByUser(user.id).filter((t) => {
    const raw = t.transaction_date || t.transactionDate;
    if (!raw) return false;
    const d = new Date(raw);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = userTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = userTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (totalIncome > 0 && totalExpense >= totalIncome * 0.8) {
    const expensePct = Math.round((totalExpense / totalIncome) * 100);
    const analysis = `Pengeluaranmu bulan ini sudah mencapai ${expensePct}% dari seluruh pemasukanmu (${formatRupiah(totalExpense)} dari ${formatRupiah(totalIncome)}).`;
    const advice = `Alokasikan sisa dana untuk kebutuhan esensial dan prioritaskan tabungan dana darurat sekarang juga.`;

    return {
      triggered: true,
      reason: 'expense_over_80_income',
      message: formatFinancialAdvisorMessage(firstName, analysis, advice),
    };
  }

  return { triggered: false };
}
