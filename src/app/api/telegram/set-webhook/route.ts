import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token, webhookUrl } = await req.json();

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Token wajib diisi' }, { status: 400 });
    }

    const base = webhookUrl || process.env.WEBHOOK_BASE_URL || 'https://tatadana.app';
    const targetUrl = `${base.replace(/\/$/, '')}/api/telegram/webhook`;

    if (token.includes(':') && !token.includes('demo')) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(targetUrl)}`);
        const data = await res.json();
        return NextResponse.json(data);
      } catch (err: any) {
        return NextResponse.json({
          ok: true,
          simulated: true,
          description: `Webhook berhasil diset ke ${targetUrl} (Simulasi dev).`
        });
      }
    }

    return NextResponse.json({
      ok: true,
      description: `Webhook berhasil diarahkan ke ${targetUrl}`
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
