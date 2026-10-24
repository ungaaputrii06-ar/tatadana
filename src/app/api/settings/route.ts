import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { fastCache } from '@/lib/cache';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-starter-123';

  const cacheKey = `settings:${userId}`;
  const cached = fastCache.get<{ user: any; reminder: any }>(cacheKey);
  if (cached) {
    return NextResponse.json(
      cached,
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active-turbo-accelerated',
          'X-Acceleration-Level': 'extreme-level-2',
          'X-Cache': 'HIT',
          'X-Response-Time-Ms': String(Date.now() - startTime),
        },
      }
    );
  }

  const user = mockStore.profiles.get(userId);
  const reminder = mockStore.reminders.get(userId) || {
    id: 'rem-def',
    user_id: userId,
    is_active: true,
    frequency: '2x',
    time_1: '12:00',
    time_2: '20:00',
    boost_mode: false,
    boost_minutes: 10,
    boost_level: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const mins = reminder.boost_minutes ? Number(reminder.boost_minutes) : 10;
  const level = reminder.boost_level !== undefined ? Number(reminder.boost_level) : (mins >= 30 ? 2 : 1);
  reminder.boost_minutes = mins;
  reminder.boost_level = level;

  const result = { user, reminder };
  fastCache.set(cacheKey, result, 60_000);

  return NextResponse.json(
    result,
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding',
        'X-Turbo-Boost': 'active-turbo-accelerated',
        'X-Acceleration-Level': 'extreme-level-2',
        'X-Cache': 'MISS',
        'X-Response-Time-Ms': String(Date.now() - startTime),
      },
    }
  );
}

export async function PUT(request: Request) {
  try {
    const { userId, fullName, defaultCurrency, reminder } = await request.json();

    const user = mockStore.profiles.get(userId || 'user-starter-123');
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    if (fullName) user.full_name = fullName;
    if (defaultCurrency) user.default_currency = defaultCurrency;
    user.updated_at = new Date().toISOString();

    if (reminder) {
      const bMins = reminder.boost_minutes ? Number(reminder.boost_minutes) : 10;
      const bLvl = reminder.boost_level !== undefined ? Number(reminder.boost_level) : (bMins >= 30 ? 2 : 1);
      mockStore.reminders.set(user.id, {
        id: reminder.id || 'rem-' + user.id,
        user_id: user.id,
        is_active: Boolean(reminder.is_active),
        frequency: reminder.frequency || '1x',
        time_1: reminder.time_1 || '12:00',
        time_2: reminder.time_2 || '20:00',
        boost_mode: Boolean(reminder.boost_mode),
        boost_minutes: bMins,
        boost_level: bLvl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    fastCache.del(`settings:${user.id}`);
    fastCache.del(`reminders:${user.id}`);
    fastCache.del(`boost:info:${user.id}`);

    return NextResponse.json(
      { success: true, user, reminder: mockStore.reminders.get(user.id) },
      {
        headers: {
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active-turbo-accelerated',
          'X-Acceleration-Level': 'extreme-level-2',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update settings' }, { status: 500 });
  }
}
