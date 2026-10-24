import { telegramLongPoller } from '../lib/telegram/long-poller';
import { TelegramBotApi } from '../lib/telegram/bot-api';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local or .env if available without external dependencies
for (const envFile of ['.env.local', '.env']) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          const v = trimmed.substring(idx + 1).replace(/^["']|["']$/g, '').trim();
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

console.log('====================================================');
console.log('🤖 TATADANA TELEGRAM BOT — LONG POLLING DAEMON');
console.log('====================================================');
console.log('Mode        : Long Polling (Localhost Development)');
console.log('Token Target: Bot "Tata dana bunga" dari @BotFather');
console.log('Database    : Supabase & In-Memory Store (Sync Active)');
console.log('====================================================\n');

async function run() {
  const rawToken = process.env.TELEGRAM_BOT_TOKEN;
  const token = TelegramBotApi.cleanToken(rawToken);

  if (!token || token === 'mock_telegram_token' || token.startsWith('mock_')) {
    console.error('❌ Token Bot Telegram belum diset di .env.local atau Settings!');
    console.log('👉 Masukkan token API dari @BotFather untuk bot "Tata dana bunga":');
    console.log('   Buka .env.local dan ganti:');
    console.log('   TELEGRAM_BOT_TOKEN="<TOKEN_KAMU_DARI_BOTFATHER>"\n');
    console.log('Atau atur langsung lewat Dashboard: http://localhost:3000/dashboard/settings\n');
    process.exit(1);
  }

  console.log(`Menginisialisasi koneksi dengan token: ${token.slice(0, 6)}...${token.slice(-4)}`);

  const result = await telegramLongPoller.start(token);
  if (!result.ok) {
    console.error(`❌ Gagal memulai Long Polling: ${result.message}`);
    process.exit(1);
  }

  console.log(`\n🎉 Bot siap dan aktif mendengarkan pesan dari Telegram!`);
  console.log(`Nama Bot: ${result.bot?.first_name || 'Tata dana bunga'}`);
  console.log(`Username: @${result.bot?.username || 'ungakeuanganbot'}`);
  console.log(`Kirim pesan di Telegram HP kamu (misal: "beli makan malam 15k tunai")\n`);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Menghentikan Long Poller daemon...');
    telegramLongPoller.stop();
    process.exit(0);
  });
}

run().catch((err) => {
  console.error('Fatal Poller Error:', err);
  process.exit(1);
});
