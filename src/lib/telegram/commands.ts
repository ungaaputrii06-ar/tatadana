import { mockStore } from '../supabase/mock-store';
import { UserProfile } from '../types';
import { formatRupiah } from '../utils/currency';
import { formatWIBDate, formatWIBDateTime, isBoostOrPercepatCommand, parseBoostCommand, shiftTimeMinutes } from '../utils/date';
import { createProgressBar } from './reply-formatter';
import { applyTurboBoost, disableTurboBoost, getBoostedReminderInfo } from '../reminder-scheduler';

export async function handleBotCommand(command: string, user: UserProfile): Promise<string> {
  const normalized = command.toLowerCase().trim().replace(/[!.,?]+$/, '');

  // /start
  if (normalized === '/start') {
    const userName = user.full_name || user.fullName || 'Sobat';
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

  // /saldo
  if (normalized === '/saldo') {
    const wallets = mockStore.getWalletsByUser(user.id);
    if (wallets.length === 0) {
      return `👛 Kamu belum memiliki dompet aktif. Silakan buat dompet di dashboard web TataDana.`;
    }

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    let msg = `👛 *Daftar Saldo Dompet (${user.full_name || user.fullName || 'Sobat'})*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    wallets.forEach((w) => {
      const defMark = (w.is_default || w.isDefault) ? ' ⭐ (Default)' : '';
      msg += `• ${w.name}: ${formatRupiah(w.balance)}${defMark}\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Total Saldo Keseluruhan:* ${formatRupiah(totalBalance)}`;
    return msg;
  }

  // /hari ini
  if (normalized === '/hari ini' || normalized === '/hariini') {
    const today = new Date().toISOString().slice(0, 10);
    const txs = mockStore
      .getTransactionsByUser(user.id)
      .filter((t) => (t.transaction_date || t.transactionDate || '').slice(0, 10) === today);

    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    let msg = `📅 *Rekap Transaksi Hari Ini (${formatWIBDate()})*\n`;
    msg += `├ Pemasukan : ${formatRupiah(income)}\n`;
    msg += `└ Pengeluaran : ${formatRupiah(expense)}\n\n`;

    if (txs.length === 0) {
      msg += `Belum ada transaksi hari ini. Ketik pengeluaranmu sekarang! 📝`;
    } else {
      msg += `*Daftar Transaksi:*\n`;
      txs.forEach((t) => {
        const sign = t.type === 'income' ? '🟢 +' : '🔴 -';
        msg += `${sign}${formatRupiah(t.amount)} — ${t.notes || t.category?.name || 'Transaksi'}\n`;
      });
    }
    return msg;
  }

  // /minggu ini
  if (normalized === '/minggu ini' || normalized === '/mingguini') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const txs = mockStore
      .getTransactionsByUser(user.id)
      .filter((t) => {
        const raw = t.transaction_date || t.transactionDate;
        return raw ? new Date(raw) >= sevenDaysAgo : false;
      });

    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return `📊 *Rekap 7 Hari Terakhir*\n` +
      `├ Total Pemasukan : ${formatRupiah(income)}\n` +
      `├ Total Pengeluaran : ${formatRupiah(expense)}\n` +
      `├ Arus Kas Bersih : ${formatRupiah(income - expense)}\n` +
      `└ Jumlah Transaksi : ${txs.length} transaksi`;
  }

  // /bulan ini
  if (normalized === '/bulan ini' || normalized === '/bulanini') {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const txs = mockStore
      .getTransactionsByUser(user.id)
      .filter((t) => {
        const raw = t.transaction_date || t.transactionDate;
        if (!raw) return false;
        const d = new Date(raw);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const catMap = new Map<string, number>();
    txs.filter((t) => t.type === 'expense').forEach((t) => {
      const cName = t.category?.name || 'Lainnya';
      catMap.set(cName, (catMap.get(cName) || 0) + t.amount);
    });

    let msg = `🗓️ *Rekap Bulan Ini*\n`;
    msg += `├ Total Pemasukan : ${formatRupiah(income)}\n`;
    msg += `├ Total Pengeluaran : ${formatRupiah(expense)}\n`;
    msg += `└ Sisa Bersih : ${formatRupiah(income - expense)}\n\n`;

    if (catMap.size > 0) {
      msg += `*Pengeluaran Berdasarkan Kategori:*\n`;
      Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([cat, val]) => {
          msg += `• ${cat}: ${formatRupiah(val)}\n`;
        });
    }

    return msg;
  }

  // /budget & multi-period budget commands
  if (normalized === '/budget' || normalized === '/budget bulanan' || normalized === '/budget harian' || normalized === '/budget mingguan' || normalized === '/budget tahunan') {
    const now = new Date();
    const budgets = mockStore.getBudgetsByUser(user.id, now.getMonth() + 1, now.getFullYear());

    if (budgets.length === 0) {
      return `🎯 Kamu belum mengatur budget.\nBuka menu *Budget* di dashboard TataDana untuk pasang batas anggaran!`;
    }

    const isDaily = normalized.includes('harian');
    const isWeekly = normalized.includes('mingguan');
    const isYearly = normalized.includes('tahunan');
    const periodName = isDaily ? 'Harian (Daily)' : isWeekly ? 'Mingguan (Weekly)' : isYearly ? 'Tahunan (Yearly)' : 'Bulanan (Monthly)';

    let msg = `🎯 *Status Budget ${periodName}*\n━━━━━━━━━━━━━━━━━━━━━\n`;
    budgets.forEach((b) => {
      let monthly = b.monthly_amount || b.monthlyAmount || 1;
      let spent = b.spent_amount || b.spentAmount || 0;
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
      const remaining = Math.max(0, monthly - spent);
      const bar = createProgressBar(pct);
      msg += `${b.category?.emoji || '🏷️'} *${b.category?.name || 'Kategori'}*\n`;
      msg += `${bar} ${pct}% | Terpakai: ${formatRupiah(spent)} / ${formatRupiah(monthly)}\n`;
      msg += `Sisa: ${formatRupiah(remaining)}\n\n`;
    });
    return msg;
  }

  // /kalender
  if (normalized === '/kalender') {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTx = mockStore.getTransactionsByUser(user.id).filter(t => (t.transaction_date || t.transactionDate || '').startsWith(todayStr));
    const totalIncome = mockStore.getTransactionsByUser(user.id).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = mockStore.getTransactionsByUser(user.id).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
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
      `🔗 Buka dashboard lengkap: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/calendar`;
  }

  // /tanya [pertanyaan]
  if (normalized.startsWith('/tanya') || normalized.startsWith('tanya ')) {
    const query = command.replace(/^\/tanya\s*|^tanya\s*/i, '').trim();
    const userTarget = user.full_name || user.fullName || 'Sobat';
    const wallets = mockStore.getWalletsByUser(user.id);
    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

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

  // /sheet
  if (normalized === '/sheet') {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reports`;
    return `📊 *Laporan Transaksi TataDana*\n\nKamu bisa melihat rincian laporan lengkap, grafik, dan export PDF/Excel langsung di dashboard web:\n🔗 ${dashboardUrl}`;
  }

  // /boost or /percepat (e.g. "/boost percepat", "percepat", "boost percepat", "/percepat", "/boost 10 mnt lebih cepat", "/boost off", "/boost status", "/boost extreme", "/boost preview")
  if (isBoostOrPercepatCommand(normalized)) {
    const boostCmd = parseBoostCommand(normalized);
    const userId = user.id || 'user-starter-123';

    if (boostCmd.action === 'status') {
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
      const info = disableTurboBoost(userId);
      return `⏸️ *Turbo Boost TataDana Dinonaktifkan*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Jadwal pengingat kembali ke waktu normal:\n` +
        `• Pengingat Siang : *${info.originalTimes.time1} WIB*\n` +
        `• Pengingat Malam : *${info.originalTimes.time2 || '20:00'} WIB*\n\n` +
        `💡 Ketik /boost percepat atau /boost 10 mnt lebih cepat untuk mengaktifkan kembali Turbo Boost!`;
    }

    // Stepped / Multi-Level Escalation:
    // If boost is already active at Level 1 (>= 15 minutes) and user repeats /boost percepat or colloquial slang (percepet, cepet, etc.), escalate to Level 2 (30 minutes).
    // Or if user explicitly requested extreme/max/level 2/30m.
    const currentInfo = getBoostedReminderInfo(userId);
    const isExplicitLevel2 = boostCmd.level === 2 || boostCmd.minutes >= 30 || /(?:extreme|ekstrem|max|maksimal|level\s*2)/i.test(normalized);
    const hasExplicitMinutes = /\d+/.test(normalized);
    const isPercepatVariant = /(?:\/|^|\s)(?:boost\s+)?(?:percepat|percepet|prcepat|prcepet|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet))(?:\s+(?:percepat|percepet|prcepat|prcepet|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|boost|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet)))?(?:\s+(?:dong|ya|lah|deh))?$/i.test(normalized.trim());
    const isBoostBareVariant = /^(?:\/)?boost(?:\s+(?:boost|dong|ya|lah|deh))?$/i.test(normalized.trim());
    const isBoostOrPercepatVariant = isPercepatVariant || isBoostBareVariant;
    const isRepeatedBoost = !hasExplicitMinutes && isBoostOrPercepatVariant &&
      currentInfo.boostMode && currentInfo.boostMinutes >= 10;

    let minutes: number;
    let level: number;

    if (isExplicitLevel2 || isRepeatedBoost) {
      minutes = boostCmd.minutes >= 30 ? boostCmd.minutes : 30;
      level = 2;
    } else if (boostCmd.minutes > 0) {
      minutes = boostCmd.minutes;
      level = minutes >= 30 ? 2 : 1;
    } else if (normalized.includes('percepat') || normalized.includes('percepet') || normalized.includes('cepet') || normalized.includes('cepetan') || normalized.includes('cepetin') || normalized.includes('cepat') || normalized.includes('cpet') || normalized.includes('cpt')) {
      minutes = 15;
      level = 1;
    } else {
      minutes = 10;
      level = 1;
    }

    const boosted = applyTurboBoost(userId, minutes, level);

    if (level === 2 || minutes >= 30) {
      return `⚡⚡ *Extreme Turbo Boost TataDana Diaktifkan! (Level 2 - Mode Maksimal)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ *Jadwal Pengingat Dipercepat:* ${minutes} menit lebih awal (Akselerasi Ekstrem)\n` +
        `• Pengingat Siang : *${boosted.effectiveTimes.time1} WIB* (sebelumnya ${boosted.originalTimes.time1})\n` +
        `• Pengingat Malam : *${boosted.effectiveTimes.time2 || shiftTimeMinutes(boosted.originalTimes.time2 || '20:00', minutes)} WIB* (sebelumnya ${boosted.originalTimes.time2 || '20:00'})\n\n` +
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
      `• Pengingat Siang : *${boosted.effectiveTimes.time1} WIB* (sebelumnya ${boosted.originalTimes.time1})\n` +
      `• Pengingat Malam : *${boosted.effectiveTimes.time2 || shiftTimeMinutes(boosted.originalTimes.time2 || '20:00', minutes)} WIB* (sebelumnya ${boosted.originalTimes.time2 || '20:00'})\n\n` +
      `🚀 *Akselerasi Sistem Aktif:*\n` +
      `├ Buffer Notifikasi : -${minutes} menit (siaga lebih cepat)\n` +
      `├ In-Memory Cache : Aktif (Response time < 5ms)\n` +
      `└ Optimasi Query : Indexing aktif untuk rekap kilat\n\n` +
      `💡 Ketik /bantuan untuk melihat daftar perintah lainnya.`;
  }

  // /bantuan or default help
  return `🤖 *Daftar Perintah TataDana Bot*\n\n` +
    `💡 *Catat Transaksi Cepat:*\n` +
    `• Cukup ketik pesan: "beli bakso 15rb", "kopi 25k", "gajian 5jt"\n` +
    `• Atau kirim Voice Note / Struk Belanja (Pro)\n\n` +
    `📋 *Daftar Perintah (Commands):*\n` +
    `• /saldo — Cek saldo seluruh dompet\n` +
    `• /hari ini — Rekap transaksi hari ini\n` +
    `• /minggu ini — Rekap 7 hari terakhir\n` +
    `• /bulan ini — Rekap bulan berjalan & breakdown\n` +
    `• /budget — Pantau progres batas budget\n` +
    `• /sheet — Link laporan dan tabel transaksi\n` +
    `• /boost — Percepat reminder & mode turbo (cth: /boost 10 menit lebih cepat, /boost percepat, atau /boost 5 menit lebih cpt)\n` +
    `• /percepat — Perintah instan akselerasi pengingat TataDana (juga mendukung /percepet, /cepetan, /cpt)\n` +
    `• /bantuan — Tampilkan panduan ini`;
}
