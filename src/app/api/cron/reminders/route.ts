import { NextResponse } from 'next/server';
import {
  checkDueReminders,
  getBoostedReminderInfo,
  applyTurboBoost,
  escalateTurboBoost,
  disableTurboBoost
} from '@/lib/reminder-scheduler';
import { mockStore } from '@/lib/supabase/mock-store';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const testTime = searchParams.get('time'); // e.g. "11:50" or "11:30" to test boost triggers
  const userId = searchParams.get('userId');

  if (userId) {
    const info = getBoostedReminderInfo(userId);
    return NextResponse.json(
      {
        info,
        latencyMs: Date.now() - startTime,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active',
          'X-Acceleration-Level': 'extreme-level-2',
        },
      }
    );
  }

  // Check which reminders are due right now (or at override testTime)
  const result = checkDueReminders(testTime || undefined);

  return NextResponse.json(
    {
      ok: true,
      dueCount: result.dueCount,
      triggered: result.triggered,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Vary': 'Accept-Encoding',
        'X-Turbo-Boost': 'active',
        'X-Acceleration-Level': 'extreme-level-2',
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const { userId, boostMinutes, boostLevel, action } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const boostHeaders = {
      'Cache-Control': 'no-store, max-age=0',
      'Vary': 'Accept-Encoding',
      'X-Turbo-Boost': 'active-turbo-accelerated',
      'X-Acceleration-Level': 'extreme-level-2',
    };

    if (action === 'disable') {
      const disabled = disableTurboBoost(userId);
      return NextResponse.json(
        {
          success: true,
          boosted: disabled,
          message: 'Turbo Boost dinonaktifkan: pengingat kembali ke jadwal standar.',
        },
        { headers: boostHeaders }
      );
    }

    if (action === 'escalate') {
      const escalated = escalateTurboBoost(userId);
      return NextResponse.json(
        {
          success: true,
          boosted: escalated,
          message: `Extreme Turbo Boost (Level ${escalated.boostLevel}) aktif: pengingat dimajukan ${escalated.boostMinutes} menit lebih awal.`,
        },
        { headers: boostHeaders }
      );
    }

    const targetMinutes = boostMinutes || (boostLevel === 2 ? 30 : 10);
    const targetLevel = boostLevel || (targetMinutes >= 30 ? 2 : 1);
    const boosted = applyTurboBoost(userId, targetMinutes, targetLevel);

    return NextResponse.json(
      {
        success: true,
        boosted,
        message: boosted.boostLevel === 2
          ? `Extreme Turbo Boost aktif: pengingat dimajukan ${boosted.boostMinutes} menit lebih awal (Level 2).`
          : `Turbo Boost aktif: pengingat dimajukan ${boosted.boostMinutes} menit lebih awal.`,
      },
      { headers: boostHeaders }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to apply boost' }, { status: 500 });
  }
}
