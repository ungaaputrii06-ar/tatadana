import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { checkPlanLimit } from '@/lib/utils/limits';
import { fastCache } from '@/lib/cache';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-starter-123';
  const periodType = searchParams.get('periodType') || 'monthly';
  const now = new Date();
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(now.getFullYear()));

  const cacheKey = `budgets:${userId}:${periodType}:${month}:${year}`;
  const cachedBudgets = fastCache.get<any[]>(cacheKey);

  if (cachedBudgets !== undefined) {
    return NextResponse.json(
      { budgets: cachedBudgets },
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

  let budgets = mockStore.getBudgetsByUser(userId, month, year);

  const validPeriod = (periodType as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly';

  // If specific periodType requested, filter or tag period_type
  budgets = budgets.map((b) => ({
    ...b,
    period_type: (b.period_type || validPeriod) as any,
    periodType: (b.periodType || validPeriod) as any,
  }));

  // Recalculate spent amounts from actual transactions based on periodType
  const allUserTxs = mockStore.getTransactionsByUser(userId);
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const transactions = allUserTxs.filter((t) => {
    if (t.type !== 'expense') return false;
    const rawDate = t.transaction_date || t.transactionDate || new Date().toISOString();
    const d = new Date(rawDate);

    if (periodType === 'daily') {
      return rawDate.slice(0, 10) === todayStr;
    } else if (periodType === 'weekly') {
      return d >= sevenDaysAgo;
    } else if (periodType === 'yearly') {
      return d.getFullYear() === year;
    }
    // Default 'monthly'
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const updatedBudgets = budgets.map((b) => {
    const spent = transactions
      .filter((t) => (t.category_id || t.categoryId) === (b.category_id || b.categoryId))
      .reduce((sum, t) => sum + t.amount, 0);

    // If daily or weekly or yearly, scale the effective limit accordingly if not set
    let effectiveLimit = b.monthly_amount || b.monthlyAmount || 1000000;
    if (periodType === 'daily') {
      effectiveLimit = Math.round(effectiveLimit / 30);
    } else if (periodType === 'weekly') {
      effectiveLimit = Math.round(effectiveLimit / 4);
    } else if (periodType === 'yearly') {
      effectiveLimit = effectiveLimit * 12;
    }

    return {
      ...b,
      monthly_amount: effectiveLimit,
      monthlyAmount: effectiveLimit,
      spent_amount: spent,
      spentAmount: spent,
      period_type: validPeriod,
      periodType: validPeriod,
    };
  });

  fastCache.set(cacheKey, updatedBudgets, 30_000);

  return NextResponse.json(
    { budgets: updatedBudgets },
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
    const { userId, categoryId, monthlyAmount, amount, periodType = 'monthly', month, year } = await request.json();

    const user = mockStore.profiles.get(userId || 'user-starter-123');
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const existingBudgets = mockStore.getBudgetsByUser(user.id, m, y);
    const existing = existingBudgets.find((b) => b.category_id === categoryId);

    if (!existing) {
      const limitCheck = checkPlanLimit(user, 'maxCategoryBudgets', existingBudgets.length);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.message }, { status: 403 });
      }
    }

    const targetAmount = Number(amount || monthlyAmount || 0);
    const id = existing ? existing.id : 'budget-' + Math.random().toString(36).substring(2, 9);
    const budgetRecord = {
      id,
      user_id: user.id,
      category_id: categoryId,
      monthly_amount: targetAmount,
      monthlyAmount: targetAmount,
      period_type: periodType as any,
      periodType: periodType as any,
      month: m,
      year: y,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStore.budgets.set(id, budgetRecord as any);
    fastCache.invalidatePrefix('budgets:');

    return NextResponse.json({
      success: true,
      budget: budgetRecord,
      message: `Budget kategori ${periodType} berhasil disimpan.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
