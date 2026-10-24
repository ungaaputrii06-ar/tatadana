import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '../../../../lib/telegram/long-poller';

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: 'active',
    endpoint: '/api/telegram/webhook',
    idempotency_enabled: true,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const payload = await req.json();

    const result = await processTelegramUpdate(payload);
    const latencyMs = Date.now() - startTime;

    if (result.status === 'skipped') {
      return NextResponse.json(
        {
          ok: true,
          status: 'skipped',
          reply: result.reply || 'Update ID already processed (Idempotency protection active)',
          message: 'Update ID already processed (Idempotency protection active)',
        },
        {
          headers: {
            'Vary': 'Accept-Encoding',
            'X-Turbo-Boost': 'active-turbo-accelerated',
            'X-Acceleration-Level': 'extreme-level-2',
            'X-Response-Time-Ms': String(latencyMs),
          },
        }
      );
    }

    if (result.status === 'no_message') {
      return NextResponse.json(
        {
          ok: false,
          status: 'no_message',
          reply: '',
        },
        {
          headers: {
            'Vary': 'Accept-Encoding',
            'X-Response-Time-Ms': String(latencyMs),
          },
        }
      );
    }

    return NextResponse.json(
      {
        ok: result.ok,
        status: 'processed',
        reply: result.reply,
        type: result.type,
        transaction: result.transaction,
      },
      {
        headers: {
          'Vary': 'Accept-Encoding',
          'X-Turbo-Boost': 'active-turbo-accelerated',
          'X-Acceleration-Level': 'extreme-level-2',
          'X-Response-Time-Ms': String(latencyMs),
        },
      }
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Webhook Error:', error);
    return NextResponse.json(
      { ok: false, status: 'error', error: error.message || 'Server error' },
      {
        status: 500,
        headers: {
          'X-Response-Time-Ms': String(latencyMs),
        },
      }
    );
  }
}
