import { TelegramBotApi, TelegramUpdate, TelegramBotInfo } from './bot-api';
import { dataStore } from '../storage-mock';
import { mockStore } from '../supabase/mock-store';
import { fastCache } from '../cache';
import {
  parseNaturalLanguageInput,
  formatExpenseReply,
  formatIncomeReply,
  handleTelegramCommand,
  checkFinancialAdvisorTriggers,
  formatRupiah,
  resolveTargetWallet,
} from '../telegram-parser';
export { resolveTargetWallet };
import { isBoostOrPercepatCommand } from '../utils/date';
import { Wallet, Category } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// In-Memory Idempotency Tracker for Processed Updates across reloads
const globalForTelegram = globalThis as unknown as {
  telegramLongPoller: TelegramLongPoller | undefined;
  processedTelegramUpdateIds: Set<number> | undefined;
};

export const processedUpdateIds =
  globalForTelegram.processedTelegramUpdateIds ?? new Set<number>();
globalForTelegram.processedTelegramUpdateIds = processedUpdateIds;

export function clearProcessedUpdateIds(): void {
  processedUpdateIds.clear();
}

/**
 * Resolves mockStore category ID based on category name and transaction type.
 * Maps accurately to cat-01..cat-10 instead of crude hardcoding.
 */
export function resolveMockCategoryId(categoryName: string, type: 'expense' | 'income' | 'transfer'): string {
  const cName = (categoryName || '').toLowerCase().trim();
  for (const [id, cat] of mockStore.categories.entries()) {
    if (cat.type && cat.type !== type) continue;
    const name = cat.name.toLowerCase();
    if (name === cName || name.includes(cName) || cName.includes(name)) {
      return id;
    }
  }
  if (type === 'income') return 'cat-08';
  if (cName.includes('makan') || cName.includes('minum') || cName.includes('food')) return 'cat-01';
  if (cName.includes('trans') || cName.includes('bensin') || cName.includes('ojol') || cName.includes('motor')) return 'cat-02';
  if (cName.includes('belanja') || cName.includes('shop')) return 'cat-06';
  if (cName.includes('tagihan') || cName.includes('listrik') || cName.includes('air') || cName.includes('utilitas')) return 'cat-04';
  if (cName.includes('hiburan') || cName.includes('game')) return 'cat-03';
  if (cName.includes('sehat') || cName.includes('obat')) return 'cat-05';
  if (cName.includes('didik') || cName.includes('buku') || cName.includes('kursus')) return 'cat-07';
  return 'cat-01';
}

/**
 * Synchronizes transaction cleanly into mockStore:
 * - Resolves target wallet from mockStore's own wallet pool
 * - Deducts mockStore wallet balance exactly once (no double-deduction)
 * - Correctly maps category ID with type safety
 * - Preserves original transaction id across stores
 * - Indexes transaction for user-starter-123 and active user
 * - Invalidates fastCache prefixes
 */
export function syncTransactionToMockStore(params: {
  id?: string;
  preferredWalletName?: string;
  preferredWalletKeyword?: string;
  categoryName: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  notes: string;
  source: string;
  receiptImageUrl?: string;
  items?: any[];
  voiceTranscript?: string;
  userId?: string;
}): void {
  try {
    const mockWallet = resolveTargetWallet(
      Array.from(mockStore.wallets.values()),
      params.preferredWalletName,
      params.preferredWalletKeyword
    );

    const mockCatId = resolveMockCategoryId(params.categoryName, params.type);
    const primaryUid = 'user-starter-123';

    const mockTx = mockStore.addTransaction({
      id: params.id,
      user_id: primaryUid,
      wallet_id: mockWallet.id,
      category_id: mockCatId,
      type: params.type,
      amount: params.amount,
      notes: params.notes,
      source: params.source as any,
      receipt_image_url: params.receiptImageUrl,
      items: params.items as any,
      receipt_items: params.items as any,
      voice_transcript: params.voiceTranscript,
    });

    if (params.userId && params.userId !== primaryUid) {
      const uList = mockStore.userTxIndex.get(params.userId) || [];
      uList.unshift(mockTx.id);
      mockStore.userTxIndex.set(params.userId, uList);
      mockStore.userTxCache.delete(params.userId);
    }

    fastCache.invalidatePrefix('txs:');
    fastCache.invalidatePrefix('budgets:');
    fastCache.invalidatePrefix('wallets:');
  } catch (e) {
    console.warn('[Sync mockStore error]:', e);
  }
}


/**
 * Core update processing pipeline shared by Long Polling and Webhook modes.
 * Synchronizes transactions into both dataStore (web overview) and mockStore (reports & APIs).
 */
export async function processTelegramUpdate(
  update: TelegramUpdate,
  botApi?: TelegramBotApi
): Promise<{ ok: boolean; reply: string; type?: string; transaction?: any; status?: string }> {
  const updateId = update.update_id;

  // 1. Idempotency Check (WAJIB Part 2)
  if (updateId !== undefined && updateId !== null) {
    if (processedUpdateIds.has(updateId)) {
      return {
        ok: true,
        status: 'skipped',
        reply: 'Update ID already processed (Idempotency protection active)',
      };
    }
    processedUpdateIds.add(updateId);
  }

  const message = update.message || update.edited_message;
  if (!message) {
    return { ok: false, status: 'no_message', reply: '' };
  }

  const chatId = message.chat?.id;
  const user = dataStore.user;
  const api = botApi || new TelegramBotApi();

  // 2. CHECK BOT COMMANDS (e.g. /saldo, /budget, /hari ini, /boost percepat)
  const trimmedText = message.text ? message.text.toLowerCase().trim() : '';
  const isBoostText = isBoostOrPercepatCommand(trimmedText);

  if (message.text && (message.text.startsWith('/') || isBoostText)) {
    const reply = handleTelegramCommand(message.text, {
      wallets: dataStore.wallets,
      transactions: dataStore.transactions,
      budgets: dataStore.budgets,
      categories: dataStore.categories,
      user,
    });

    if (chatId) {
      await api.sendMessage(chatId, reply);
    }

    return { ok: true, reply, type: 'command' };
  }

  // 3. CHECK STARTER PLAN TRANSACTION LIMIT (50/bulan - PART 4.9)
  if (user.subscriptionPlan === 'starter' && (user.transactionsThisMonth || 0) >= 50) {
    const limitReply = `⚠️ Batas Transaksi Tercapai!
Paket Starter dibatasi 50 transaksi per bulan. Kuota transaksi bulan ini sudah habis.

Upgrade ke TataDana Pro (Rp99.000 Sekali Bayar) untuk:
✨ Unlimited transaksi selamanya
📸 Catat otomatis lewat foto struk
🤖 AI Financial Advisor aktif
📊 Laporan & export unlimited

👉 Buka http://localhost:3000/pricing untuk upgrade sekarang!`;

    if (chatId) {
      await api.sendMessage(chatId, limitReply);
    }
    return { ok: true, reply: limitReply, type: 'limit_exceeded' };
  }

  // 4. HANDLE PHOTO / RECEIPT (4.2 - PRO ONLY)
  if (message.photo && message.photo.length > 0) {
    if (user.subscriptionPlan !== 'pro') {
      const proOnlyReply = `📸 Fitur Catat via Foto Struk hanya tersedia untuk pengguna TataDana Pro!

Dapatkan kemudahan ekstraksi rincian struk belanja otomatis tanpa perlu ketik manual.
👉 Upgrade sekarang ke Pro (Rp99.000 Sekali Bayar): http://localhost:3000/pricing`;

      if (chatId) {
        await api.sendMessage(chatId, proOnlyReply);
      }
      return { ok: true, reply: proOnlyReply, type: 'pro_required' };
    }

    const defaultWallet = dataStore.wallets.find((w) => w.isDefault) || dataStore.wallets[0];

    // Add to dataStore
    const newTx = dataStore.addTransaction({
      userId: user.id,
      walletId: defaultWallet.id,
      walletName: defaultWallet.name,
      categoryId: 'cat_shop',
      categoryName: 'Belanja Kebutuhan',
      categoryEmoji: '👕',
      type: 'expense',
      amount: 85000,
      notes: 'Struk Belanja Minimarket (AI Vision OCR)',
      transactionDate: new Date().toISOString(),
      source: 'telegram_photo',
      receiptImageUrl: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?w=400',
      items: [
        { id: 'i1', itemName: 'Susu UHT Full Cream', quantity: 2, pricePerUnit: 18000, totalPrice: 36000, categoryName: 'Belanja' },
        { id: 'i2', itemName: 'Roti Gandum', quantity: 1, pricePerUnit: 22000, totalPrice: 22000, categoryName: 'Makanan' },
        { id: 'i3', itemName: 'Air Mineral 1.5L', quantity: 3, pricePerUnit: 9000, totalPrice: 27000, categoryName: 'Belanja' },
      ],
    });

    // Also sync cleanly to mockStore
    syncTransactionToMockStore({
      id: newTx.id,
      preferredWalletName: defaultWallet.name,
      categoryName: 'Belanja',
      type: 'expense',
      amount: 85000,
      notes: 'Struk Belanja Minimarket (AI Vision OCR)',
      source: 'telegram_photo',
      receiptImageUrl: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?w=400',
      items: newTx.items as any,
      userId: user.id,
    });

    const budget = dataStore.budgets.find((b) => b.categoryId === 'cat_shop');
    const reply = formatExpenseReply({
      nominal: newTx.amount,
      categoryName: 'Belanja Kebutuhan',
      categoryEmoji: '👕',
      walletName: defaultWallet.name,
      notes: '3 item struk belanja terdeteksi',
      balanceAfter: defaultWallet.balance,
      budgetMonthly: budget?.monthlyAmount || 1500000,
      budgetSpent: budget?.spentAmount || 0,
    });

    if (chatId) {
      await api.sendMessage(chatId, reply);
    }
    return { ok: true, reply, transaction: newTx };
  }

  // 5. HANDLE VOICE NOTE (4.3)
  if (message.voice || message.audio) {
    const duration = message.voice?.duration || message.audio?.duration || 10;
    if (duration > 60) {
      const tooLongReply = `⚠️ Rekaman suara terlalu panjang (${duration} detik).
Maksimal durasi voice note adalah 60 detik agar pemrosesan AI tetap optimal. Silakan kirimkan rekaman yang lebih singkat ya!`;
      if (chatId) {
        await api.sendMessage(chatId, tooLongReply);
      }
      return { ok: true, reply: tooLongReply };
    }

    const mockTranscript = 'Beli bensin motor 45rb';
    const parsed = parseNaturalLanguageInput(mockTranscript);
    const targetWallet = resolveTargetWallet(dataStore.wallets, parsed.walletName, parsed.walletKeyword);

    const newTx = dataStore.addTransaction({
      userId: user.id,
      walletId: targetWallet.id,
      walletName: targetWallet.name,
      categoryId: 'cat_trans',
      categoryName: parsed.categoryName,
      categoryEmoji: parsed.categoryEmoji,
      type: parsed.type,
      amount: parsed.amount,
      notes: parsed.notes,
      transactionDate: new Date().toISOString(),
      source: 'telegram_voice',
      voiceTranscript: mockTranscript,
    });

    syncTransactionToMockStore({
      id: newTx.id,
      preferredWalletName: parsed.walletName,
      preferredWalletKeyword: parsed.walletKeyword,
      categoryName: parsed.categoryName,
      type: parsed.type,
      amount: parsed.amount,
      notes: parsed.notes,
      source: 'telegram_voice',
      voiceTranscript: mockTranscript,
      userId: user.id,
    });

    const budget = dataStore.budgets.find((b) => b.categoryId === 'cat_trans');
    const reply = formatExpenseReply({
      nominal: newTx.amount,
      categoryName: newTx.categoryName || 'Transportasi',
      categoryEmoji: newTx.categoryEmoji || '🚗',
      walletName: targetWallet.name,
      notes: newTx.notes || '',
      balanceAfter: targetWallet.balance,
      budgetMonthly: budget?.monthlyAmount || 1200000,
      budgetSpent: budget?.spentAmount || 0,
      voiceTranscript: mockTranscript,
    });

    if (chatId) {
      await api.sendMessage(chatId, reply);
    }
    return { ok: true, reply, transaction: newTx };
  }

  // 6. HANDLE NATURAL LANGUAGE TEXT (e.g. "beli makan malam 15k tunai")
  if (message.text) {
    const rawText = message.text;
    const parsed = parseNaturalLanguageInput(rawText);

    if (parsed.isAmbiguous || parsed.amount <= 0) {
      const errorReply = `❌ Maaf, saya belum paham maksud pesanmu.\n\n${parsed.errorMessage || 'Contoh: "beli makan malam 15k tunai" atau "gajian 5jt ke bca"'}`;
      if (chatId) {
        await api.sendMessage(chatId, errorReply);
      }
      return { ok: true, reply: errorReply };
    }

    // Resolve Wallet (e.g., "tunai" routes to Dompet Tunai)
    const targetWallet = resolveTargetWallet(dataStore.wallets, parsed.walletName, parsed.walletKeyword);

    // Resolve Category
    const category = dataStore.categories.find(
      (c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase()
    );
    const categoryId = category?.id || 'cat_food';

    // 1. Add to In-Memory dataStore (updates balance & budget)
    const newTx = dataStore.addTransaction({
      userId: user.id,
      walletId: targetWallet.id,
      walletName: targetWallet.name,
      categoryId,
      categoryName: parsed.categoryName,
      categoryEmoji: parsed.categoryEmoji,
      type: parsed.type,
      amount: parsed.amount,
      notes: parsed.notes,
      transactionDate: new Date().toISOString(),
      source: 'telegram_text',
    });

    // 2. Add cleanly to mockStore for full sync across all reports & API routes
    syncTransactionToMockStore({
      id: newTx.id,
      preferredWalletName: parsed.walletName,
      preferredWalletKeyword: parsed.walletKeyword,
      categoryName: parsed.categoryName,
      type: parsed.type,
      amount: parsed.amount,
      notes: parsed.notes,
      source: 'telegram_text',
      userId: user.id,
    });

    // 3. Format Struk Balasan Telegram
    let reply = '';
    if (parsed.type === 'expense') {
      const budget = dataStore.budgets.find((b) => b.categoryId === categoryId);
      reply = formatExpenseReply({
        nominal: newTx.amount,
        categoryName: newTx.categoryName || 'Lainnya',
        categoryEmoji: newTx.categoryEmoji || '📝',
        walletName: targetWallet.name,
        notes: newTx.notes || '',
        balanceAfter: targetWallet.balance,
        budgetMonthly: budget?.monthlyAmount || 0,
        budgetSpent: budget?.spentAmount || 0,
      });
    } else {
      reply = formatIncomeReply({
        nominal: newTx.amount,
        walletName: targetWallet.name,
        balanceAfter: targetWallet.balance,
      });
    }

    // 4. Check Proactive AI Financial Advisor (4.7)
    const advisorNote = checkFinancialAdvisorTriggers({
      user,
      latestTransaction: newTx,
      allTransactions: dataStore.transactions,
      budgets: dataStore.budgets,
    });
    if (advisorNote) {
      reply += `\n\n────────────────\n${advisorNote}`;
    }

    // 5. Send Real Telegram Message Reply
    if (chatId) {
      await api.sendMessage(chatId, reply);
    }

    return { ok: true, reply, transaction: newTx };
  }

  return { ok: false, status: 'unsupported_message_type', reply: '' };
}

/**
 * Singleton Telegram Long Polling Engine
 * Continuously polls updates from Telegram API when running in localhost
 */
export class TelegramLongPoller {
  private isRunning: boolean = false;
  private isStarting: boolean = false;
  private currentLoopId: number = 0;
  private offset: number = 0;
  private botApi: TelegramBotApi | null = null;
  private botInfo: TelegramBotInfo | null = null;
  private lastPollTime: string | null = null;
  private updatesProcessed: number = 0;
  private lastError: string | null = null;
  private pollPromise: Promise<void> | null = null;

  constructor() {
    // Initialized lazily
  }

  /**
   * Starts long polling
   */
  async start(explicitToken?: string): Promise<{ ok: boolean; message: string; bot?: TelegramBotInfo }> {
    if (this.isRunning || this.isStarting) {
      if (explicitToken && TelegramBotApi.cleanToken(explicitToken) !== this.botApi?.getToken()) {
        return this.restart(explicitToken);
      }
      return { ok: true, message: 'Long Polling is already running', bot: this.botInfo || undefined };
    }

    this.isStarting = true;
    try {
      let token =
        explicitToken ||
        process.env.TELEGRAM_BOT_TOKEN ||
        this.readTokenFromEnvFile() ||
        '';

      token = TelegramBotApi.cleanToken(token);

      if (!token || token === 'mock_telegram_token' || token.startsWith('mock_')) {
        this.lastError = 'Token bot Telegram belum diset atau masih menggunakan mock_telegram_token. Masukkan token bot "tatadana_unga" dari @BotFather di Settings atau file .env.local.';
        console.warn(`[TelegramLongPoller] ${this.lastError}`);
        return {
          ok: false,
          message: this.lastError,
        };
      }

      this.botApi = new TelegramBotApi(token);
      process.env.TELEGRAM_BOT_TOKEN = token;

      // 1. Preflight check: Call deleteWebhook to avoid 409 Conflict
      console.log('[TelegramLongPoller] Menghapus webhook lama untuk beralih ke Long Polling...');
      const delRes = await this.botApi.deleteWebhook(false);
      if (!delRes.ok) {
        console.warn('[TelegramLongPoller] deleteWebhook warning:', delRes.description);
      }

      // 2. Call getMe to verify bot token & identify bot name
      console.log('[TelegramLongPoller] Memverifikasi identitas bot via getMe()...');
      const meRes = await this.botApi.getMe();
      if (!meRes.ok || !meRes.result) {
        this.lastError = meRes.description || 'Gagal memverifikasi token ke Telegram API';
        console.error(`[TelegramLongPoller] Verifikasi bot gagal: ${this.lastError}`);
        return { ok: false, message: this.lastError };
      }

      this.botInfo = meRes.result;
      this.isRunning = true;
      this.lastError = null;

      console.log(`[TelegramLongPoller] 🟢 Long Polling aktif! Terhubung ke bot "${this.botInfo.first_name}" (@${this.botInfo.username})`);

      // Sync with dataStore user status
      dataStore.user.telegramConnected = true;
      dataStore.user.telegramUsername = this.botInfo.username;
      dataStore.user.telegramBotToken = token;

      // Start background loop with fresh loopId
      this.pollPromise = this.pollLoop();

      return {
        ok: true,
        message: `Long polling berhasil dimulai untuk bot "${this.botInfo.first_name}" (@${this.botInfo.username})`,
        bot: this.botInfo,
      };
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Polling loop execution
   */
  private async pollLoop(): Promise<void> {
    const loopId = ++this.currentLoopId;
    console.log(`[TelegramLongPoller] Memulai loop #${loopId} getUpdates long-polling...`);

    while (this.isRunning && loopId === this.currentLoopId && this.botApi) {
      try {
        this.lastPollTime = new Date().toISOString();
        const res = await this.botApi.getUpdates(this.offset, 50, 20);

        if (!this.isRunning || loopId !== this.currentLoopId) break;

        if (res.ok && Array.isArray(res.result)) {
          if (res.result.length === 0) {
            // Safety yield to avoid busy looping when long polling timeout yields 0 updates or in mock mode
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else {
            for (const update of res.result) {
              if (!this.isRunning || loopId !== this.currentLoopId) break;
              this.offset = update.update_id + 1;
              try {
                console.log(`[TelegramLongPoller] Menerima update #${update.update_id} dari Telegram...`);
                await processTelegramUpdate(update, this.botApi);
                this.updatesProcessed++;
              } catch (procErr: any) {
                console.error(`[TelegramLongPoller] Error processing update #${update.update_id}:`, procErr);
              }
            }
          }
        } else if (!res.ok) {
          this.lastError = res.description || 'Telegram API returned error';

          // Fatal: 401 Unauthorized or 404 Not Found (Token revoked or invalid)
          if (res.error_code === 401 || res.error_code === 404) {
            console.error(`[TelegramLongPoller] 🛑 Token Telegram tidak valid atau dicabut (HTTP ${res.error_code}). Menghentikan loop.`);
            this.isRunning = false;
            this.lastError = `Token bot ditolak (${res.error_code} ${res.description || 'Unauthorized'}). Harap periksa kembali token bot di Settings atau .env.local.`;
            dataStore.user.telegramConnected = false;
            break;
          }

          // If 409 Conflict occurred (e.g. previous getUpdates request is still completing or another poller):
          if (res.error_code === 409) {
            console.log('[TelegramLongPoller] 409 Conflict: ada koneksi lain atau permintaan sebelumnya masih terbuka. Menunggu 8 detik...');
            await this.botApi.deleteWebhook(false);
            await new Promise((resolve) => setTimeout(resolve, 8000));
            if (!this.isRunning || loopId !== this.currentLoopId) break;
            continue;
          }

          // Rate limit 429
          if (res.error_code === 429) {
            const retrySeconds = res.parameters?.retry_after || 10;
            console.warn(`[TelegramLongPoller] ⏳ Rate limited by Telegram API. Waiting ${retrySeconds}s...`);
            await new Promise((resolve) => setTimeout(resolve, retrySeconds * 1000));
            continue;
          }

          // Backoff before retry
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (err: any) {
        if (!this.isRunning || loopId !== this.currentLoopId) break;
        this.lastError = err.message || 'Network error during long polling';
        console.warn(`[TelegramLongPoller] Loop exception: ${this.lastError}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`[TelegramLongPoller] Loop #${loopId} long-polling dihentikan.`);
  }

  /**
   * Stops long polling
   */
  stop(): void {
    console.log('[TelegramLongPoller] Menghentikan Long Polling...');
    this.isRunning = false;
    this.currentLoopId++;
  }

  /**
   * Restarts long polling with optional new token
   */
  async restart(newToken?: string): Promise<{ ok: boolean; message: string; bot?: TelegramBotInfo }> {
    this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return this.start(newToken);
  }

  /**
   * Returns current poller status
   */
  getStatus() {
    const token = this.botApi?.getToken() || process.env.TELEGRAM_BOT_TOKEN || '';
    const masked = token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : 'tidak diset';

    return {
      isRunning: this.isRunning,
      status: this.isRunning ? 'active' : this.lastError ? 'error' : 'stopped',
      botInfo: this.botInfo,
      updatesProcessed: this.updatesProcessed,
      lastPollTime: this.lastPollTime,
      lastError: this.lastError,
      tokenMasked: masked,
      mode: 'long_polling' as const,
    };
  }

  /**
   * Helper to read token directly from .env.local or .env file
   */
  private readTokenFromEnvFile(): string | null {
    try {
      const candidates = ['.env.local', '.env'];
      for (const candidate of candidates) {
        const envPath = path.join(process.cwd(), candidate);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const match = content.match(/TELEGRAM_BOT_TOKEN=["']?([^"'\r\n]+)["']?/);
          if (match && match[1] && !match[1].startsWith('mock_')) {
            return match[1].trim();
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }
}

// Global Singleton Instance
export const telegramLongPoller =
  globalForTelegram.telegramLongPoller ?? new TelegramLongPoller();
globalForTelegram.telegramLongPoller = telegramLongPoller;
