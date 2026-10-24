import {
  UserProfile,
  Wallet,
  Category,
  Budget,
  Transaction,
  AIProviderConfig,
  AILog,
  ExportRecord,
  MidtransPayment,
  AuditLog,
  ReminderConfig
} from './types';

// Default In-Memory Initial State (Seeded for Bunga Putri - bungaputri@gmail.com & Superadmin Unga Putri - ungaaputrii06@gmail.com)
export const ungaAdminUser: UserProfile = {
  id: 'adm_unga_01',
  email: 'ungaaputrii@gmail.com',
  status: 'approved',
  approval_status: 'approved',
  phone_number: '+6281298765432',
  phoneNumber: '+6281298765432',
  is_phone_verified: true,
  phoneVerified: true,
  full_name: 'Unga Putri',
  fullName: 'Unga Putri',
  avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  default_currency: 'IDR',
  defaultCurrency: 'IDR',
  role: 'superadmin',
  plan: 'pro',
  subscriptionPlan: 'pro',
  subscriptionStatus: 'active',
  telegram_user_id: 5829104,
  telegramUserId: 5829104,
  telegram_username: 'keuanganunga_bot',
  telegramUsername: 'keuanganunga_bot',
  telegram_connection_status: 'connected',
  telegram_connected: true,
  telegramConnected: true,
  telegramBotToken: '8850870116:AAHdIEE4ujO-xq9bM14Dl1G0U3j8AhJX5bk',
  telegram_bot_token: '8850870116:AAHdIEE4ujO-xq9bM14Dl1G0U3j8AhJX5bk',
  transactionsThisMonth: 42,
  created_at: '2026-09-01T08:00:00+07:00',
  createdAt: '2026-09-01T08:00:00+07:00',
};

const initialUser: UserProfile = {
  id: 'usr_bunga_01',
  email: 'bungaputri@gmail.com',
  phone_number: '+6281298765432',
  phoneNumber: '+6281298765432',
  is_phone_verified: true,
  phoneVerified: true,
  full_name: 'Bunga Putri',
  fullName: 'Bunga Putri',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  default_currency: 'IDR',
  defaultCurrency: 'IDR',
  status: 'approved',
  approval_status: 'approved',
  role: 'user',
  plan: 'pro',
  subscriptionPlan: 'pro',
  subscriptionStatus: 'active',
  telegram_user_id: 5829104,
  telegramUserId: 5829104,
  telegram_username: 'keuanganunga_bot',
  telegramUsername: 'keuanganunga_bot',
  telegram_connection_status: 'connected',
  telegram_connected: true,
  telegramConnected: true,
  telegramBotToken: '8850870116:AAHdIEE4ujO-xq9bM14Dl1G0U3j8AhJX5bk',
  telegram_bot_token: '8850870116:AAHdIEE4ujO-xq9bM14Dl1G0U3j8AhJX5bk',
  transactionsThisMonth: 18,
  created_at: '2026-09-01T08:00:00+07:00',
  createdAt: '2026-09-01T08:00:00+07:00',
};

const initialWallets: Wallet[] = [
  { id: 'w_bca', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', name: 'BCA Prioritas', type: 'bank', balance: 14250000, is_default: true, isDefault: true, icon: 'landmark', colorHex: '#2563EB', created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'w_cash', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', name: 'Dompet Tunai', type: 'cash', balance: 450000, is_default: false, isDefault: false, icon: 'wallet', colorHex: '#10B981', created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'w_gopay', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', name: 'GoPay', type: 'ewallet', balance: 320000, is_default: false, isDefault: false, icon: 'smartphone', colorHex: '#00AED6', created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'w_mandiri', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', name: 'Mandiri Tabungan', type: 'bank', balance: 8500000, is_default: false, isDefault: false, icon: 'building', colorHex: '#0284C7', created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'w_ovo', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', name: 'OVO', type: 'ewallet', balance: 500000, is_default: false, isDefault: false, icon: 'smartphone', colorHex: '#8B5CF6', created_at: '2026-09-01T08:00:00+07:00' },
];

const initialCategories: Category[] = [
  // Pengeluaran Kebutuhan Pokok
  { id: 'cat_food', name: 'Makanan & Minuman Pokok', type: 'expense', iconEmoji: '🍜', colorHex: '#2563EB', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_coffee', name: 'Kopi & Jajan Santai', type: 'expense', iconEmoji: '☕', colorHex: '#F59E0B', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_trans', name: 'Bensin, Parkir & Tol', type: 'expense', iconEmoji: '🚗', colorHex: '#3B82F6', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_ojol', name: 'Ojek & Transport Online', type: 'expense', iconEmoji: '🛵', colorHex: '#00AED6', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_bill', name: 'Tagihan Listrik PLN & Air', type: 'expense', iconEmoji: '🏠', colorHex: '#EF4444', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_wifi', name: 'Internet WiFi & Pulsa HP', type: 'expense', iconEmoji: '📶', colorHex: '#6366F1', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_shop', name: 'Belanja Bulanan & Supermarket', type: 'expense', iconEmoji: '🛒', colorHex: '#EC4899', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_fashion', name: 'Pakaian & Fashion', type: 'expense', iconEmoji: '👕', colorHex: '#8B5CF6', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_health', name: 'Kesehatan, Skincare & Obat', type: 'expense', iconEmoji: '💊', colorHex: '#10B981', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_ent', name: 'Hiburan, Bioskop & Game', type: 'expense', iconEmoji: '🎮', colorHex: '#F43F5E', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_stream', name: 'Langganan Streaming (Netflix/Spotify)', type: 'expense', iconEmoji: '🎬', colorHex: '#E11D48', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_edu', name: 'Pendidikan, Buku & Kursus', type: 'expense', iconEmoji: '📚', colorHex: '#0284C7', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_donation', name: 'Donasi, Zakat & Sedekah', type: 'expense', iconEmoji: '🤲', colorHex: '#059669', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  // Pemasukan
  { id: 'cat_salary', name: 'Gaji Utama & Tunjangan', type: 'income', iconEmoji: '💼', colorHex: '#10B981', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_freelance', name: 'Freelance & Side Hustle', type: 'income', iconEmoji: '💻', colorHex: '#06B6D4', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_invest', name: 'Investasi & Reksadana', type: 'income', iconEmoji: '📈', colorHex: '#84CC16', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'cat_bonus', name: 'Bonus, THR & Hadiah', type: 'income', iconEmoji: '💰', colorHex: '#F59E0B', isCustom: false, created_at: '2026-09-01T08:00:00+07:00' },
];

const initialBudgets: Budget[] = [
  { id: 'b_food', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_food', categoryId: 'cat_food', categoryName: 'Makanan & Minuman Pokok', categoryEmoji: '🍜', monthly_amount: 2000000, monthlyAmount: 2000000, spentAmount: 1250000, monthYear: '2026-10', alert_80_sent: false, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_coffee', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_coffee', categoryId: 'cat_coffee', categoryName: 'Kopi & Jajan Santai', categoryEmoji: '☕', monthly_amount: 450000, monthlyAmount: 450000, spentAmount: 320000, monthYear: '2026-10', alert_80_sent: false, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_trans', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_trans', categoryId: 'cat_trans', categoryName: 'Bensin, Parkir & Tol', categoryEmoji: '🚗', monthly_amount: 600000, monthlyAmount: 600000, spentAmount: 350000, monthYear: '2026-10', alert_80_sent: false, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_ojol', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_ojol', categoryId: 'cat_ojol', categoryName: 'Ojek & Transport Online', categoryEmoji: '🛵', monthly_amount: 400000, monthlyAmount: 400000, spentAmount: 180000, monthYear: '2026-10', alert_80_sent: false, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_bill', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_bill', categoryId: 'cat_bill', categoryName: 'Tagihan Listrik PLN & Air', categoryEmoji: '🏠', monthly_amount: 500000, monthlyAmount: 500000, spentAmount: 485000, monthYear: '2026-10', alert_80_sent: true, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_wifi', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_wifi', categoryId: 'cat_wifi', categoryName: 'Internet WiFi & Pulsa HP', categoryEmoji: '📶', monthly_amount: 450000, monthlyAmount: 450000, spentAmount: 400000, monthYear: '2026-10', alert_80_sent: true, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_shop', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_shop', categoryId: 'cat_shop', categoryName: 'Belanja Bulanan & Supermarket', categoryEmoji: '🛒', monthly_amount: 1200000, monthlyAmount: 1200000, spentAmount: 750000, monthYear: '2026-10', alert_80_sent: false, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_health', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_health', categoryId: 'cat_health', categoryName: 'Kesehatan, Skincare & Obat', categoryEmoji: '💊', monthly_amount: 500000, monthlyAmount: 500000, spentAmount: 210000, monthYear: '2026-10', alert_80_sent: false, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_ent', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_ent', categoryId: 'cat_ent', categoryName: 'Hiburan, Bioskop & Game', categoryEmoji: '🎮', monthly_amount: 350000, monthlyAmount: 350000, spentAmount: 240000, monthYear: '2026-10', alert_80_sent: false, alert_100_sent: false, created_at: '2026-09-01T08:00:00+07:00' },
  { id: 'b_stream', user_id: 'usr_bunga_01', userId: 'usr_bunga_01', category_id: 'cat_stream', categoryId: 'cat_stream', categoryName: 'Langganan Streaming (Netflix/Spotify)', categoryEmoji: '🎬', monthly_amount: 150000, monthlyAmount: 150000, spentAmount: 150000, monthYear: '2026-10', alert_80_sent: true, alert_100_sent: true, created_at: '2026-09-01T08:00:00+07:00' },
];

const now = new Date();
const todayIso = now.toISOString();
const yesterdayIso = new Date(now.getTime() - 86400000).toISOString();
const threeDaysAgoIso = new Date(now.getTime() - 3 * 86400000).toISOString();
const fiveDaysAgoIso = new Date(now.getTime() - 5 * 86400000).toISOString();
const tenDaysAgoIso = new Date(now.getTime() - 10 * 86400000).toISOString();
const fifteenDaysAgoIso = new Date(now.getTime() - 15 * 86400000).toISOString();

const initialTransactions: Transaction[] = [
  // HARI INI (1 Hari)
  {
    id: 'tx_today_01',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_cash',
    walletId: 'w_cash',
    walletName: 'Dompet Tunai',
    category_id: 'cat_food',
    categoryId: 'cat_food',
    categoryName: 'Makanan & Minuman Pokok',
    categoryEmoji: '🍜',
    type: 'expense',
    amount: 25000,
    notes: 'Makan siang nasi padang komplit',
    transaction_date: todayIso,
    transactionDate: todayIso,
    source: 'telegram_text',
    created_at: todayIso,
    createdAt: todayIso
  },
  {
    id: 'tx_today_02',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_gopay',
    walletId: 'w_gopay',
    walletName: 'GoPay',
    category_id: 'cat_coffee',
    categoryId: 'cat_coffee',
    categoryName: 'Kopi & Jajan Santai',
    categoryEmoji: '☕',
    type: 'expense',
    amount: 18000,
    notes: 'Es Kopi Susu gula aren siang',
    transaction_date: todayIso,
    transactionDate: todayIso,
    source: 'telegram_text',
    created_at: todayIso,
    createdAt: todayIso
  },
  // 7 HARI TERAKHIR (Mingguan)
  {
    id: 'tx_week_01',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_cash',
    walletId: 'w_cash',
    walletName: 'Dompet Tunai',
    category_id: 'cat_trans',
    categoryId: 'cat_trans',
    categoryName: 'Bensin, Parkir & Tol',
    categoryEmoji: '🚗',
    type: 'expense',
    amount: 50000,
    notes: 'Isi Pertalite motor',
    transaction_date: yesterdayIso,
    transactionDate: yesterdayIso,
    source: 'telegram_text',
    created_at: yesterdayIso,
    createdAt: yesterdayIso
  },
  {
    id: 'tx_week_02',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_gopay',
    walletId: 'w_gopay',
    walletName: 'GoPay',
    category_id: 'cat_ojol',
    categoryId: 'cat_ojol',
    categoryName: 'Ojek & Transport Online',
    categoryEmoji: '🛵',
    type: 'expense',
    amount: 24000,
    notes: 'Gojek ke Stasiun MRT',
    transaction_date: threeDaysAgoIso,
    transactionDate: threeDaysAgoIso,
    source: 'telegram_voice',
    created_at: threeDaysAgoIso,
    createdAt: threeDaysAgoIso
  },
  {
    id: 'tx_week_03',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_bca',
    walletId: 'w_bca',
    walletName: 'BCA Prioritas',
    category_id: 'cat_shop',
    categoryId: 'cat_shop',
    categoryName: 'Belanja Bulanan & Supermarket',
    categoryEmoji: '🛒',
    type: 'expense',
    amount: 325000,
    notes: 'Struk belanja Superindo buah & sayur',
    transaction_date: fiveDaysAgoIso,
    transactionDate: fiveDaysAgoIso,
    source: 'telegram_photo',
    receiptImageUrl: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?w=400',
    created_at: fiveDaysAgoIso,
    createdAt: fiveDaysAgoIso
  },
  // BULAN INI (1 Bulan)
  {
    id: 'tx_month_01',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_bca',
    walletId: 'w_bca',
    walletName: 'BCA Prioritas',
    category_id: 'cat_salary',
    categoryId: 'cat_salary',
    categoryName: 'Gaji Utama & Tunjangan',
    categoryEmoji: '💼',
    type: 'income',
    amount: 18500000,
    notes: 'Gaji Bulanan Oktober 2026',
    transaction_date: fifteenDaysAgoIso,
    transactionDate: fifteenDaysAgoIso,
    source: 'web',
    created_at: fifteenDaysAgoIso,
    createdAt: fifteenDaysAgoIso
  },
  {
    id: 'tx_month_02',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_bca',
    walletId: 'w_bca',
    walletName: 'BCA Prioritas',
    category_id: 'cat_freelance',
    categoryId: 'cat_freelance',
    categoryName: 'Freelance & Side Hustle',
    categoryEmoji: '💻',
    type: 'income',
    amount: 3500000,
    notes: 'Pembayaran DP Desain UI/UX Klien',
    transaction_date: tenDaysAgoIso,
    transactionDate: tenDaysAgoIso,
    source: 'web',
    created_at: tenDaysAgoIso,
    createdAt: tenDaysAgoIso
  },
  {
    id: 'tx_month_03',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_bca',
    walletId: 'w_bca',
    walletName: 'BCA Prioritas',
    category_id: 'cat_bill',
    categoryId: 'cat_bill',
    categoryName: 'Tagihan Listrik PLN & Air',
    categoryEmoji: '🏠',
    type: 'expense',
    amount: 485000,
    notes: 'Token Listrik PLN & PDAM',
    transaction_date: tenDaysAgoIso,
    transactionDate: tenDaysAgoIso,
    source: 'telegram_text',
    created_at: tenDaysAgoIso,
    createdAt: tenDaysAgoIso
  },
  {
    id: 'tx_month_04',
    user_id: 'usr_bunga_01',
    userId: 'usr_bunga_01',
    wallet_id: 'w_bca',
    walletId: 'w_bca',
    walletName: 'BCA Prioritas',
    category_id: 'cat_stream',
    categoryId: 'cat_stream',
    categoryName: 'Langganan Streaming (Netflix/Spotify)',
    categoryEmoji: '🎬',
    type: 'expense',
    amount: 150000,
    notes: 'Auto-debet Netflix Premium & Spotify Duo',
    transaction_date: tenDaysAgoIso,
    transactionDate: tenDaysAgoIso,
    source: 'web',
    created_at: tenDaysAgoIso,
    createdAt: tenDaysAgoIso
  }
];

const initialAIProviders: AIProviderConfig[] = [
  { id: 'prov_gemini', name: 'gemini', display_name: 'Google Gemini 2.0 Flash', displayName: 'Google Gemini 2.0 Flash', apiKeyMasked: 'AIzaSy...7B9x', modelName: 'gemini-2.0-flash', is_active: true, isActive: true, priority: 1, created_at: '2026-09-01T08:00:00+07:00', updated_at: '2026-09-01T08:00:00+07:00' },
  { id: 'prov_openai', name: 'openai', display_name: 'OpenAI GPT-4o-mini', displayName: 'OpenAI GPT-4o-mini', apiKeyMasked: 'sk-proj-...8L2z', modelName: 'gpt-4o-mini', is_active: true, isActive: true, priority: 2, created_at: '2026-09-01T08:00:00+07:00', updated_at: '2026-09-01T08:00:00+07:00' },
  { id: 'prov_deepseek', name: 'deepseek', display_name: 'DeepSeek-V3 Chat', displayName: 'DeepSeek-V3 Chat', apiKeyMasked: 'sk-deep-...3F1a', modelName: 'deepseek-chat', is_active: false, isActive: false, priority: 3, created_at: '2026-09-01T08:00:00+07:00', updated_at: '2026-09-01T08:00:00+07:00' },
];

const initialAILogs: AILog[] = [
  { id: 'log_01', provider: 'gemini-2.0-flash', providerName: 'gemini-2.0-flash', feature: 'text_parser', endpointType: 'text_parser', prompt: 'kopi susu 25k tunai', prompt_text: 'kopi susu 25k tunai', prompt_tokens: 180, completion_tokens: 45, promptTokens: 180, completionTokens: 45, costIdr: 4.5, latency_ms: 340, latencyMs: 340, status: 'success', created_at: '2026-10-09T21:00:05+07:00', createdAt: '2026-10-09T21:00:05+07:00' },
  { id: 'log_02', provider: 'gemini-2.0-flash', providerName: 'gemini-2.0-flash', feature: 'vision_receipt', endpointType: 'vision_receipt', prompt: 'Ekstraksi struk belanja Superindo Rp 325.000', prompt_text: 'Ekstraksi struk belanja Superindo Rp 325.000', prompt_tokens: 920, completion_tokens: 210, promptTokens: 920, completionTokens: 210, costIdr: 28.0, latency_ms: 1250, latencyMs: 1250, status: 'success', created_at: '2026-10-07T19:40:12+07:00', createdAt: '2026-10-07T19:40:12+07:00' },
  { id: 'log_03', provider: 'gemini-2.0-flash', providerName: 'gemini-2.0-flash', feature: 'speech_transcribe', endpointType: 'speech_transcribe', prompt: 'Voice note: beli bensin pertamax 50rb', prompt_text: 'Voice note: beli bensin pertamax 50rb', prompt_tokens: 340, completion_tokens: 30, promptTokens: 340, completionTokens: 30, costIdr: 8.2, latency_ms: 620, latencyMs: 620, status: 'success', created_at: '2026-10-06T08:10:04+07:00', createdAt: '2026-10-06T08:10:04+07:00' },
  { id: 'log_04', provider: 'gpt-4o-mini', providerName: 'gpt-4o-mini', feature: 'financial_advisor', endpointType: 'financial_advisor', prompt: 'Analisis lonjakan pengeluaran kategori Makanan & Minuman 85%', prompt_text: 'Analisis lonjakan pengeluaran kategori Makanan & Minuman 85%', prompt_tokens: 450, completion_tokens: 120, promptTokens: 450, completionTokens: 120, costIdr: 14.5, latency_ms: 510, latencyMs: 510, status: 'fallback_triggered', created_at: '2026-10-05T12:30:10+07:00', createdAt: '2026-10-05T12:30:10+07:00' },
];

const initialExports: ExportRecord[] = [
  { id: 'exp_01', user_id: 'usr_budi_01', userId: 'usr_budi_01', file_name: 'TataDana_Laporan_Sep_2026.pdf', fileName: 'TataDana_Laporan_Sep_2026.pdf', file_type: 'pdf', fileFormat: 'pdf', period_start: '2026-09-01', periodStart: '2026-09-01', period_end: '2026-09-30', periodEnd: '2026-09-30', totalRecords: 42, fileSizeBytes: 145820, download_url: '#', downloadUrl: '#', created_at: '2026-10-01T10:00:00+07:00', createdAt: '2026-10-01T10:00:00+07:00' },
  { id: 'exp_02', user_id: 'usr_budi_01', userId: 'usr_budi_01', file_name: 'TataDana_Transaksi_Q3_2026.xlsx', fileName: 'TataDana_Transaksi_Q3_2026.xlsx', file_type: 'xlsx', fileFormat: 'xlsx', period_start: '2026-07-01', periodStart: '2026-07-01', period_end: '2026-09-30', periodEnd: '2026-09-30', totalRecords: 128, fileSizeBytes: 89400, download_url: '#', downloadUrl: '#', created_at: '2026-10-01T10:05:00+07:00', createdAt: '2026-10-01T10:05:00+07:00' }
];

const initialPayments: MidtransPayment[] = [
  { id: 'pay_01', user_id: 'usr_budi_01', userId: 'usr_budi_01', userName: 'Budi Santoso', order_id: 'TRX-PRO-99412', orderId: 'TRX-PRO-99412', plan: 'pro', amount: 99000, paymentMethod: 'qris', status: 'settlement', created_at: '2026-09-01T08:15:00+07:00', createdAt: '2026-09-01T08:15:00+07:00' },
  { id: 'pay_02', user_id: 'usr_citra_02', userId: 'usr_citra_02', userName: 'Citra Kirana', order_id: 'TRX-PRO-99413', orderId: 'TRX-PRO-99413', plan: 'pro', amount: 99000, paymentMethod: 'manual_transfer', status: 'pending', manualProofImage: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?w=200', created_at: '2026-10-09T18:20:00+07:00', createdAt: '2026-10-09T18:20:00+07:00' },
  { id: 'pay_03', user_id: 'user-starter-123', userId: 'user-starter-123', userName: 'Budi Pratama', order_id: 'TRX-PRO-99414', orderId: 'TRX-PRO-99414', plan: 'pro', amount: 99000, paymentMethod: 'manual_transfer', status: 'pending', manualProofImage: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?w=200', created_at: '2026-10-15T10:15:00+07:00', createdAt: '2026-10-15T10:15:00+07:00' },
  { id: 'pay_04', user_id: 'usr_dimas_04', userId: 'usr_dimas_04', userName: 'Dimas Wicaksono', order_id: 'TRX-PRO-99415', orderId: 'TRX-PRO-99415', plan: 'pro', amount: 99000, paymentMethod: 'bca_va', status: 'pending', manualProofImage: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?w=200', created_at: '2026-10-16T14:30:00+07:00', createdAt: '2026-10-16T14:30:00+07:00' },
  { id: 'pay_05', user_id: 'usr_nabila_05', userId: 'usr_nabila_05', userName: 'Nabila Az-Zahra', order_id: 'TRX-PRO-99416', orderId: 'TRX-PRO-99416', plan: 'pro', amount: 99000, paymentMethod: 'qris', status: 'pending', manualProofImage: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?w=200', created_at: '2026-10-17T09:00:00+07:00', createdAt: '2026-10-17T09:00:00+07:00' },
];

const initialAuditLogs: AuditLog[] = [
  { id: 'aud_01', admin_id: 'adm_01', adminId: 'adm_01', adminName: 'Super Admin', action: 'VIEW_USER_TRANSACTIONS', target_user_id: 'usr_budi_01', targetUserId: 'usr_budi_01', targetUserName: 'Budi Santoso', details: 'Audit investigasi support tiket #SUP-441', created_at: '2026-10-08T11:20:00+07:00', createdAt: '2026-10-08T11:20:00+07:00' },
  { id: 'aud_02', admin_id: 'adm_01', adminId: 'adm_01', adminName: 'Super Admin', action: 'APPROVE_PAYMENT', target_user_id: 'usr_citra_02', targetUserId: 'usr_citra_02', targetUserName: 'Citra Kirana', details: 'Manual approval Midtrans transfer bank BCA', created_at: '2026-10-07T14:10:00+07:00', createdAt: '2026-10-07T14:10:00+07:00' },
];

const initialUsers: UserProfile[] = [
  { ...ungaAdminUser },
  { ...initialUser },
  {
    id: 'usr_budi_01',
    email: 'budi.santoso@example.com',
    phone_number: '+6281234567890',
    phoneNumber: '+6281234567890',
    full_name: 'Budi Santoso',
    fullName: 'Budi Santoso',
    role: 'user',
    plan: 'starter',
    status: 'approved',
    approval_status: 'approved',
    is_phone_verified: true,
    phoneVerified: true,
    whatsapp_verified: true,
    is_whatsapp_verified: true,
    created_at: '2026-09-01T08:00:00+07:00',
  },
  {
    id: 'usr_citra_02',
    email: 'citra.kirana@example.com',
    phone_number: '+6281398761234',
    phoneNumber: '+6281398761234',
    full_name: 'Citra Kirana',
    fullName: 'Citra Kirana',
    role: 'user',
    plan: 'starter',
    status: 'approved',
    approval_status: 'approved',
    is_phone_verified: true,
    phoneVerified: true,
    whatsapp_verified: true,
    is_whatsapp_verified: true,
    created_at: '2026-09-15T10:00:00+07:00',
  },
  {
    id: 'usr_doni_01',
    email: 'doni.prasetyo@example.com',
    phone_number: '+6281311223344',
    phoneNumber: '+6281311223344',
    full_name: 'Doni Prasetyo',
    fullName: 'Doni Prasetyo',
    role: 'user',
    plan: 'starter',
    status: 'pending',
    approval_status: 'pending',
    is_phone_verified: true,
    phoneVerified: true,
    whatsapp_verified: true,
    is_whatsapp_verified: true,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'usr_dina_02',
    email: 'dina.marlina@example.com',
    phone_number: '+6281599887766',
    phoneNumber: '+6281599887766',
    full_name: 'Dina Marlina',
    fullName: 'Dina Marlina',
    role: 'user',
    plan: 'starter',
    status: 'pending',
    approval_status: 'pending',
    is_phone_verified: true,
    phoneVerified: true,
    whatsapp_verified: true,
    is_whatsapp_verified: true,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  }
];

// Singleton In-Memory State
class DataStore {
  user: UserProfile = { ...initialUser };
  users: UserProfile[] = [...initialUsers];
  wallets: Wallet[] = [...initialWallets];
  categories: Category[] = [...initialCategories];
  budgets: Budget[] = [...initialBudgets];
  transactions: Transaction[] = [...initialTransactions];
  aiProviders: AIProviderConfig[] = [...initialAIProviders];
  aiMode: 'single' | 'failover' = 'failover';
  aiLogs: AILog[] = [...initialAILogs];
  exports: ExportRecord[] = [...initialExports];
  payments: MidtransPayment[] = [...initialPayments];
  auditLogs: AuditLog[] = [...initialAuditLogs];
  reminderConfig: ReminderConfig = { user_id: 'usr_budi_01', is_active: true, isActive: true, frequency: 1, time1: '12:00', time2: '20:00', boost_mode: false, boostMode: false, boost_minutes: 10, boostMinutes: 10, created_at: '2026-09-01T08:00:00+07:00' };

  registerUser(user: Partial<UserProfile>): UserProfile {
    const id = user.id || 'usr_' + Date.now();
    const nowIso = new Date().toISOString();
    const newUser: UserProfile = {
      id,
      full_name: user.full_name || user.fullName || 'Pengguna Baru',
      fullName: user.fullName || user.full_name || 'Pengguna Baru',
      name: user.full_name || user.fullName || 'Pengguna Baru',
      email: user.email || '',
      phone_number: user.phone_number || user.phoneNumber || '',
      phoneNumber: user.phoneNumber || user.phone_number || '',
      role: 'user',
      plan: user.plan || 'starter',
      subscriptionPlan: user.subscriptionPlan || user.plan || 'starter',
      status: user.status || 'approved',
      approval_status: user.approval_status || (user.status === 'pending' || user.status === 'rejected' ? user.status : 'approved'),
      is_phone_verified: true,
      phoneVerified: true,
      is_whatsapp_verified: true,
      whatsapp_verified: true,
      whatsappVerified: true,
      created_at: nowIso,
      createdAt: nowIso,
      registration_date: nowIso,
      updated_at: nowIso,
    };

    const existingIdx = this.users.findIndex(u => u.id === id || (u.email && newUser.email && u.email === newUser.email) || (u.phone_number && newUser.phone_number && u.phone_number === newUser.phone_number));
    if (existingIdx >= 0) {
      this.users[existingIdx] = { ...this.users[existingIdx], ...newUser };
    } else {
      this.users.unshift(newUser);
    }

    // Create default wallet
    const walletId = 'w_' + id;
    const newWallet: Wallet = {
      id: walletId,
      user_id: id,
      userId: id,
      name: 'Dompet Utama',
      type: 'cash',
      balance: 0,
      is_default: true,
      isDefault: true,
      icon: 'wallet',
      colorHex: '#10B981',
      created_at: nowIso,
    };
    this.wallets.push(newWallet);

    // Write Audit Log
    this.auditLogs.unshift({
      id: 'aud_' + Date.now(),
      admin_id: 'system',
      adminId: 'system',
      adminName: 'Sistem Registrasi',
      action: 'USER_REGISTER_WHATSAPP_VERIFIED',
      target_user_id: id,
      targetUserId: id,
      targetUserName: newUser.full_name,
      details: `Pengguna ${newUser.full_name} (${newUser.phone_number || newUser.email}) berhasil mendaftar dengan verifikasi WhatsApp OTP`,
      created_at: nowIso,
      createdAt: nowIso,
    });

    return newUser;
  }

  // Add Transaction & Update Wallets/Budgets
  addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'created_at' | 'user_id' | 'wallet_id' | 'transaction_date'> & Partial<Transaction>): Transaction {
    const id = 'tx_' + Date.now();
    const nowIso = new Date().toISOString();
    const catId = tx.categoryId || tx.category_id;
    const newTx: Transaction = {
      ...tx,
      id,
      user_id: tx.user_id || tx.userId || this.user.id,
      userId: tx.userId || tx.user_id || this.user.id,
      wallet_id: tx.wallet_id || tx.walletId || 'w_bca',
      walletId: tx.walletId || tx.wallet_id || 'w_bca',
      category_id: catId,
      categoryId: catId,
      transaction_date: tx.transaction_date || tx.transactionDate || nowIso,
      transactionDate: tx.transactionDate || tx.transaction_date || nowIso,
      source: tx.source || 'web',
      created_at: nowIso,
      createdAt: nowIso
    };

    // Update Wallet Balance
    const originWallet = this.wallets.find(w => w.id === newTx.walletId || w.id === newTx.wallet_id);
    if (originWallet) {
      if (newTx.type === 'expense') {
        originWallet.balance -= newTx.amount;
      } else if (newTx.type === 'income') {
        originWallet.balance += newTx.amount;
      } else if (newTx.type === 'transfer') {
        originWallet.balance -= newTx.amount;
        if (newTx.destinationWalletId || newTx.to_wallet_id) {
          const destWallet = this.wallets.find(w => w.id === newTx.destinationWalletId || w.id === newTx.to_wallet_id);
          if (destWallet) destWallet.balance += newTx.amount;
        }
      }
    }

    // Update Budget Spent if Expense
    if (newTx.type === 'expense' && catId) {
      const budget = this.budgets.find(b => (b.categoryId && b.categoryId === catId) || (b.category_id && b.category_id === catId));
      if (budget) {
        budget.spentAmount = (budget.spentAmount || 0) + newTx.amount;
        budget.spent_amount = (budget.spent_amount || 0) + newTx.amount;
        const monthly = budget.monthlyAmount || budget.monthly_amount || 0;
        if (monthly > 0) {
          const ratio = (budget.spentAmount || 0) / monthly;
          if (ratio >= 1.0) {
            budget.alert_100_sent = true;
            budget.alert_80_sent = true;
          } else if (ratio >= 0.8) {
            budget.alert_80_sent = true;
          }
        }
      }
    }

    this.user.transactionsThisMonth = (this.user.transactionsThisMonth || 0) + 1;
    this.transactions.unshift(newTx);
    return newTx;
  }
}

const globalForDataStore = globalThis as unknown as {
  dataStore: DataStore | undefined;
};

export const dataStore = globalForDataStore.dataStore ?? new DataStore();
globalForDataStore.dataStore = dataStore;
