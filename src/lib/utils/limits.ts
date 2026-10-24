import { SubscriptionPlan, UserProfile } from '../types';

export const PLAN_LIMITS = {
  starter: {
    maxMonthlyTransactions: 50,
    maxWallets: 3,
    maxCategoryBudgets: 5,
    allowReceiptPhoto: false,
    allowVoiceNote: true,
    allowFinancialAdvisor: false,
    allowAdvancedFilters: false,
    allowExport: false,
  },
  pro: {
    maxMonthlyTransactions: Infinity,
    maxWallets: Infinity,
    maxCategoryBudgets: Infinity,
    allowReceiptPhoto: true,
    allowVoiceNote: true,
    allowFinancialAdvisor: true,
    allowAdvancedFilters: true,
    allowExport: true,
  },
};

export function checkPlanLimit(
  user: UserProfile,
  feature: keyof typeof PLAN_LIMITS['starter'],
  currentUsage = 0
): { allowed: boolean; message?: string } {
  const plan = user.plan || 'starter';
  const limits = PLAN_LIMITS[plan];

  if (feature === 'maxMonthlyTransactions') {
    if (currentUsage >= limits.maxMonthlyTransactions) {
      return {
        allowed: false,
        message:
          '⚠️ Kuota transaksi bulanan kamu sudah mencapai batas maksimal (50 transaksi/bulan) untuk paket Starter. Upgrade ke paket Pro untuk nikmati pencatatan tanpa batas!',
      };
    }
  }

  if (feature === 'maxWallets') {
    if (currentUsage >= limits.maxWallets) {
      return {
        allowed: false,
        message: '⚠️ Batas maksimal 3 dompet untuk paket Starter tercapai. Upgrade ke Pro untuk dompet tanpa batas!',
      };
    }
  }

  if (feature === 'maxCategoryBudgets') {
    if (currentUsage >= limits.maxCategoryBudgets) {
      return {
        allowed: false,
        message: '⚠️ Batas maksimal 5 budget kategori untuk paket Starter tercapai. Upgrade ke Pro untuk budget tak terbatas!',
      };
    }
  }

  if (feature === 'allowReceiptPhoto' && !limits.allowReceiptPhoto) {
    return {
      allowed: false,
      message:
        '📸 Fitur catat dari foto struk khusus Pro! Upgrade sekarang ke TataDana Pro (Rp99.000 sekali bayar) untuk langsung scan struk belanjamu.',
    };
  }

  if (feature === 'allowExport' && !limits.allowExport) {
    return {
      allowed: false,
      message:
        '📄 Fitur export laporan ke PDF dan Excel hanya tersedia untuk paket Pro. Upgrade untuk download laporan tanpa batas.',
    };
  }

  if (feature === 'allowFinancialAdvisor' && !limits.allowFinancialAdvisor) {
    return {
      allowed: false,
      message:
        '🤖 AI Financial Advisor eksklusif untuk paket Pro. Dapatkan analisis pengeluaran otomatis dan rekomendasi keuangan cerdas.',
    };
  }

  return { allowed: true };
}
