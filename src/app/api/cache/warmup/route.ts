import { NextResponse } from 'next/server';
import { fastCache } from '@/lib/cache';
import { mockStore } from '@/lib/supabase/mock-store';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-starter-123';

  const warmupResult = await fastCache.warmupKeyRoutes(userId);
  const stats = fastCache.getStats();
  const indexStats = mockStore.getIndexStats();

  return NextResponse.json(
    {
      success: true,
      warmedCount: warmupResult.warmedCount,
      keys: warmupResult.keys,
      cacheStats: stats,
      indexStats,
      latencyMs: Date.now() - startTime,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Vary': 'Accept-Encoding',
        'X-Turbo-Boost': 'active-turbo-accelerated',
        'X-Acceleration-Level': 'extreme-level-2',
        'X-Cache-Warmup': 'ready',
      },
    }
  );
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || 'user-starter-123';

    const warmupResult = await fastCache.warmupKeyRoutes(userId);
    const stats = fastCache.getStats();
    const indexStats = mockStore.getIndexStats();

    return NextResponse.json(
      {
        success: true,
        warmedCount: warmupResult.warmedCount,
        keys: warmupResult.keys,
        cacheStats: stats,
        indexStats,
        latencyMs: Date.now() - startTime,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active-turbo-accelerated',
          'X-Acceleration-Level': 'extreme-level-2',
          'X-Cache-Warmup': 'ready',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Warmup failed' }, { status: 500 });
  }
}
