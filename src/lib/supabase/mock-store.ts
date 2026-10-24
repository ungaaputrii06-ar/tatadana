// ==========================================================
// TATADANA IN-MEMORY / SANDBOX DATA STORE
// Enables zero-friction local development, offline verification,
// and automated test execution.
// ==========================================================

import {
  UserProfile,
  Wallet,
  Category,
  Budget,
  Transaction,
  ExportHistoryItem,
  AIProviderConfig,
  AISettings,
  AILog,
  PaymentRecord,
  ReminderSetting,
  AdminAuditLog,
  RecurringBill,
} from '../types';
import { fastCache } from '../cache';

class MockStore {
  profiles: Map<string, UserProfile> = new Map();
  wallets: Map<string, Wallet> = new Map();
  categories: Map<string, Category> = new Map();
  budgets: Map<string, Budget> = new Map();
  transactions: Map<string, Transaction> = new Map();
  recurringBills: Map<string, RecurringBill> = new Map();
  exportHistory: Map<string, ExportHistoryItem> = new Map();
  aiProviders: Map<string, AIProviderConfig> = new Map();
  aiSettings: AISettings = { id: 1, mode: 'single', default_provider: 'gemini', updated_at: new Date().toISOString() };
  aiLogs: AILog[] = [];
  payments: Map<string, PaymentRecord> = new Map();
  reminders: Map<string, ReminderSetting> = new Map();
  auditLogs: AdminAuditLog[] = [];
  processedUpdateIds: Set<number> = new Set();
  otpCache: Map<string, { code: string; expiresAt: number }> = new Map();
  userTxCache: Map<string, Transaction[]> = new Map();

  // Canonical 10 Core Tables aliases
  get users(): Map<string, UserProfile> { return this.profiles; }
  get exportRecords(): Map<string, ExportHistoryItem> { return this.exportHistory; }
  get midtransPayments(): Map<string, PaymentRecord> { return this.payments; }
  get adminAuditLogs(): AdminAuditLog[] { return this.auditLogs; }

  // Secondary Inverted Indexes for O(1) query acceleration
  userTxIndex: Map<string, string[]> = new Map();
  userWalletIndex: Map<string, string[]> = new Map();
  userBudgetIndex: Map<string, string[]> = new Map();
  telegramChatIndex: Map<number, string> = new Map();
  phoneIndex: Map<string, string> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  seedDefaultData() {
    // 1. Initial Users
    const starterUser: UserProfile = {
      id: 'user-starter-123',
      phone_number: '081234567890',
      full_name: 'Budi Pratama',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      default_currency: 'IDR',
      role: 'user',
      plan: 'starter',
      telegram_chat_id: 1001,
      telegram_connection_status: 'connected',
      is_phone_verified: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const proUser: UserProfile = {
      id: 'user-pro-456',
      phone_number: '089876543210',
      full_name: 'Siti Rahma',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      default_currency: 'IDR',
      role: 'user',
      plan: 'pro',
      telegram_chat_id: 1002,
      telegram_connection_status: 'connected',
      is_phone_verified: true,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const adminUser: UserProfile = {
      id: 'admin-001',
      phone_number: '081111111111',
      full_name: 'Super Admin TataDana',
      avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      default_currency: 'IDR',
      role: 'superadmin',
      plan: 'pro',
      telegram_connection_status: 'disconnected',
      is_phone_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const budiUser: UserProfile = {
      id: 'usr_budi_01',
      email: 'budi.santoso@example.com',
      phone_number: '+6281234567890',
      phoneNumber: '+6281234567890',
      is_phone_verified: true,
      phoneVerified: true,
      full_name: 'Budi Santoso',
      fullName: 'Budi Santoso',
      default_currency: 'IDR',
      defaultCurrency: 'IDR',
      role: 'user',
      plan: 'pro',
      subscriptionPlan: 'pro',
      telegram_user_id: 5829104,
      telegram_username: 'budisantoso_id',
      telegram_connection_status: 'connected',
      telegram_connected: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const bungaUser: UserProfile = {
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
      role: 'user',
      plan: 'pro',
      subscriptionPlan: 'pro',
      telegram_user_id: 5829104,
      telegram_username: 'ungakeuanganbot',
      telegram_connection_status: 'connected',
      telegram_connected: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const ungaAdminUser: UserProfile = {
      id: 'adm_unga_01',
      email: 'ungaaputrii@gmail.com',
      phone_number: '081298765432',
      phoneNumber: '081298765432',
      full_name: 'Unga Putri',
      fullName: 'Unga Putri',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      default_currency: 'IDR',
      role: 'superadmin',
      plan: 'pro',
      subscriptionPlan: 'pro',
      status: 'approved',
      approval_status: 'approved',
      telegram_connection_status: 'connected',
      telegram_connected: true,
      is_phone_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const pendingUser1: UserProfile = {
      id: 'usr_doni_01',
      email: 'doni.prasetyo@example.com',
      phone_number: '+6281311223344',
      phoneNumber: '+6281311223344',
      full_name: 'Doni Prasetyo',
      fullName: 'Doni Prasetyo',
      default_currency: 'IDR',
      role: 'user',
      plan: 'starter',
      subscriptionPlan: 'starter',
      status: 'pending',
      approval_status: 'pending',
      telegram_connection_status: 'disconnected',
      is_phone_verified: true,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    };

    const pendingUser2: UserProfile = {
      id: 'usr_dina_02',
      email: 'dina.marlina@example.com',
      phone_number: '+6281599887766',
      phoneNumber: '+6281599887766',
      full_name: 'Dina Marlina',
      fullName: 'Dina Marlina',
      default_currency: 'IDR',
      role: 'user',
      plan: 'starter',
      subscriptionPlan: 'starter',
      status: 'pending',
      approval_status: 'pending',
      telegram_connection_status: 'disconnected',
      is_phone_verified: true,
      created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    };

    const pendingUser3: UserProfile = {
      id: 'usr_eko_03',
      email: 'eko.prasetyo@example.com',
      phone_number: '+6281788990011',
      phoneNumber: '+6281788990011',
      full_name: 'Eko Prasetyo',
      fullName: 'Eko Prasetyo',
      default_currency: 'IDR',
      role: 'user',
      plan: 'starter',
      subscriptionPlan: 'starter',
      status: 'pending',
      approval_status: 'pending',
      telegram_connection_status: 'disconnected',
      is_phone_verified: true,
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
    };

    this.profiles.set(starterUser.id, starterUser);
    this.profiles.set(proUser.id, proUser);
    this.profiles.set(adminUser.id, adminUser);
    this.profiles.set(budiUser.id, budiUser);
    this.profiles.set(bungaUser.id, bungaUser);
    this.profiles.set(ungaAdminUser.id, ungaAdminUser);
    this.profiles.set(pendingUser1.id, pendingUser1);
    this.profiles.set(pendingUser2.id, pendingUser2);
    this.profiles.set(pendingUser3.id, pendingUser3);

    // 2. Default System Categories
    const sysCategories: Category[] = [
      { id: 'cat-01', name: 'Makanan & Minuman Pokok', type: 'expense', emoji: '🍜', color: '#f97316', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-02', name: 'Bensin, Parkir & Tol', type: 'expense', emoji: '🚗', color: '#3b82f6', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-03', name: 'Hiburan, Bioskop & Game', type: 'expense', emoji: '🎮', color: '#a855f7', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-04', name: 'Tagihan Listrik PLN & Air', type: 'expense', emoji: '🏠', color: '#ef4444', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-05', name: 'Kesehatan, Skincare & Obat', type: 'expense', emoji: '💊', color: '#10b981', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-06', name: 'Belanja Bulanan & Supermarket', type: 'expense', emoji: '🛒', color: '#ec4899', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-07', name: 'Pendidikan, Buku & Kursus', type: 'expense', emoji: '📚', color: '#6366f1', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-08', name: 'Gaji Utama & Upah', type: 'income', emoji: '💰', color: '#22c55e', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-09', name: 'Freelance & Side Hustle', type: 'income', emoji: '💻', color: '#14b8a6', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-10', name: 'Investasi, Reksadana & Bunga', type: 'income', emoji: '📈', color: '#f59e0b', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-11', name: 'Kopi & Jajan Santai', type: 'expense', emoji: '☕', color: '#f59e0b', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-12', name: 'Ojek & Transport Online', type: 'expense', emoji: '🛵', color: '#00aed6', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-13', name: 'Internet WiFi & Pulsa HP', type: 'expense', emoji: '📶', color: '#6366f1', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-14', name: 'Pakaian & Fashion', type: 'expense', emoji: '👕', color: '#8b5cf6', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-15', name: 'Langganan Streaming (Netflix/Spotify)', type: 'expense', emoji: '🎬', color: '#e11d48', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-16', name: 'Donasi, Zakat & Sedekah', type: 'expense', emoji: '🤲', color: '#059669', is_system: true, created_at: new Date().toISOString() },
      { id: 'cat-17', name: 'Bonus, THR & Hadiah', type: 'income', emoji: '🎁', color: '#eab308', is_system: true, created_at: new Date().toISOString() },
    ];
    sysCategories.forEach((c) => this.categories.set(c.id, c));

    // 3. Wallets for starterUser
    const wBca: Wallet = {
      id: 'wallet-bca',
      user_id: starterUser.id,
      name: 'BCA Utama',
      balance: 4500000,
      is_default: true,
      icon: 'landmark',
      color: '#0060af',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const wCash: Wallet = {
      id: 'wallet-cash',
      user_id: starterUser.id,
      name: 'Dompet Tunai',
      balance: 485000,
      is_default: false,
      icon: 'wallet',
      color: '#10b981',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const wGopay: Wallet = {
      id: 'wallet-gopay',
      user_id: starterUser.id,
      name: 'GoPay',
      balance: 215000,
      is_default: false,
      icon: 'smartphone',
      color: '#00aed6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const wMandiri: Wallet = {
      id: 'wallet-mandiri',
      user_id: starterUser.id,
      name: 'Mandiri Tabungan',
      balance: 2500000,
      is_default: false,
      icon: 'building',
      color: '#0284c7',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const wOvo: Wallet = {
      id: 'wallet-ovo',
      user_id: starterUser.id,
      name: 'OVO',
      balance: 350000,
      is_default: false,
      icon: 'smartphone',
      color: '#8b5cf6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.wallets.set(wBca.id, wBca);
    this.wallets.set(wCash.id, wCash);
    this.wallets.set(wGopay.id, wGopay);
    this.wallets.set(wMandiri.id, wMandiri);
    this.wallets.set(wOvo.id, wOvo);

    // Bunga's Wallets
    const wBcaBunga: Wallet = { ...wBca, id: 'w_bca', user_id: bungaUser.id, userId: bungaUser.id, name: 'BCA Prioritas', balance: 14250000 };
    const wCashBunga: Wallet = { ...wCash, id: 'w_cash', user_id: bungaUser.id, userId: bungaUser.id, name: 'Dompet Tunai', balance: 450000 };
    const wGopayBunga: Wallet = { ...wGopay, id: 'w_gopay', user_id: bungaUser.id, userId: bungaUser.id, name: 'GoPay', balance: 320000 };
    const wMandiriBunga: Wallet = { id: 'w_mandiri', user_id: bungaUser.id, userId: bungaUser.id, name: 'Mandiri Tabungan', balance: 8500000, is_default: false, isDefault: false, icon: 'building', colorHex: '#0284c7', color: '#0284c7', created_at: new Date().toISOString() };
    const wOvoBunga: Wallet = { id: 'w_ovo', user_id: bungaUser.id, userId: bungaUser.id, name: 'OVO', balance: 500000, is_default: false, isDefault: false, icon: 'smartphone', colorHex: '#8b5cf6', color: '#8b5cf6', created_at: new Date().toISOString() };
    this.wallets.set(wBcaBunga.id, wBcaBunga);
    this.wallets.set(wCashBunga.id, wCashBunga);
    this.wallets.set(wGopayBunga.id, wGopayBunga);
    this.wallets.set(wMandiriBunga.id, wMandiriBunga);
    this.wallets.set(wOvoBunga.id, wOvoBunga);

    // 4. Budgets for starterUser
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const bFood: Budget = {
      id: 'budget-01',
      user_id: starterUser.id,
      category_id: 'cat-01',
      monthly_amount: 2000000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 1250000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bTransport: Budget = {
      id: 'budget-02',
      user_id: starterUser.id,
      category_id: 'cat-02',
      monthly_amount: 600000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 350000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bEntertainment: Budget = {
      id: 'budget-03',
      user_id: starterUser.id,
      category_id: 'cat-03',
      monthly_amount: 350000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 240000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bBill: Budget = {
      id: 'budget-04',
      user_id: starterUser.id,
      category_id: 'cat-04',
      monthly_amount: 500000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 485000,
      alert_80_sent: true,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bHealth: Budget = {
      id: 'budget-05',
      user_id: starterUser.id,
      category_id: 'cat-05',
      monthly_amount: 500000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 210000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bGroceries: Budget = {
      id: 'budget-06',
      user_id: starterUser.id,
      category_id: 'cat-06',
      monthly_amount: 1200000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 750000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bEdu: Budget = {
      id: 'budget-07',
      user_id: starterUser.id,
      category_id: 'cat-07',
      monthly_amount: 400000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 180000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bCoffee: Budget = {
      id: 'budget-11',
      user_id: starterUser.id,
      category_id: 'cat-11',
      monthly_amount: 450000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 320000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bOjol: Budget = {
      id: 'budget-12',
      user_id: starterUser.id,
      category_id: 'cat-12',
      monthly_amount: 400000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 180000,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bWifi: Budget = {
      id: 'budget-13',
      user_id: starterUser.id,
      category_id: 'cat-13',
      monthly_amount: 450000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 400000,
      alert_80_sent: true,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const bStream: Budget = {
      id: 'budget-15',
      user_id: starterUser.id,
      category_id: 'cat-15',
      monthly_amount: 150000,
      month: currentMonth,
      year: currentYear,
      spent_amount: 150000,
      alert_80_sent: true,
      alert_100_sent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    [bFood, bTransport, bEntertainment, bBill, bHealth, bGroceries, bEdu, bCoffee, bOjol, bWifi, bStream].forEach(b => {
      this.budgets.set(b.id, b);
      const bungaBudget: Budget = { ...b, id: `${b.id}-bunga`, user_id: bungaUser.id, userId: bungaUser.id };
      this.budgets.set(bungaBudget.id, bungaBudget);
    });

    // 5. Sample Transactions
    const tx1: Transaction = {
      id: 'tx-001',
      user_id: starterUser.id,
      wallet_id: wBca.id,
      category_id: 'cat-08',
      type: 'income',
      amount: 6500000,
      notes: 'Gaji Bulanan PT Maju Jaya',
      transaction_date: new Date(Date.now() - 5 * 86400000).toISOString(),
      source: 'web_manual',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    };
    const tx2: Transaction = {
      id: 'tx-002',
      user_id: starterUser.id,
      wallet_id: wBca.id,
      category_id: 'cat-01',
      type: 'expense',
      amount: 45000,
      notes: 'Makan siang nasi padang + es teh',
      transaction_date: new Date(Date.now() - 2 * 86400000).toISOString(),
      source: 'telegram_text',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    const tx3: Transaction = {
      id: 'tx-003',
      user_id: starterUser.id,
      wallet_id: wGopay.id,
      category_id: 'cat-02',
      type: 'expense',
      amount: 25000,
      notes: 'Gojek ke kantor',
      transaction_date: new Date(Date.now() - 1 * 86400000).toISOString(),
      source: 'telegram_text',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    };
    const tx4: Transaction = {
      id: 'tx-004',
      user_id: starterUser.id,
      wallet_id: wBca.id,
      category_id: 'cat-06',
      type: 'expense',
      amount: 175000,
      notes: 'Belanja supermarket mingguan',
      transaction_date: new Date().toISOString(),
      source: 'telegram_receipt',
      receipt_image_url: 'https://images.unsplash.com/photo-1554415707-9e49fe0488b1?w=400&auto=format&fit=crop&q=80',
      receipt_items: [
        { item_name: 'Beras Premium 5kg', price: 75000, category_name: 'Belanja' },
        { item_name: 'Minyak Goreng 2L', price: 35000, category_name: 'Belanja' },
        { item_name: 'Daging Ayam 1kg', price: 40000, category_name: 'Makanan & Minuman' },
        { item_name: 'Telur Ayam 1kg', price: 25000, category_name: 'Makanan & Minuman' },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.transactions.set(tx1.id, tx1);
    this.transactions.set(tx2.id, tx2);
    this.transactions.set(tx3.id, tx3);
    this.transactions.set(tx4.id, tx4);

    // Seed transactions for Bunga Putri (usr_bunga_01)
    const tx1Bunga: Transaction = {
      ...tx1,
      id: 'tx-bunga-001',
      user_id: bungaUser.id,
      userId: bungaUser.id,
      wallet_id: 'w_bca',
    };
    const tx2Bunga: Transaction = {
      ...tx2,
      id: 'tx-bunga-002',
      user_id: bungaUser.id,
      userId: bungaUser.id,
      wallet_id: 'w_bca',
    };
    const tx3Bunga: Transaction = {
      ...tx3,
      id: 'tx-bunga-003',
      user_id: bungaUser.id,
      userId: bungaUser.id,
      wallet_id: 'w_gopay',
    };
    const tx4Bunga: Transaction = {
      ...tx4,
      id: 'tx-bunga-004',
      user_id: bungaUser.id,
      userId: bungaUser.id,
      wallet_id: 'w_bca',
    };
    this.transactions.set(tx1Bunga.id, tx1Bunga);
    this.transactions.set(tx2Bunga.id, tx2Bunga);
    this.transactions.set(tx3Bunga.id, tx3Bunga);
    this.transactions.set(tx4Bunga.id, tx4Bunga);

    // 6. AI Providers
    const geminiP: AIProviderConfig = {
      id: 'p-gemini',
      name: 'gemini',
      display_name: 'Google Gemini (Flash 1.5/2.5)',
      api_key_encrypted: 'AIzaSy_mock_key_gemini_active',
      is_active: true,
      priority: 1,
      model_text: 'gemini-1.5-flash',
      model_vision: 'gemini-1.5-flash',
      model_audio: 'gemini-1.5-flash',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const openaiP: AIProviderConfig = {
      id: 'p-openai',
      name: 'openai',
      display_name: 'OpenAI (GPT-4o / Whisper)',
      api_key_encrypted: 'sk_mock_key_openai',
      is_active: true,
      priority: 2,
      model_text: 'gpt-4o-mini',
      model_vision: 'gpt-4o',
      model_audio: 'whisper-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const deepseekP: AIProviderConfig = {
      id: 'p-deepseek',
      name: 'deepseek',
      display_name: 'DeepSeek (V3 / R1)',
      api_key_encrypted: 'dsk_mock_key_deepseek',
      is_active: true,
      priority: 3,
      model_text: 'deepseek-chat',
      model_vision: 'deepseek-chat',
      model_audio: 'none',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.aiProviders.set(geminiP.name, geminiP);
    this.aiProviders.set(openaiP.name, openaiP);
    this.aiProviders.set(deepseekP.name, deepseekP);

    // 7. AI Logs
    this.aiLogs.push({
      id: 'ailog-01',
      provider: 'gemini',
      feature: 'telegram_text',
      prompt_tokens: 120,
      completion_tokens: 45,
      latency_ms: 320,
      status: 'success',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    });
    this.aiLogs.push({
      id: 'ailog-02',
      provider: 'gemini',
      feature: 'telegram_receipt',
      prompt_tokens: 850,
      completion_tokens: 180,
      latency_ms: 980,
      status: 'success',
      created_at: new Date(Date.now() - 1800000).toISOString(),
    });

    // 8. Reminders
    this.reminders.set(starterUser.id, {
      id: 'rem-01',
      user_id: starterUser.id,
      is_active: true,
      frequency: '2x',
      time_1: '12:00',
      time_2: '20:00',
      boost_mode: false,
      boost_minutes: 10,
      boost_level: 0,
      boostLevel: 0,
      last_sent_at: new Date(Date.now() - 43200000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.reminders.set(budiUser.id, {
      id: 'rem-budi',
      user_id: budiUser.id,
      is_active: true,
      frequency: '2x',
      time_1: '12:00',
      time_2: '20:00',
      boost_mode: false,
      boost_minutes: 10,
      boost_level: 0,
      boostLevel: 0,
      last_sent_at: new Date(Date.now() - 43200000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 9. Payments
    this.payments.set('pay-001', {
      id: 'pay-001',
      user_id: proUser.id,
      order_id: 'TATADANA-PRO-172800001',
      amount: 99000,
      plan: 'pro',
      status: 'success',
      payment_type: 'qris',
      midtrans_transaction_id: 'mid-txn-991823',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      user: proUser,
    });

    this.payments.set('pay-002', {
      id: 'pay-002',
      user_id: starterUser.id,
      order_id: 'TATADANA-PRO-172800002',
      amount: 99000,
      plan: 'pro',
      status: 'pending',
      payment_type: 'manual_transfer',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      user: starterUser,
    });

    this.payments.set('pay-003', {
      id: 'pay-003',
      user_id: 'usr_citra_02',
      order_id: 'TATADANA-PRO-172800003',
      amount: 99000,
      plan: 'pro',
      status: 'pending',
      payment_type: 'manual_transfer',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      user: { ...starterUser, id: 'usr_citra_02', full_name: 'Citra Kirana', phone_number: '081299887766' },
    });

    this.payments.set('pay-004', {
      id: 'pay-004',
      user_id: 'usr_dimas_04',
      order_id: 'TATADANA-PRO-172800004',
      amount: 99000,
      plan: 'pro',
      status: 'pending',
      payment_type: 'bca_va',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: { ...starterUser, id: 'usr_dimas_04', full_name: 'Dimas Wicaksono', phone_number: '081388776655' },
    });

    // 10. Seed Default Recurring Bills
    const rec1: RecurringBill = {
      id: 'rec_01',
      userId: budiUser.id,
      user_id: budiUser.id,
      name: 'Tagihan Listrik PLN',
      amount: 650000,
      category_id: 'cat-04',
      categoryId: 'cat-04',
      due_date: '20',
      dueDate: '20',
      frequency: 'monthly',
      status: 'active',
      notes: 'Jatuh tempo setiap tanggal 20',
      created_at: new Date().toISOString(),
    };
    const rec2: RecurringBill = {
      id: 'rec_02',
      userId: budiUser.id,
      user_id: budiUser.id,
      name: 'Internet & TV Kabel IndiHome',
      amount: 385000,
      category_id: 'cat-04',
      categoryId: 'cat-04',
      due_date: '15',
      dueDate: '15',
      frequency: 'monthly',
      status: 'active',
      notes: 'Pembayaran rutin tanggal 15',
      created_at: new Date().toISOString(),
    };
    const rec3: RecurringBill = {
      id: 'rec_03',
      userId: budiUser.id,
      user_id: budiUser.id,
      name: 'Langganan Spotify & Netflix',
      amount: 189000,
      category_id: 'cat-03',
      categoryId: 'cat-03',
      due_date: '05',
      dueDate: '05',
      frequency: 'monthly',
      status: 'paid',
      notes: 'Auto debit tanggal 5',
      created_at: new Date().toISOString(),
    };

    [rec1, rec2, rec3].forEach((r) => {
      this.recurringBills.set(r.id, r);
      const bungaRec: RecurringBill = { ...r, id: `${r.id}-bunga`, userId: bungaUser.id, user_id: bungaUser.id };
      this.recurringBills.set(bungaRec.id, bungaRec);
      const starterRec: RecurringBill = { ...r, id: `${r.id}-starter`, userId: starterUser.id, user_id: starterUser.id };
      this.recurringBills.set(starterRec.id, starterRec);
    });

    // Build secondary query indexes
    this.buildQueryIndexes();
  }

  buildQueryIndexes() {
    this.userTxIndex.clear();
    this.userWalletIndex.clear();
    this.userBudgetIndex.clear();
    this.telegramChatIndex.clear();
    this.phoneIndex.clear();

    for (const [id, p] of this.profiles.entries()) {
      const chatId = p.telegram_chat_id || p.telegramChatId;
      if (chatId) this.telegramChatIndex.set(chatId, id);
      const rawPhone = p.phone_number || p.phoneNumber || '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone) this.phoneIndex.set(cleanPhone, id);
    }

    for (const [id, w] of this.wallets.entries()) {
      const uId = w.user_id || w.userId;
      if (uId) {
        const list = this.userWalletIndex.get(uId) || [];
        list.push(id);
        this.userWalletIndex.set(uId, list);
      }
    }

    for (const [id, b] of this.budgets.entries()) {
      const uId = b.user_id || b.userId;
      if (uId) {
        const key = `${uId}:${b.month || ''}:${b.year || ''}`;
        const list = this.userBudgetIndex.get(key) || [];
        list.push(id);
        this.userBudgetIndex.set(key, list);
      }
    }

    for (const [id, t] of this.transactions.entries()) {
      const uId = t.user_id || t.userId;
      if (uId) {
        const list = this.userTxIndex.get(uId) || [];
        list.push(id);
        this.userTxIndex.set(uId, list);
      }
    }
  }

  // Transaction insertion with automatic wallet balance recalculation and index maintenance
  addTransaction(tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Transaction {
    const id = tx.id || ('tx-' + Math.random().toString(36).substring(2, 9));
    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...tx,
      id,
      created_at: now,
      updated_at: now,
    };

    // Update wallet balance
    const walletId = tx.wallet_id || tx.walletId;
    const wallet = walletId ? this.wallets.get(walletId) : undefined;
    if (wallet) {
      if (tx.type === 'income') {
        wallet.balance += tx.amount;
      } else if (tx.type === 'expense') {
        wallet.balance -= tx.amount;
      } else if (tx.type === 'transfer') {
        const toWalletId = tx.to_wallet_id || tx.destinationWalletId;
        if (toWalletId) {
          wallet.balance -= tx.amount;
          const toWallet = this.wallets.get(toWalletId);
          if (toWallet) {
            toWallet.balance += tx.amount;
            toWallet.updated_at = now;
          }
        }
      }
      wallet.updated_at = now;
    }

    // Update budget spent amount and alert thresholds if expense
    if (tx.type === 'expense') {
      const catId = tx.category_id || tx.categoryId;
      const uId = tx.user_id || tx.userId;
      if (catId && uId) {
        for (const b of this.budgets.values()) {
          if ((b.user_id === uId || b.userId === uId) && (b.category_id === catId || b.categoryId === catId)) {
            b.spent_amount = (b.spent_amount || 0) + tx.amount;
            b.spentAmount = (b.spentAmount || 0) + tx.amount;
            const monthly = b.monthly_amount || b.monthlyAmount || 0;
            if (monthly > 0) {
              const ratio = b.spent_amount / monthly;
              if (ratio >= 1.0) {
                b.alert_100_sent = true;
                b.alert_80_sent = true;
              } else if (ratio >= 0.8) {
                b.alert_80_sent = true;
              }
            }
            b.updated_at = now;
            break;
          }
        }
      }
    }

    this.transactions.set(id, newTx);
    // Invalidate user cache and update secondary index
    const uId = tx.user_id || tx.userId;
    if (uId) {
      this.userTxCache.delete(uId);
      const list = this.userTxIndex.get(uId) || [];
      list.unshift(id);
      this.userTxIndex.set(uId, list);
    }
    fastCache.invalidatePrefix('txs:');
    fastCache.invalidatePrefix('budgets:');
    fastCache.invalidatePrefix('wallets:');

    return newTx;
  }

  getTransactionsByUser(userId: string): Transaction[] {
    const cached = this.userTxCache.get(userId);
    if (cached) return cached;

    const list: Transaction[] = [];
    const indexedIds = this.userTxIndex.get(userId);

    const txSource = indexedIds && indexedIds.length > 0
      ? indexedIds.map((id) => this.transactions.get(id)!).filter(Boolean)
      : Array.from(this.transactions.values()).filter((tx) => (tx.user_id || tx.userId) === userId);

    for (const tx of txSource) {
      const wId = tx.wallet_id || tx.walletId;
      const toWId = tx.to_wallet_id || tx.destinationWalletId;
      const catId = tx.category_id || tx.categoryId;
      const fullTx: Transaction = {
        ...tx,
        wallet: wId ? this.wallets.get(wId) : undefined,
        to_wallet: toWId ? this.wallets.get(toWId) : undefined,
        category: catId ? this.categories.get(catId) : undefined,
      };
      list.push(fullTx);
    }
    const sorted = list.sort((a, b) => new Date(b.transaction_date || b.transactionDate || '').getTime() - new Date(a.transaction_date || a.transactionDate || '').getTime());
    this.userTxCache.set(userId, sorted);
    return sorted;
  }

  getWalletsByUser(userId: string): Wallet[] {
    const indexedWalletIds = this.userWalletIndex.get(userId);
    if (indexedWalletIds && indexedWalletIds.length > 0) {
      return indexedWalletIds.map((id) => this.wallets.get(id)!).filter(Boolean);
    }
    const list: Wallet[] = [];
    for (const w of Array.from(this.wallets.values())) {
      if ((w.user_id || w.userId) === userId) list.push(w);
    }
    return list;
  }

  getDefaultWallet(userId: string): Wallet | undefined {
    const userWallets = this.getWalletsByUser(userId);
    return userWallets.find((w) => w.is_default || w.isDefault) || userWallets[0];
  }

  getCategoriesByUser(userId: string): Category[] {
    const list: Category[] = [];
    for (const c of Array.from(this.categories.values())) {
      if (c.is_system || (c.user_id || c.userId) === userId) list.push(c);
    }
    return list;
  }

  getBudgetsByUser(userId: string, month: number, year: number): Budget[] {
    const list: Budget[] = [];
    for (const b of Array.from(this.budgets.values())) {
      if ((b.user_id || b.userId) === userId && (b.month === month || !b.month) && (b.year === year || !b.year)) {
        const catId = b.category_id || b.categoryId;
        const cat = catId ? this.categories.get(catId) : undefined;
        list.push({ ...b, category: cat });
      }
    }
    return list;
  }

  findProfileByTelegramChatId(chatId: number): UserProfile | undefined {
    const indexedUserId = this.telegramChatIndex.get(chatId);
    if (indexedUserId) return this.profiles.get(indexedUserId);

    for (const p of Array.from(this.profiles.values())) {
      if ((p.telegram_chat_id || p.telegramChatId) === chatId) return p;
    }
    return undefined;
  }

  findProfileByPhone(phone: string): UserProfile | undefined {
    const cleanPhone = phone.replace(/\D/g, '');
    const indexedUserId = this.phoneIndex.get(cleanPhone);
    if (indexedUserId) return this.profiles.get(indexedUserId);

    for (const p of Array.from(this.profiles.values())) {
      const pPhone = p.phone_number || p.phoneNumber || '';
      const pClean = pPhone.replace(/\D/g, '');
      if (pClean && (pClean === cleanPhone || pClean.endsWith(cleanPhone) || cleanPhone.endsWith(pClean))) {
        return p;
      }
    }
    return undefined;
  }

  getIndexStats(): {
    userTxIndexSize: number;
    userWalletIndexSize: number;
    telegramChatIndexSize: number;
    phoneIndexSize: number;
    totalTransactionsIndexed: number;
  } {
    let totalTxIndexed = 0;
    for (const list of this.userTxIndex.values()) totalTxIndexed += list.length;
    return {
      userTxIndexSize: this.userTxIndex.size,
      userWalletIndexSize: this.userWalletIndex.size,
      telegramChatIndexSize: this.telegramChatIndex.size,
      phoneIndexSize: this.phoneIndex.size,
      totalTransactionsIndexed: totalTxIndexed,
    };
  }

  getRecurringBillsByUser(userId: string): RecurringBill[] {
    const list: RecurringBill[] = [];
    for (const b of Array.from(this.recurringBills.values())) {
      if ((b.user_id || b.userId) === userId) {
        list.push(b);
      }
    }
    return list;
  }

  addRecurringBill(bill: RecurringBill): RecurringBill {
    const id = bill.id || ('rec_' + Date.now());
    const newBill: RecurringBill = {
      ...bill,
      id,
      created_at: bill.created_at || new Date().toISOString(),
    };
    this.recurringBills.set(id, newBill);
    return newBill;
  }

  getUserByEmail(email: string): UserProfile | undefined {
    if (!email) return undefined;
    const normalized = email.toLowerCase().trim();
    if (normalized === 'ungaaputrii@gmail.com' || normalized === 'ungaaputrii06@gmail.com') {
      return this.profiles.get('adm_unga_01');
    }
    for (const p of Array.from(this.profiles.values())) {
      if ((p.email || '').toLowerCase().trim() === normalized) {
        return p;
      }
    }
    return undefined;
  }

  approveUserRegistration(userId: string, adminId: string = 'adm_unga_01'): UserProfile | null {
    const user = this.profiles.get(userId);
    if (!user) return null;
    user.status = 'approved';
    user.approval_status = 'approved';
    user.updated_at = new Date().toISOString();

    const auditId = 'aud-' + Math.random().toString(36).substring(2, 9);
    this.auditLogs.unshift({
      id: auditId,
      admin_id: adminId,
      action: 'APPROVE_USER_REGISTRATION',
      target_user_id: user.id,
      details: {
        userId: user.id,
        userName: user.full_name,
        email: user.email,
        approvedBy: 'Unga Putri (Superadmin)',
      },
      created_at: new Date().toISOString(),
    });

    return user;
  }

  rejectUserRegistration(userId: string, adminId: string = 'adm_unga_01'): UserProfile | null {
    const user = this.profiles.get(userId);
    if (!user) return null;
    user.status = 'rejected';
    user.approval_status = 'rejected';
    user.updated_at = new Date().toISOString();

    const auditId = 'aud-' + Math.random().toString(36).substring(2, 9);
    this.auditLogs.unshift({
      id: auditId,
      admin_id: adminId,
      action: 'REJECT_USER_REGISTRATION',
      target_user_id: user.id,
      details: {
        userId: user.id,
        userName: user.full_name,
        email: user.email,
        rejectedBy: 'Unga Putri (Superadmin)',
      },
      created_at: new Date().toISOString(),
    });

    return user;
  }

  registerUser(userData: Partial<UserProfile>): UserProfile {
    const id = userData.id || 'usr_' + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();
    const cleanPhone = (userData.phone_number || userData.phoneNumber || '').replace(/\D/g, '');
    const user: UserProfile = {
      id,
      phone_number: cleanPhone || userData.phone_number || userData.phoneNumber,
      phoneNumber: cleanPhone || userData.phoneNumber || userData.phone_number,
      full_name: userData.full_name || userData.fullName || `User ${cleanPhone.slice(-4) || 'Baru'}`,
      fullName: userData.fullName || userData.full_name || `User ${cleanPhone.slice(-4) || 'Baru'}`,
      name: userData.full_name || userData.fullName || `User ${cleanPhone.slice(-4) || 'Baru'}`,
      email: userData.email,
      default_currency: 'IDR',
      role: 'user',
      plan: userData.plan || 'starter',
      subscriptionPlan: userData.subscriptionPlan || userData.plan || 'starter',
      status: userData.status || 'approved',
      approval_status: userData.approval_status || (userData.status === 'pending' || userData.status === 'rejected' ? userData.status : 'approved'),
      telegram_connection_status: 'disconnected',
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

    this.profiles.set(user.id, user);
    if (cleanPhone) {
      this.phoneIndex.set(cleanPhone, user.id);
    }

    // Default wallet
    const defaultWallet: Wallet = {
      id: 'wallet-' + Math.random().toString(36).substring(2, 9),
      user_id: user.id,
      userId: user.id,
      name: 'Dompet Utama',
      balance: 0,
      is_default: true,
      isDefault: true,
      icon: 'wallet',
      color: '#f97316',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.wallets.set(defaultWallet.id, defaultWallet);
    this.userWalletIndex.set(user.id, [defaultWallet.id]);

    // Audit log
    const auditId = 'aud-' + Math.random().toString(36).substring(2, 9);
    this.auditLogs.unshift({
      id: auditId,
      admin_id: 'system',
      action: 'USER_REGISTER_WHATSAPP_VERIFIED',
      target_user_id: user.id,
      details: {
        userId: user.id,
        userName: user.full_name,
        email: user.email,
        phone: user.phone_number,
        whatsapp_verified: true,
      },
      created_at: nowIso,
    });

    return user;
  }
}

const globalForMockStore = globalThis as unknown as {
  mockStore: MockStore | undefined;
};

export const mockStore = globalForMockStore.mockStore ?? new MockStore();
globalForMockStore.mockStore = mockStore;
