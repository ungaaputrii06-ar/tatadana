import { formatRupiah } from '../utils/currency';
import { formatWIBDateTime } from '../utils/date';
import { Budget, Category, Wallet } from '../types';

/**
 * Creates visual progress bar using █ and ░
 * e.g. 75% -> "███████░░░"
 */
export function createProgressBar(percentage: number, totalBlocks = 10): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledBlocks = Math.round((clamped / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

export interface ExpenseReplyParams {
  amount: number;
  category: Category | { name: string; emoji: string };
  wallet: Wallet | { name: string; balance: number };
  notes: string;
  budget?: Budget;
  transcript?: string;
}

export function formatExpenseReply(params: ExpenseReplyParams): string {
  const { amount, category, wallet, notes, budget, transcript } = params;
  const headerDate = formatWIBDateTime();

  let message = `📅 ${headerDate}\n`;
  if (transcript) {
    message += `🎙️ Transkrip: "${transcript}"\n`;
  }
  message += `💸 Pengeluaran tercatat!\n`;
  message += `├ Nominal : ${formatRupiah(amount)}\n`;
  message += `├ Kategori : ${category.emoji} ${category.name}\n`;
  message += `├ Dompet : 👛 ${wallet.name}\n`;
  message += `├ Catatan : ${notes}\n`;
  message += `└ Saldo : ${formatRupiah(wallet.balance)}\n\n`;

  const monthly = budget?.monthly_amount || budget?.monthlyAmount || 0;
  if (budget && monthly > 0) {
    const spent = (budget.spent_amount || budget.spentAmount || 0) + amount;
    const percentage = Math.round((spent / monthly) * 100);
    const remaining = Math.max(0, monthly - spent);
    const bar = createProgressBar(percentage);

    message += `📊 Budget ${category.name} bulan ini:\n`;
    message += `${bar} ${percentage}% — sisa ${formatRupiah(remaining)}\n`;

    if (percentage >= 100) {
      message += `🚨 Perhatian! Budget ${category.name} bulan ini sudah terlampaui. Yuk rem dulu pengeluaranmu!`;
    } else if (percentage >= 80) {
      message += `⚠️ Pengeluaran sudah mendekati batas budget bulanan. Tetap bijak berbelanja ya!`;
    } else {
      message += `👍 Keuangan terkendali, pertahankan ya!`;
    }
  } else {
    message += `💡 Belum ada budget untuk ${category.name}. Kamu bisa atur budget di dashboard web TataDana.`;
  }

  return message;
}

export interface IncomeReplyParams {
  amount: number;
  wallet: Wallet | { name: string; balance: number };
  transcript?: string;
}

export function formatIncomeReply(params: IncomeReplyParams): string {
  const { amount, wallet, transcript } = params;
  const headerDate = formatWIBDateTime();

  let message = `📅 ${headerDate}\n`;
  if (transcript) {
    message += `🎙️ Transkrip: "${transcript}"\n`;
  }
  message += `💰 Pemasukan tercatat!\n`;
  message += `├ Nominal : ${formatRupiah(amount)}\n`;
  message += `├ Kategori : 💼 Pemasukan\n`;
  message += `├ Dompet : 👛 ${wallet.name}\n`;
  message += `└ Saldo baru : ${formatRupiah(wallet.balance)}\n\n`;
  message += `💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;

  return message;
}

export function formatReminderMessage(): string {
  return `⏰ Reminder Keuangan!
Jangan lupa catat pengeluaran hari ini ya 📝
Pencatatan rutin = keuangan lebih terkontrol 💪
Ketik transaksimu sekarang!`;
}

export function formatFinancialAdvisorMessage(userName: string, analysis: string, advice: string): string {
  return `🤖 Financial Advisor
Hei ${userName}! ${analysis}
💡 Saran: ${advice}`;
}
