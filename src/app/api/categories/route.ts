import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { fastCache } from '@/lib/cache';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-starter-123';

  const cacheKey = `categories:${userId}`;
  const cached = fastCache.get<any[]>(cacheKey);

  if (cached !== undefined) {
    return NextResponse.json(
      { categories: cached },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active-turbo-accelerated',
          'X-Acceleration-Level': 'extreme-level-2',
          'X-Cache': 'HIT',
          'X-Response-Time-Ms': String(Date.now() - startTime),
        },
      }
    );
  }

  const categories = mockStore.getCategoriesByUser(userId);
  fastCache.set(cacheKey, categories, 60_000);

  return NextResponse.json(
    { categories },
    {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
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
    const { userId, name, type, emoji, color } = await request.json();

    const id = 'cat-' + Math.random().toString(36).substring(2, 9);
    const newCat = {
      id,
      user_id: userId,
      name,
      type: type || 'expense',
      emoji: emoji || '🏷️',
      color: color || '#f97316',
      is_system: false,
      created_at: new Date().toISOString(),
    };

    mockStore.categories.set(id, newCat);
    fastCache.invalidatePrefix('categories:');

    return NextResponse.json({ success: true, category: newCat });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat kategori' }, { status: 500 });
  }
}
