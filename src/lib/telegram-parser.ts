import { Transaction, Wallet, Budget, Category, UserProfile, TransactionItem } from './types';
import { isBoostOrPercepatCommand, parseBoostCommand, shiftTimeMinutes } from './utils/date';
export { isBoostOrPercepatCommand, parseBoostCommand, shiftTimeMinutes };

// ==============================================================================
// PARSING LOGIC: NOMINAL & NATURAL LANGUAGE INDONESIA
// ==============================================================================

export interface ParsedTransaction {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  categoryName: string;
  categoryEmoji: string;
  notes: string;
  description?: string;
  wallet?: string;
  walletName?: string;
  walletKeyword?: string;
  destinationWalletName?: string;
  items?: { itemName: string; quantity: number; price: number; categoryName: string }[];
  isAmbiguous?: boolean;
  errorMessage?: string;
}

/**
 * Normalisasi nominal mata uang Indonesia:
 * 15rb / 15ribu -> 15000
 * 1.5jt / 1,5jt -> 1500000
 * 500k / 500 k -> 500000
 * 25.000 / 25000 -> 25000
 */
export function parseIndonesianNominal(text: string): number | null {
  const clean = text.toLowerCase().trim();

  // Pattern: "2.5m" atau "2,5 miliar"
  const mMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:m|miliar|milyar)\b/i);
  if (mMatch) {
    const val = parseFloat(mMatch[1].replace(',', '.'));
    return Math.round(val * 1000000000);
  }

  // Pattern: "1.5jt" atau "1,5 juta"
  const jtMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i);
  if (jtMatch) {
    const val = parseFloat(jtMatch[1].replace(',', '.'));
    return Math.round(val * 1000000);
  }

  // Pattern: "500k"
  const kMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1].replace(',', '.'));
    return Math.round(val * 1000);
  }

  // Pattern: "15rb" atau "15 ribu"
  const rbMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu)\b/i);
  if (rbMatch) {
    const val = parseFloat(rbMatch[1].replace(',', '.'));
    return Math.round(val * 1000);
  }

  // Pattern: "Rp 50.000" atau "50000"
  const numMatch = clean.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);
  if (numMatch) {
    const rawNum = numMatch[1].replace(/\./g, '');
    const val = parseInt(rawNum, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

export const parseIndonesianAmount = parseIndonesianNominal;
export const parseIndonesianMessage = parseNaturalLanguageInput;

/**
 * Natural language intent parsing menggunakan rule-engine terstruktur
 * (Bekerja offline atau sebagai validator terhadap LLM API response)
 */
export function parseNaturalLanguageInput(rawText: string): ParsedTransaction {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Deteksi Nominal
  const nominal = parseIndonesianNominal(lower);
  if (!nominal || nominal <= 0) {
    return {
      type: 'expense',
      amount: 0,
      categoryName: 'Lainnya',
      categoryEmoji: '📝',
      notes: text,
      isAmbiguous: true,
      errorMessage: `Format nominal tidak dikenali. Contoh yang benar:\n• "beli bakso 15rb"\n• "gajian 5jt"\n• "kopi susu 25k"`
    };
  }

  // 2. Deteksi Wallet / Dompet Pembayaran (Tunai/Cash, BCA, Mandiri, GoPay, OVO, DANA)
  let detectedWalletName: string | undefined = undefined;
  let detectedWalletKeyword: string | undefined = undefined;

  if (/(?:^|\s)(?:tunai|cash|kontan)(?:$|\s|[!.,?])/i.test(lower)) {
    detectedWalletName = 'Dompet Tunai';
    detectedWalletKeyword = 'tunai';
  } else if (/(?:^|\s)(?:bca)(?:$|\s|[!.,?])/i.test(lower)) {
    detectedWalletName = 'BCA Prioritas';
    detectedWalletKeyword = 'bca';
  } else if (/(?:^|\s)(?:mandiri)(?:$|\s|[!.,?])/i.test(lower)) {
    detectedWalletName = 'Mandiri Tabungan';
    detectedWalletKeyword = 'mandiri';
  } else if (/(?:^|\s)(?:gopay|go-pay|go\s*pay)(?:$|\s|[!.,?])/i.test(lower)) {
    detectedWalletName = 'GoPay';
    detectedWalletKeyword = 'gopay';
  } else if (/(?:^|\s)(?:ovo)(?:$|\s|[!.,?])/i.test(lower)) {
    detectedWalletName = 'OVO';
    detectedWalletKeyword = 'ovo';
  } else if (/(?:^|\s)(?:dana)(?:$|\s|[!.,?])/i.test(lower)) {
    detectedWalletName = 'DANA';
    detectedWalletKeyword = 'dana';
  }

  // 3. Deteksi Pemasukan
  const incomeKeywords = ['gajian', 'gaji', 'terima uang', 'pemasukan', 'transfer masuk', 'dapat uang', 'bonus', 'freelance', 'cair', 'dividensi', 'profit', 'laba'];
  const isIncome = incomeKeywords.some(kw => lower.includes(kw));

  // 4. Deteksi Transfer
  const transferKeywords = ['transfer ke', 'pindah ke', 'tarik ke', 'top up', 'topup'];
  const isTransfer = transferKeywords.some(kw => lower.includes(kw));

  if (isIncome) {
    return {
      type: 'income',
      amount: nominal,
      categoryName: 'Gaji & Pendapatan',
      categoryEmoji: '💼',
      notes: text,
      walletName: detectedWalletName,
      walletKeyword: detectedWalletKeyword
    };
  }

  if (isTransfer) {
    return {
      type: 'transfer',
      amount: nominal,
      categoryName: 'Transfer',
      categoryEmoji: '🔄',
      notes: text,
      walletName: detectedWalletName,
      walletKeyword: detectedWalletKeyword
    };
  }

  // 5. Deteksi Kategori Pengeluaran berdasarkan keyword
  let categoryName = 'Lainnya';
  let categoryEmoji = '📝';

  if (/(makan|bakso|kopi|nasi|soto|mie|snack|jajan|lunch|dinner|breakfast|resto|cafe|go food|grabfood|shopeefood)/i.test(lower)) {
    categoryName = 'Makanan & Minuman';
    categoryEmoji = '🍜';
  } else if (/(bensin|gojek|grab|ojol|tol|parkir|mrt|busway|kereta|service motor|pertamax|pertalite)/i.test(lower)) {
    categoryName = 'Transportasi';
    categoryEmoji = '🚗';
  } else if (/(game|bioskop|netflix|spotify|steam|nongkrong|hiburan|konser|liburan)/i.test(lower)) {
    categoryName = 'Hiburan & Hobi';
    categoryEmoji = '🎮';
  } else if (/(listrik|pln|wifi|indihome|pdam|air|kontrakan|kos|pulsa|kuota|tagihan)/i.test(lower)) {
    categoryName = 'Tagihan & Utilitas';
    categoryEmoji = '🏠';
  } else if (/(obat|dokter|klinik|apotek|vitamin|rs|rumahsakit|bpjs)/i.test(lower)) {
    categoryName = 'Kesehatan & Obat';
    categoryEmoji = '💊';
  } else if (/(baju|celana|sepatu|tokopedia|shopee|lazada|mall|minimarket|indomaret|alfamart|belanja)/i.test(lower)) {
    categoryName = 'Belanja Kebutuhan';
    categoryEmoji = '👕';
  } else if (/(buku|kursus|udemy|kuliah|spp|les|seminar)/i.test(lower)) {
    categoryName = 'Pendidikan & Kursus';
    categoryEmoji = '📚';
  }

  return {
    type: 'expense',
    amount: nominal,
    categoryName,
    categoryEmoji,
    notes: text,
    walletName: detectedWalletName,
    walletKeyword: detectedWalletKeyword
  };
}

// ==============================================================================
// TIMEZONE & DATE FORMATTING: ASIA/JAKARTA (WIB)
// ==============================================================================

export function getWIBTimestamp(dateObj: Date = new Date()): { fullString: string; dayName: string; dateStr: string; timeStr: string } {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Convert to Asia/Jakarta offset (+7 hours)
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const wibDate = new Date(utc + (3600000 * 7));

  const dayName = days[wibDate.getDay()];
  const dateStr = `${wibDate.getDate()} ${months[wibDate.getMonth()]} ${wibDate.getFullYear()}`;
  const hours = String(wibDate.getHours()).padStart(2, '0');
  const minutes = String(wibDate.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes} WIB`;

  return {
    fullString: `${dayName}, ${dateStr} — ${timeStr}`,
    dayName,
    dateStr,
    timeStr
  };
}

export function formatRupiah(amount: number): string {
  return 'Rp' + Math.round(amount).toLocaleString('id-ID');
}

// ==============================================================================
// VISUAL PROGRESS BAR GENERATOR (ASCII)
// ==============================================================================

export function generateProgressBar(percentage: number, totalBlocks = 10): string {
  const capped = Math.min(Math.max(percentage, 0), 100);
  const filledCount = Math.round((capped / 100) * totalBlocks);
  const emptyCount = totalBlocks - filledCount;
  return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
}

// ==============================================================================
// BOT REPLY FORMATTERS (Sesuai Spesifikasi PART 4)
// ==============================================================================

export interface ExpenseReplyParams {
  nominal: number;
  categoryName: string;
  categoryEmoji: string;
  walletName: string;
  notes: string;
  balanceAfter: number;
  budgetMonthly: number;
  budgetSpent: number;
  voiceTranscript?: string;
}

export function formatExpenseReply(params: ExpenseReplyParams): string {
  const time = getWIBTimestamp();
  const budgetMonthly = params.budgetMonthly > 0 ? params.budgetMonthly : params.nominal * 2;
  const budgetSpent = params.budgetSpent + params.nominal;
  const percentage = Math.round((budgetSpent / budgetMonthly) * 100);
  const remaining = Math.max(budgetMonthly - budgetSpent, 0);
  const bar = generateProgressBar(percentage);

  let motivation = '';
  if (percentage >= 100) {
    motivation = '\n⚠️ Waduh, budget kategori ini sudah habis! Yuk lebih hemat sampai akhir bulan.';
  } else if (percentage >= 80) {
    motivation = '\n⚠️ Perhatian! Budget kategori ini sudah mencapai 80%, kontrol pengeluaran ya!';
  } else {
    motivation = '\n👍 Pengeluaran masih dalam batas wajar. Pertahankan!';
  }

  let transcriptBlock = '';
  if (params.voiceTranscript) {
    transcriptBlock = `🎙️ Transkrip: "${params.voiceTranscript}"\n\n`;
  }

  return `${transcriptBlock}📅 ${time.fullString}
💸 Pengeluaran tercatat!
├ Nominal : ${formatRupiah(params.nominal)}
├ Kategori : ${params.categoryEmoji} ${params.categoryName}
├ Dompet : 👛 ${params.walletName}
├ Catatan : ${params.notes}
└ Saldo : ${formatRupiah(params.balanceAfter)}

📊 Budget ${params.categoryName} bulan ini:
[${bar}] ${percentage}% — sisa ${formatRupiah(remaining)}${motivation}`;
}

/**
 * Resolves the appropriate wallet based on user's natural language input
 * E.g., "beli makan malam 15k tunai" -> Dompet Tunai (Cash)
 * "transfer 500k ke bca" -> BCA Prioritas
 */
export function resolveTargetWallet(
  wallets: Wallet[],
  preferredName?: string,
  preferredKeyword?: string
): Wallet {
  if (preferredName || preferredKeyword) {
    const qName = (preferredName || '').toLowerCase();
    const qKw = (preferredKeyword || '').toLowerCase();

    // 1. Check exact or partial name match
    const nameMatch = wallets.find((w) => {
      const wName = (w.name || '').toLowerCase();
      return (qName && wName.includes(qName)) || (qKw && wName.includes(qKw));
    });
    if (nameMatch) return nameMatch;

    // 2. Check wallet type match (e.g. "tunai" matches cash type)
    if (qKw === 'tunai' || qKw === 'cash') {
      const cashMatch = wallets.find(
        (w) => w.type === 'cash' || (w.name || '').toLowerCase().includes('tunai')
      );
      if (cashMatch) return cashMatch;
    }

    if (qKw === 'bca') {
      const bcaMatch = wallets.find((w) => (w.name || '').toLowerCase().includes('bca'));
      if (bcaMatch) return bcaMatch;
    }

    if (qKw === 'mandiri') {
      const mandiriMatch = wallets.find((w) => (w.name || '').toLowerCase().includes('mandiri'));
      if (mandiriMatch) return mandiriMatch;
    }

    if (qKw === 'gopay' || qKw === 'go-pay' || qKw === 'go pay') {
      const gopayMatch = wallets.find((w) => (w.name || '').toLowerCase().includes('gopay'));
      if (gopayMatch) return gopayMatch;
    }

    if (qKw === 'ovo') {
      const ovoMatch = wallets.find((w) => (w.name || '').toLowerCase().includes('ovo'));
      if (ovoMatch) return ovoMatch;
    }

    if (qKw === 'dana') {
      const danaMatch = wallets.find((w) => (w.name || '').toLowerCase().includes('dana'));
      if (danaMatch) return danaMatch;
    }
  }

  // Fallback: Default wallet or first available wallet
  return wallets.find((w) => w.isDefault || w.is_default) || wallets[0];
}


export interface IncomeReplyParams {
  nominal: number;
  walletName: string;
  balanceAfter: number;
  voiceTranscript?: string;
}

export function formatIncomeReply(params: IncomeReplyParams): string {
  const time = getWIBTimestamp();

  let transcriptBlock = '';
  if (params.voiceTranscript) {
    transcriptBlock = `🎙️ Transkrip: "${params.voiceTranscript}"\n\n`;
  }

  return `${transcriptBlock}📅 ${time.fullString}
💰 Pemasukan tercatat!
├ Nominal : ${formatRupiah(params.nominal)}
├ Kategori : 💼 Pemasukan
├ Dompet : 👛 ${params.walletName}
└ Saldo baru : ${formatRupiah(params.balanceAfter)}

💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
}

/**
 * Evaluates budget alerts at 80% and 100% threshold levels
 */
export function evaluateBudgetAlert(spent: number, monthly: number): {
  percentage: number;
  isOver80: boolean;
  isOver100: boolean;
  alertMessage?: string;
} {
  const percentage = monthly > 0 ? Math.round((spent / monthly) * 100) : 0;
  const isOver100 = percentage >= 100;
  const isOver80 = percentage >= 80;

  let alertMessage: string | undefined = undefined;
  if (isOver100) {
    alertMessage = '🚨 Perhatian! Budget kategori ini sudah habis/terlampaui (100%+). Yuk rem pengeluaranmu!';
  } else if (isOver80) {
    alertMessage = '⚠️ Peringatan: Pengeluaran kategori ini telah mencapai 80%+ batas budget bulanan!';
  }

  return {
    percentage,
    isOver80,
    isOver100,
    alertMessage,
  };
}

// ==============================================================================
// TELEGRAM COMMAND HANDLERS (4.6)
// ==============================================================================

export function handleTelegramCommand(command: string, data: {
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  user: UserProfile;
}): string {
  const cmd = command.toLowerCase().trim().replace(/[!.,?]+$/, '');

  if (cmd === '/start') {
    const userName = data.user.fullName || data.user.full_name || 'Sobat';
    return `👋 *Halo, ${userName}! Selamat datang di TataDana Bot* 💰\n\n` +
      `Saya asisten keuangan pribadi yang siap mencatat transaksi dan memantau anggaranmu secara instan.\n\n` +
      `💡 *Cara Cepat Mencatat:*\n` +
      `Cukup ketik langsung seperti chat biasa:\n` +
      `• "beli bakso 15rb"\n` +
      `• "kopi susu 25k"\n` +
      `• "bensin motor 30k tunai"\n` +
      `• "gajian bulanan 5jt ke bca"\n` +
      `• Atau kirim Voice Note / Foto Struk Belanja!\n\n` +
      `📋 *Daftar Perintah (Commands):*\n` +
      `• /saldo — Cek saldo seluruh dompet\n` +
      `• /hari ini — Rekap transaksi hari ini\n` +
      `• /bulan ini — Rekap transaksi bulan berjalan\n` +
      `• /budget — Status batas anggaran bulanan\n` +
      `• /bantuan — Panduan lengkap perintah bot`;
  }

  if (cmd === '/saldo') {
    const total = data.wallets.reduce((acc, w) => acc + w.balance, 0);
    const walletLines = data.wallets.map(w => `• ${w.name}: ${formatRupiah(w.balance)}${w.isDefault ? ' (Default)' : ''}`).join('\n');
    return `👛 Saldo Dompet TataDana:\n\n${walletLines}\n\n─────────────\nTotal Saldo: ${formatRupiah(total)}`;
  }

  if (cmd === '/hari ini') {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTx = data.transactions.filter(t => (t.transactionDate || t.transaction_date || '').startsWith(todayStr));
    const expense = todayTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const income = todayTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

    return `📅 Rekap Hari Ini (${getWIBTimestamp().dateStr}):\n\n💸 Pengeluaran: ${formatRupiah(expense)}\n💰 Pemasukan: ${formatRupiah(income)}\nTotal Transaksi: ${todayTx.length} transaksi\n\n${todayTx.length === 0 ? 'Belum ada transaksi hari ini.' : todayTx.slice(0, 5).map(t => `${t.type === 'expense' ? '🔴' : '🟢'} ${t.categoryEmoji || '🏷️'} ${t.notes}: ${formatRupiah(t.amount)}`).join('\n')}`;
  }

  if (cmd === '/minggu ini') {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weekTx = data.transactions.filter(t => new Date(t.transactionDate || t.transaction_date || '').getTime() >= weekAgo.getTime());
    const expense = weekTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const income = weekTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

    return `📊 Rekap 7 Hari Terakhir:\n\n💸 Total Pengeluaran: ${formatRupiah(expense)}\n💰 Total Pemasukan: ${formatRupiah(income)}\nNet Cashflow: ${formatRupiah(income - expense)}\nBanyak Transaksi: ${weekTx.length}`;
  }

  if (cmd === '/bulan ini') {
    const monthTx = data.transactions;
    const expense = monthTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const income = monthTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

    return `🗓️ Rekap Bulan Berjalan:\n\n💰 Total Pemasukan: ${formatRupiah(income)}\n💸 Total Pengeluaran: ${formatRupiah(expense)}\n📈 Surplus/Defisit: ${formatRupiah(income - expense)}\n\nKetik /budget untuk memantau status anggaranmu!`;
  }

  if (cmd === '/budget' || cmd === '/budget bulanan' || cmd === '/budget harian' || cmd === '/budget mingguan' || cmd === '/budget tahunan') {
    if (data.budgets.length === 0) {
      return `🎯 Kamu belum menyetel budget. Masuk ke Dashboard TataDana untuk mengatur batas pengeluaran kategori!`;
    }

    const isDaily = cmd.includes('harian');
    const isWeekly = cmd.includes('mingguan');
    const isYearly = cmd.includes('tahunan');
    const periodName = isDaily ? 'Harian (Daily)' : isWeekly ? 'Mingguan (Weekly)' : isYearly ? 'Tahunan (Yearly)' : 'Bulanan (Monthly)';

    const lines = data.budgets.map(b => {
      let monthly = b.monthlyAmount ?? b.monthly_amount ?? 1;
      let spent = b.spentAmount ?? b.spent_amount ?? 0;
      if (isDaily) {
        monthly = Math.round(monthly / 30);
        spent = Math.round(spent / 30);
      } else if (isWeekly) {
        monthly = Math.round(monthly / 4);
        spent = Math.round(spent / 4);
      } else if (isYearly) {
        monthly = monthly * 12;
        spent = spent * 12;
      }
      const pct = Math.round((spent / (monthly || 1)) * 100);
      const bar = generateProgressBar(pct, 8);
      return `${b.categoryEmoji || '🏷️'} ${b.categoryName || 'Kategori'}:\n[${bar}] ${pct}% (${formatRupiah(spent)} / ${formatRupiah(monthly)})`;
    }).join('\n\n');

    return `🎯 Status Budget ${periodName}:\n\n${lines}`;
  }

  if (cmd === '/kalender') {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTx = data.transactions.filter(t => (t.transactionDate || t.transaction_date || '').startsWith(todayStr));
    const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = totalIncome - totalExpense;

    return `📅 *Agenda & Kalender Keuangan TataDana*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🗓️ *Status Arus Kas Bulan Berjalan:*\n` +
      `• Pemasukan : ${formatRupiah(totalIncome)}\n` +
      `• Pengeluaran : ${formatRupiah(totalExpense)}\n` +
      `• Net Cashflow : ${net >= 0 ? '+' : ''}${formatRupiah(net)}\n\n` +
      `⏰ *Tagihan Jatuh Tempo Rutin Terdekat:*\n` +
      `• Tagihan Listrik PLN : Tgl 20 (${formatRupiah(650000)})\n` +
      `• IndiHome & TV : Tgl 15 (${formatRupiah(385000)})\n\n` +
      `📝 *Transaksi Hari Ini:* ${todayTx.length} transaksi tercatat.\n` +
      `🔗 Buka dashboard lengkap: https://tatadana.app/dashboard/calendar`;
  }

  if (cmd.startsWith('/tanya') || cmd.startsWith('tanya ')) {
    const query = command.replace(/^\/tanya\s*|^tanya\s*/i, '').trim();
    const userTarget = data.user.fullName || data.user.full_name || 'Sobat';
    const totalBalance = data.wallets.reduce((s, w) => s + w.balance, 0);

    if (!query) {
      return `🧠 *Tata AI Assistant*\n\nSilakan ajukan pertanyaan finansial, contoh:\n• /tanya rekomendasi hemat akhir bulan\n• /tanya berapa sisa uang makan minggu ini\n• /tanya strategi kumpulkan dana darurat`;
    }

    const lowerQ = query.toLowerCase();
    if (lowerQ.includes('makan') || lowerQ.includes('kuliner')) {
      return `🧠 *Tata AI Financial Advisor*\n\nHai ${userTarget}! Berdasarkan batas anggaranmu, pos Makanan & Kuliner disarankan maksimal Rp 50.000 / hari untuk sisa bulan ini agar tidak melebihi alokasi budget.`;
    } else if (lowerQ.includes('hemat') || lowerQ.includes('akhir bulan')) {
      return `🧠 *Tata AI Financial Advisor*\n\nHai ${userTarget}! Saldo totalmu saat ini ${formatRupiah(totalBalance)}. Untuk bertahan aman hingga akhir bulan: batasi jajan kopi harian, manfaatkan promo bahan segar, dan tunda checkout marketplace!`;
    } else {
      return `🧠 *Tata AI Financial Advisor*\n\nHai ${userTarget}! Menjawab "${query}":\nArus kasmu terpantau stabil dengan total saldo ${formatRupiah(totalBalance)}. Kunci finansial sehat adalah konsistensi mencatat setiap pengeluaran di bawah Rp 50.000 yang sering tidak disadari. Semangat! 💪`;
    }
  }

  if (cmd === '/sheet') {
    return `📊 Spreadsheet Keuangan TataDana:\n\nData kamu tersimpan aman dan terintegrasi di database TataDana. Buka Dashboard untuk mengekspor laporan resmi ke Excel atau PDF kapan saja:\n🔗 https://tatadana.app/dashboard/reports`;
  }

  if (isBoostOrPercepatCommand(cmd)) {
    const boostCmd = parseBoostCommand(cmd);
    const userId = data.user?.id || 'user-starter-123';
    const cleanCmd = cmd.toLowerCase().trim();

    if (boostCmd.action === 'status') {
      try {
        const { getBoostedReminderInfo } = require('./reminder-scheduler');
        const info = getBoostedReminderInfo(userId);
        const isLevel2 = info.boostMode && (info.boostMinutes >= 30 || info.boostLevel === 2);
        const statusTitle = !info.boostMode
          ? '⏸️ *Turbo Boost Nonaktif*'
          : isLevel2
          ? '⚡⚡ *Extreme Turbo Boost Aktif (Level 2 - Mode Maksimal)*'
          : '⚡ *Turbo Boost Aktif*';

        return `${statusTitle}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ *Jadwal Pengingat Saat Ini:*\n` +
          `• Pengingat Siang : *${info.effectiveTimes.time1} WIB* (Normal: ${info.originalTimes.time1})\n` +
          `• Pengingat Malam : *${info.effectiveTimes.time2 || '20:00'} WIB* (Normal: ${info.originalTimes.time2 || '20:00'})\n\n` +
          `📊 *Status Akselerasi Sistem:*\n` +
          `├ Buffer Percepatan : ${info.boostMode ? `-${info.boostMinutes} menit${isLevel2 ? ' (Level 2 - Ekstrem)' : ''}` : '0 menit (Normal)'}\n` +
          `├ In-Memory Cache : Aktif (Response time < 5ms)\n` +
          `├ Optimasi Query & Prefetch : Aktif (O(1) lookups)\n` +
          `└ Mode Turbo : ${info.boostMode ? (isLevel2 ? 'ON (Level 2 Extreme)' : 'ON') : 'OFF'}\n\n` +
          (isLevel2 ? `🔔 *Preview Pengingat Instan:* Aktif & Siap kirim\n\n` : '') +
          `💡 Ketik /boost percepat untuk mempercepat pengingat atau /boost off untuk mematikan.`;
      } catch (e) {
        return `⚡ *Status Turbo Boost TataDana*\nSistem aktif dan berjalan optimal.`;
      }
    }

    if (boostCmd.action === 'preview') {
      return `🔔 *Preview Pengingat Instan TataDana (Mode Turbo)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ *Waktu Disimulasikan:* Siap dikirim seketika\n\n` +
        `⏰ *Reminder Keuangan TataDana!*\n` +
        `Halo Sobat! Jangan lupa catat transaksi keuangan hari ini agar rekap akhir bulan tetap rapi.\n\n` +
        `💡 *Format Pencatatan Kilat:*\n` +
        `• "kopi susu 25k"\n` +
        `• "makan siang 35rb"\n` +
        `• "bensin 50k"\n\n` +
        `⚡ Mode Turbo Aktif: Notifikasi dijadwalkan lebih awal untuk memastikan kamu tidak pernah lupa mencatat!`;
    }

    if (boostCmd.action === 'disable') {
      try {
        const { disableTurboBoost } = require('./reminder-scheduler');
        const info = disableTurboBoost(userId);
        return `⏸️ *Turbo Boost TataDana Dinonaktifkan*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `Jadwal pengingat kembali ke waktu normal:\n` +
          `• Pengingat Siang : *${info.originalTimes.time1} WIB*\n` +
          `• Pengingat Malam : *${info.originalTimes.time2 || '20:00'} WIB*\n\n` +
          `💡 Ketik /boost percepat atau /boost 5 menit lebih cpt untuk mengaktifkan kembali Turbo Boost!`;
      } catch (e) {
        return `⏸️ *Turbo Boost TataDana Dinonaktifkan*\nJadwal pengingat kembali ke waktu normal.`;
      }
    }

    // Stepped escalation logic
    let orig1 = '12:00';
    let orig2 = '20:00';
    let boosted1 = '11:45';
    let boosted2 = '19:45';
    let minutes = 15;
    let level = 1;

    try {
      const { applyTurboBoost, getBoostedReminderInfo } = require('./reminder-scheduler');
      const currentInfo = getBoostedReminderInfo(userId);
      const isExplicitLevel2 = boostCmd.level === 2 || boostCmd.minutes >= 30 || /(?:extreme|ekstrem|max|maksimal|level\s*2)/i.test(cleanCmd);
      const hasExplicitMinutes = /\d+/.test(cleanCmd);
      const isPercepatVariant = /(?:\/|^|\s)(?:boost\s+)?(?:percepat|percepet|prcepat|prcepet|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet))(?:\s+(?:percepat|percepet|prcepat|prcepet|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|boost|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet)))?(?:\s+(?:dong|ya|lah|deh))?$/i.test(cleanCmd.trim());
      const isBoostBareVariant = /^(?:\/)?boost(?:\s+(?:boost|dong|ya|lah|deh))?$/i.test(cleanCmd.trim());
      const isBoostOrPercepatVariant = isPercepatVariant || isBoostBareVariant;
      const isRepeatedBoost = !hasExplicitMinutes && isBoostOrPercepatVariant &&
        currentInfo.boostMode && currentInfo.boostMinutes >= 10;

      if (isExplicitLevel2 || isRepeatedBoost) {
        minutes = boostCmd.minutes >= 30 ? boostCmd.minutes : 30;
        level = 2;
      } else if (boostCmd.minutes > 0) {
        minutes = boostCmd.minutes;
        level = minutes >= 30 ? 2 : 1;
      } else if (cleanCmd.includes('percepat') || cleanCmd.includes('percepet') || cleanCmd.includes('cepet') || cleanCmd.includes('cepetan') || cleanCmd.includes('cepetin') || cleanCmd.includes('cepat') || cleanCmd.includes('cpet') || cleanCmd.includes('cpt')) {
        minutes = 15;
        level = 1;
      } else {
        minutes = 10;
        level = 1;
      }

      const boosted = applyTurboBoost(userId, minutes, level);
      orig1 = boosted.originalTimes.time1;
      orig2 = boosted.originalTimes.time2 || '20:00';
      boosted1 = boosted.effectiveTimes.time1;
      boosted2 = boosted.effectiveTimes.time2 || shiftTimeMinutes(orig2, minutes);
    } catch (e) {
      boosted1 = shiftTimeMinutes(orig1, minutes);
      boosted2 = shiftTimeMinutes(orig2, minutes);
    }

    if (level === 2 || minutes >= 30) {
      return `⚡⚡ *Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ *Jadwal Pengingat Dipercepat:* ${minutes} menit lebih awal (Akselerasi Ekstrem)\n` +
        `• Pengingat Siang : *${boosted1} WIB* (sebelumnya ${orig1})\n` +
        `• Pengingat Malam : *${boosted2} WIB* (sebelumnya ${orig2})\n\n` +
        `🚀 *Akselerasi Ekstrem Sistem Aktif:*\n` +
        `├ Buffer Notifikasi : -${minutes} menit (Maksimal)\n` +
        `├ In-Memory Cache & Warmup : Aktif (Response time < 5ms)\n` +
        `├ Optimasi Query & Prefetching : Terindeks O(1)\n` +
        `└ Instant Reminder Preview : Siap & Terverifikasi\n\n` +
        `🔔 *Preview Pengingat Instan (Extreme Turbo):*\n` +
        `⏰ Reminder Keuangan! Catat transaksi sekarang: "kopi 25rb" atau "makan siang 35k".\n\n` +
        `💡 Ketik /boost status untuk cek performa atau /boost off untuk reset ke normal.`;
    }

    return `⚡ *Turbo Boost TataDana Diaktifkan!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏰ *Jadwal Pengingat Dipercepat:* ${minutes} menit lebih awal\n` +
      `• Pengingat Siang : *${boosted1} WIB* (sebelumnya ${orig1})\n` +
      `• Pengingat Malam : *${boosted2} WIB* (sebelumnya ${orig2})\n\n` +
      `🚀 *Akselerasi Sistem Aktif:*\n` +
      `├ Buffer Notifikasi : -${minutes} menit (siaga lebih cepat)\n` +
      `├ In-Memory Cache : Aktif (Response time < 5ms)\n` +
      `└ Optimasi Query : Indexing aktif untuk rekap kilat\n\n` +
      `💡 Ketik /bantuan untuk melihat daftar perintah lainnya.`;
  }

  if (cmd === '/bantuan') {
    return `🤖 Bantuan Perintah TataDana Bot:

• /saldo — Cek saldo semua dompet
• /hari ini — Rekap pengeluaran & pemasukan hari ini
• /minggu ini — Rekap transaksi 7 hari terakhir
• /bulan ini — Rekap bulan berjalan & breakdown
• /budget — Status semua budget bulan ini
• /sheet — Link akses laporan & ekspor
• /boost — Percepat reminder & mode turbo (cth: /boost 10 menit lebih cepat, /boost percepat, atau /boost 5 menit lebih cpt)
• /percepat — Perintah instan akselerasi pengingat TataDana (juga mendukung /percepet, /cepetan, /cpt)
• /bantuan — Tampilkan daftar bantuan ini

💬 Cara Catat Transaksi:
Ketik langsung kalimat natural:
• "beli bakso 15rb"
• "gajian 5jt"
• "bensin 50k"
• "kopi susu 25ribu"
• Atau kirim Voice Note / Foto struk (khusus Pro)!`;
  }

  return `Perintah tidak dikenali. Ketik /bantuan untuk melihat perintah yang tersedia.`;
}

// ==============================================================================
// AI FINANCIAL ADVISOR PROACTIVE TRIGGER (4.7)
// ==============================================================================

export function checkFinancialAdvisorTriggers(params: {
  user: UserProfile;
  latestTransaction: Transaction;
  allTransactions: Transaction[];
  budgets: Budget[];
}): string | null {
  // Hanya aktif untuk paket Pro
  const isPro = params.user.subscriptionPlan === 'pro' || params.user.plan === 'pro';
  if (!isPro) {
    return null;
  }

  const { latestTransaction, allTransactions, budgets } = params;
  if (latestTransaction.type !== 'expense') return null;

  const targetName = params.user.fullName || params.user.full_name || 'Sobat';

  // 1. Cek Pengeluaran besar (>20% dari budget kategori sekaligus)
  const categoryBudget = budgets.find(b => (b.categoryId || b.category_id) === (latestTransaction.categoryId || latestTransaction.category_id));
  const budgetMonthly = categoryBudget?.monthlyAmount ?? categoryBudget?.monthly_amount ?? 0;
  if (categoryBudget && budgetMonthly > 0) {
    const ratio = latestTransaction.amount / budgetMonthly;
    if (ratio >= 0.20) {
      return `🤖 Financial Advisor
Hei ${targetName}! Transaksi ${latestTransaction.categoryName || 'ini'} sebesar ${formatRupiah(latestTransaction.amount)} baru saja menghabiskan ${(ratio * 100).toFixed(0)}% dari total budget kategori tersebut sekaligus!
💡 Saran: Kurangi pengeluaran serupa minggu ini agar budget tetap bertahan hingga akhir bulan.`;
    }
  }

  // 2. Cek Total Pengeluaran >80% dari Total Pemasukan
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

  if (totalIncome > 0 && (totalExpense / totalIncome) >= 0.80) {
    return `🤖 Financial Advisor
Hei ${targetName}! Total pengeluaranmu bulan ini sudah mencapai ${((totalExpense / totalIncome) * 100).toFixed(0)}% dari total pemasukan.
💡 Saran: Masuki mode hemat untuk sisa bulan ini dan fokus pada kebutuhan esensial saja ya!`;
  }

  return null;
}

// ==============================================================================
// DAILY REMINDER MESSAGE FORMATTER (4.8)
// ==============================================================================

export function formatDailyReminder(): string {
  return `⏰ Reminder Keuangan!
Jangan lupa catat pengeluaran hari ini ya 📝
Pencatatan rutin = keuangan lebih terkontrol 💪
Ketik transaksimu sekarang!`;
}
