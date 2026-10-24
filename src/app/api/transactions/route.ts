import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { checkPlanLimit } from '@/lib/utils/limits';
import { fastCache } from '@/lib/cache';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-starter-123';
  const categoryId = searchParams.get('categoryId') || '';
  const walletId = searchParams.get('walletId') || '';
  const type = searchParams.get('type') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const search = searchParams.get('search') || '';

  const cacheKey = `txs:${userId}:${categoryId}:${walletId}:${type}:${startDate}:${endDate}:${search}`;
  const cachedList = fastCache.get<any[]>(cacheKey);

  if (cachedList !== undefined) {
    return NextResponse.json(
      { transactions: cachedList },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active-turbo-accelerated',
          'X-Acceleration-Level': 'extreme-level-2',
          'X-Cache': 'HIT',
          'X-Response-Time-Ms': String(Date.now() - startTime),
        },
      }
    );
  }

  let list = mockStore.getTransactionsByUser(userId);

  if (categoryId) list = list.filter((t) => t.category_id === categoryId);
  if (walletId) list = list.filter((t) => t.wallet_id === walletId);
  if (type) list = list.filter((t) => t.type === type);
  if (startDate) {
    list = list.filter((t) => {
      const raw = t.transaction_date || t.transactionDate;
      return raw ? new Date(raw) >= new Date(startDate) : true;
    });
  }
  if (endDate) {
    list = list.filter((t) => {
      const raw = t.transaction_date || t.transactionDate;
      return raw ? new Date(raw) <= new Date(endDate) : true;
    });
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter((t) => (t.notes || '').toLowerCase().includes(s));
  }

  fastCache.set(cacheKey, list, 30_000);

  return NextResponse.json(
    { transactions: list },
    {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
        'Vary': 'Accept-Encoding',
        'X-Turbo-Boost': 'active-turbo-accelerated',
        'X-Acceleration-Level': 'extreme-level-2',
        'X-Cache': 'MISS',
        'X-Response-Time-Ms': String(Date.now() - startTime),
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, walletId, toWalletId, categoryId, type, amount, notes, transactionDate } = body;

    const user = mockStore.profiles.get(userId || 'user-starter-123');
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Limit check
    const currentMonthTxs = mockStore
      .getTransactionsByUser(user.id)
      .filter((t) => {
        const raw = t.transaction_date || t.transactionDate;
        return raw ? new Date(raw).getMonth() === new Date().getMonth() : false;
      });
    const limitCheck = checkPlanLimit(user, 'maxMonthlyTransactions', currentMonthTxs.length);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const tx = mockStore.addTransaction({
      user_id: user.id,
      wallet_id: walletId,
      to_wallet_id: toWalletId,
      category_id: categoryId,
      type: type || 'expense',
      amount: Number(amount),
      notes: notes || '',
      transaction_date: transactionDate || new Date().toISOString(),
      source: 'web_manual',
    });

    // Invalidate transaction, budget, and wallet caches on write
    fastCache.invalidatePrefix('txs:');
    fastCache.invalidatePrefix('budgets:');
    fastCache.invalidatePrefix('wallets:');

    return NextResponse.json({ success: true, transaction: tx });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Gagal mencatat transaksi' }, { status: 500 });
  }
}
