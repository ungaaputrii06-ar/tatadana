import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { generateFinancialPDF } from '@/lib/reports/pdf-generator';
import { checkPlanLimit } from '@/lib/utils/limits';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, startDate, endDate, categoryId, walletId, type } = body;

    const targetUserId = userId || 'usr_bunga_01';
    let user = mockStore.profiles.get(targetUserId);
    if (!user) {
      user = mockStore.profiles.get('usr_bunga_01');
    }
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Check Plan Permission: Starter vs Pro
    const check = checkPlanLimit(user, 'allowExport');
    if (!check.allowed) {
      return NextResponse.json({ error: check.message, upgradeRequired: true }, { status: 403 });
    }

    // Filter transactions
    let transactions = mockStore.getTransactionsByUser(user.id);
    if (transactions.length === 0) {
      transactions = Array.from(mockStore.transactions.values());
    }

    if (startDate) {
      transactions = transactions.filter((t) => {
        const raw = t.transaction_date || t.transactionDate;
        return raw ? new Date(raw) >= new Date(startDate) : true;
      });
    }
    if (endDate) {
      transactions = transactions.filter((t) => {
        const raw = t.transaction_date || t.transactionDate;
        return raw ? new Date(raw) <= new Date(endDate) : true;
      });
    }
    if (categoryId) {
      transactions = transactions.filter((t) => t.category_id === categoryId);
    }
    if (walletId) {
      transactions = transactions.filter((t) => t.wallet_id === walletId);
    }
    if (type) {
      transactions = transactions.filter((t) => t.type === type);
    }

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const netCashflow = totalIncome - totalExpense;

    const pdfBytes = generateFinancialPDF({
      user,
      transactions,
      startDate,
      endDate,
      totalIncome,
      totalExpense,
      netCashflow,
    });

    const fileName = `TataDana_Laporan_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Save in export history
    const historyId = 'exp-' + Math.random().toString(36).substring(2, 9);
    mockStore.exportHistory.set(historyId, {
      id: historyId,
      user_id: user.id,
      file_name: fileName,
      file_type: 'pdf',
      download_url: `/api/reports/download/${historyId}`,
      period_start: startDate,
      period_end: endDate,
      created_at: new Date().toISOString(),
    });

    return new Response(pdfBytes as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export PDF error:', error);
    return NextResponse.json({ error: 'Gagal membuat laporan PDF' }, { status: 500 });
  }
}
