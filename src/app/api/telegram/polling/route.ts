import { NextRequest, NextResponse } from 'next/server';
import { telegramLongPoller } from '@/lib/telegram/long-poller';
import { TelegramBotApi } from '@/lib/telegram/bot-api';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const status = telegramLongPoller.getStatus();
  return NextResponse.json({
    ok: true,
    polling: status,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, token } = body;

    if (action === 'start' || action === 'restart') {
      let targetToken = token ? token.trim() : process.env.TELEGRAM_BOT_TOKEN;

      // Fallback: check .env.local or .env if token not in memory or is mock
      if (!targetToken || targetToken === 'mock_telegram_token' || targetToken.startsWith('mock_')) {
        try {
          for (const envFile of ['.env.local', '.env']) {
            const envPath = path.join(process.cwd(), envFile);
            if (fs.existsSync(envPath)) {
              const content = fs.readFileSync(envPath, 'utf8');
              const match = content.match(/TELEGRAM_BOT_TOKEN=["']?([^"'\r\n]+)["']?/);
              if (match && match[1] && !match[1].startsWith('mock_')) {
                targetToken = match[1].trim();
                break;
              }
            }
          }
        } catch (e) {}
      }

      // Clean up token using standardized TelegramBotApi.cleanToken
      targetToken = TelegramBotApi.cleanToken(targetToken);

      if (!targetToken || targetToken === 'mock_telegram_token' || targetToken.startsWith('mock_')) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Token bot belum valid. Masukkan token bot "Tata dana bunga" dari @BotFather.',
          },
          { status: 400 }
        );
      }

      // Verify token with Telegram API getMe first
      const testApi = new TelegramBotApi(targetToken);
      const me = await testApi.getMe();
      if (!me.ok || !me.result) {
        return NextResponse.json(
          {
            ok: false,
            error: me.description || 'Token bot ditolak oleh Telegram API. Pastikan token dari @BotFather benar.',
          },
          { status: 400 }
        );
      }

      // Save token to .env.local file so it persists across server restarts
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
            envContent = envContent.replace(
              /TELEGRAM_BOT_TOKEN=["']?[^"'\r\n]*["']?/,
              `TELEGRAM_BOT_TOKEN="${targetToken}"`
            );
          } else {
            envContent += `\nTELEGRAM_BOT_TOKEN="${targetToken}"\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
        } else {
          fs.writeFileSync(envPath, `TELEGRAM_BOT_TOKEN="${targetToken}"\n`, 'utf8');
        }
        process.env.TELEGRAM_BOT_TOKEN = targetToken;
      } catch (saveErr) {
        console.warn('Could not update .env.local automatically:', saveErr);
      }

      // Start / Restart Poller
      const res = await telegramLongPoller.restart(targetToken);
      return NextResponse.json({
        ok: res.ok,
        message: res.message,
        bot: res.bot || me.result,
        polling: telegramLongPoller.getStatus(),
      });
    }

    if (action === 'stop') {
      telegramLongPoller.stop();
      return NextResponse.json({
        ok: true,
        message: 'Long Polling dihentikan.',
        polling: telegramLongPoller.getStatus(),
      });
    }

    return NextResponse.json({ ok: false, error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
