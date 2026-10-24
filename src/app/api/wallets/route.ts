import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { checkPlanLimit } from '@/lib/utils/limits';
import { fastCache } from '@/lib/cache';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-starter-123';

  const cacheKey = `wallets:${userId}`;
  const cachedWallets = fastCache.get<any[]>(cacheKey);

  if (cachedWallets !== undefined) {
    return NextResponse.json(
      { wallets: cachedWallets },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active-turbo-accelerated',
          'X-Acceleration-Level': 'extreme-level-2',
          'X-Cache': 'HIT',
          'X-Response-Time-Ms': String(Date.now() - startTime),
        },
      }
    );
  }

  const wallets = mockStore.getWalletsByUser(userId);
  fastCache.set(cacheKey, wallets, 60_000);

  return NextResponse.json(
    { wallets },
    {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
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
    const { userId, name, initialBalance, icon, color, isDefault } = await request.json();

    const user = mockStore.profiles.get(userId || 'user-starter-123');
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const currentWallets = mockStore.getWalletsByUser(user.id);
    const limitCheck = checkPlanLimit(user, 'maxWallets', currentWallets.length);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const id = 'wallet-' + Math.random().toString(36).substring(2, 9);
    const newWallet = {
      id,
      user_id: user.id,
      name: name || 'Dompet Baru',
      balance: Number(initialBalance || 0),
      is_default: Boolean(isDefault) || currentWallets.length === 0,
      icon: icon || 'wallet',
      color: color || '#f97316',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (newWallet.is_default) {
      currentWallets.forEach((w) => {
        w.is_default = false;
      });
    }

    mockStore.wallets.set(id, newWallet);
    fastCache.invalidatePrefix('wallets:');

    return NextResponse.json({ success: true, wallet: newWallet });
  } catch (error) {
    console.error('Create wallet error:', error);
    return NextResponse.json({ error: 'Gagal membuat dompet' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { walletId, isDefault } = await request.json();
    const wallet = mockStore.wallets.get(walletId);
    if (!wallet) return NextResponse.json({ error: 'Dompet tidak ditemukan' }, { status: 404 });

    const ownerId = wallet.user_id || wallet.userId;
    if (isDefault && ownerId) {
      const userWallets = mockStore.getWalletsByUser(ownerId);
      userWallets.forEach((w) => {
        w.is_default = w.id === walletId;
        w.isDefault = w.id === walletId;
      });
      wallet.is_default = true;
      wallet.isDefault = true;
    }

    fastCache.invalidatePrefix('wallets:');
    return NextResponse.json({ success: true, wallet });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update dompet' }, { status: 500 });
  }
}
