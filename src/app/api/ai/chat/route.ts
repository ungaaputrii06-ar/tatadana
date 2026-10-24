import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/storage-mock';
import { mockStore } from '@/lib/supabase/mock-store';
import { formatRupiah } from '@/lib/utils/currency';
import { isBoostOrPercepatCommand, handleTelegramCommand } from '@/lib/telegram-parser';

export async function POST(req: NextRequest) {
  try {
    const { prompt, userId = 'usr_budi_01' } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ ok: false, error: 'Prompt pertanyaan wajib diisi.' }, { status: 400 });
    }

    // 1. Gather real user financial context
    const user = dataStore.user;

    // Check if user is invoking Turbo Boost command (e.g. /boost 10 menit lebih cepat, 10 menit lebih cepat, /percepat)
    if (isBoostOrPercepatCommand(prompt)) {
      const reply = handleTelegramCommand(prompt, {
        wallets: dataStore.wallets,
        transactions: dataStore.transactions,
        budgets: dataStore.budgets,
        categories: dataStore.categories,
        user,
      });

      return NextResponse.json({
        ok: true,
        answer: reply,
        provider: 'tata-ai-turbo-engine',
        boostMode: true,
      });
    }
    const wallets = dataStore.wallets.filter((w) => (w.userId || w.user_id) === user.id);
    const budgets = dataStore.budgets.filter((b) => (b.userId || b.user_id) === user.id);
    const txs = dataStore.transactions.filter((t) => (t.userId || t.user_id) === user.id);

    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
    const expenseTxs = txs.filter((t) => t.type === 'expense');
    const incomeTxs = txs.filter((t) => t.type === 'income');
    const totalSpent = expenseTxs.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const catExpenses: Record<string, number> = {};
    expenseTxs.forEach((t) => {
      const name = t.categoryName || 'Lainnya';
      catExpenses[name] = (catExpenses[name] || 0) + t.amount;
    });

    const topCategories = Object.entries(catExpenses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // 2. Check if external AI provider key is set
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey !== 'mock_key') {
      try {
        const systemPrompt = `Kamu adalah Tata AI, perencana keuangan pribadi cerdas dan bersahabat di aplikasi TataDana Indonesia.
Konteks Keuangan User (${user.fullName || 'Sobat'}):
- Total Saldo: ${formatRupiah(totalBalance)} di ${wallets.length} dompet.
- Pemasukan Bulan Ini: ${formatRupiah(totalIncome)}.
- Pengeluaran Bulan Ini: ${formatRupiah(totalSpent)}.
- Top 3 Pengeluaran: ${topCategories.map(([c, a]) => `${c} (${formatRupiah(a)})`).join(', ')}.
Beri saran ramah, spesifik dengan angka riil di atas, actionable, dan gunakan Bahasa Indonesia yang memotivasi.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPertanyaan User: "${prompt}"` }] }]
          })
        });

        if (res.ok) {
          const aiJson = await res.json();
          const replyText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return NextResponse.json({ ok: true, answer: replyText, provider: 'gemini-1.5-flash' });
          }
        }
      } catch (err) {
        console.warn('Gemini live call fallback to local engine:', err);
      }
    }

    // 3. Smart Dual-Mode Local Financial Engine (Always 100% reliable)
    const lower = prompt.toLowerCase();
    let answer = '';

    if (lower.includes('uang makan') || lower.includes('makan') || lower.includes('kuliner')) {
      const foodBudget = budgets.find((b) => (b.categoryName || '').toLowerCase().includes('makan'));
      const foodSpent = catExpenses['Makanan & Minuman'] || 0;
      const budgetLimit = foodBudget ? (foodBudget.monthlyAmount || foodBudget.monthly_amount || 2000000) : 2000000;
      const remaining = Math.max(0, budgetLimit - foodSpent);
      const daysLeft = 30 - new Date().getDate();
      const dailyCap = daysLeft > 0 ? Math.floor(remaining / daysLeft) : remaining;

      answer = `🍜 **Analisa Budget Makanan & Kuliner:**\n\n` +
        `• Total Alokasi: **${formatRupiah(budgetLimit)}**\n` +
        `• Terpakai: **${formatRupiah(foodSpent)}**\n` +
        `• Sisa Uang Makan: **${formatRupiah(remaining)}**\n\n` +
        `💡 **Saran Tata AI:** Dengan sisa ${daysLeft} hari di bulan ini, batas aman pengeluaran makan harianmu adalah maksimal **${formatRupiah(dailyCap)} / hari**. Masak sendiri di akhir pekan bisa menghemat hingga 35%!`;
    } else if (lower.includes('strategi hemat') || lower.includes('akhir bulan') || lower.includes('gaji')) {
      const remainingCash = totalBalance;
      const daysLeft = 30 - new Date().getDate();
      const safeDailySpend = daysLeft > 0 ? Math.floor(remainingCash / daysLeft) : 50000;

      answer = `🛡️ **Strategi Hemat Akhir Bulan Tata AI:**\n\n` +
        `1. **Terapkan Aturan 24 Jam**: Tunda pembelian non-kebutuhan pokok minimal 1 hari sebelum checkout.\n` +
        `2. **Plafon Harian Aman**: Total saldomu saat ini ${formatRupiah(totalBalance)}. Alokasikan maksimal **${formatRupiah(safeDailySpend)} / hari** hingga tanggal gajian berikutnya.\n` +
        `3. **Review Subscription**: Cek apakah ada langganan aplikasi streaming yang jarang ditonton.\n` +
        `4. **Manfaatkan Telegram Bot**: Setiap kali jajan kopi atau makan siang, langsung ketik di Telegram agar tidak kecolongan pengeluaran mikro!`;
    } else if (lower.includes('terbesar') || lower.includes('analisa') || lower.includes('boros')) {
      answer = `📊 **Analisa Pengeluaran Terbesar Kamu:**\n\n` +
        `Bulan ini total pengeluaranmu mencapai **${formatRupiah(totalSpent)}**.\n\n` +
        `Tiga pos pengeluaran teratasmu adalah:\n` +
        topCategories.map(([cat, amt], i) => `${i + 1}. **${cat}**: ${formatRupiah(amt)} (${Math.round((amt / (totalSpent || 1)) * 100)}%)`).join('\n') +
        `\n\n💡 **Insight Cerdas:** Kategori terbesarmu memakan porsi dominan. Cobalah kurangi 10-15% dari pos ini untuk dialihkan otomatis ke Tabungan Darurat BCA!`;
    } else if (lower.includes('saldo') || lower.includes('dompet') || lower.includes('uang')) {
      answer = `👛 **Ringkasan Saldo Dompet TataDana:**\n\n` +
        `Total saldo kamu di seluruh instansi adalah **${formatRupiah(totalBalance)}**.\n\n` +
        wallets.map((w) => `• ${w.name}: **${formatRupiah(w.balance)}** ${w.isDefault || w.is_default ? '⭐ (Default Telegram)' : ''}`).join('\n') +
        `\n\nArus kas bulan ini: Pemasukan **${formatRupiah(totalIncome)}** vs Pengeluaran **${formatRupiah(totalSpent)}** (Surplus: **${formatRupiah(totalIncome - totalSpent)}**).`;
    } else {
      answer = `🤖 **Hai ${user.fullName || 'Sobat'}! Ini Analisa Finansial Tata AI:**\n\n` +
        `Melihat performa keuanganmu saat ini:\n` +
        `• **Kesehatan Arus Kas:** Total saldo ${formatRupiah(totalBalance)} dengan rasio pengeluaran ${Math.round((totalSpent / (totalIncome || 1)) * 100)}% dari pendapatan.\n` +
        `• **Pengeluaran Utama:** ${topCategories[0] ? `${topCategories[0][0]} (${formatRupiah(topCategories[0][1])})` : 'Terkontrol'}.\n\n` +
        `💡 **Rekomendasi Utama:**\n` +
        `Pertahankan kebiasaan mencatat transaksi langsung via bot Telegram TataDana. Jika ingin mencapai dana darurat lebih cepat, sisihkan minimal 10-20% di awal begitu gaji masuk ke dompet utama.`;
    }

    return NextResponse.json({
      ok: true,
      answer,
      provider: 'tata-ai-heuristic-engine',
      metrics: {
        totalBalance,
        totalIncome,
        totalSpent,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
