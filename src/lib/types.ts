// ==========================================================
// TATADANA UNIFIED TYPE DEFINITIONS
// ==========================================================

export type UserRole = 'user' | 'admin' | 'superadmin';
export type SubscriptionPlan = 'starter' | 'pro';
export type TelegramConnectionStatus = 'connected' | 'disconnected' | 'testing';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionSource = 'web' | 'web_manual' | 'telegram_text' | 'telegram_photo' | 'telegram_receipt' | 'telegram_voice';
export type CategoryType = 'income' | 'expense';
export type WalletType = 'cash' | 'bank' | 'ewallet' | 'investment' | 'other';
export type PaymentStatus = 'pending' | 'settlement' | 'success' | 'failed' | 'manual_pending' | 'approved_manual' | 'rejected' | 'rejected_manual';

// AI Multi-Provider types
export type AIProviderName = 'gemini' | 'openai' | 'deepseek';
export type AIMode = 'single' | 'failover' | 'parallel_failover';
export type AIFeature = 'text_parser' | 'vision_receipt' | 'speech_transcribe' | 'financial_advisor' | 'telegram_text' | 'telegram_receipt' | 'telegram_voice' | 'onboarding_category';

export interface UserProfile {
  id: string;
  email?: string;
  phone_number?: string;
  phoneNumber?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  avatar_url?: string;
  avatarUrl?: string;
  default_currency?: string;
  defaultCurrency?: string;
  role?: UserRole;
  plan?: SubscriptionPlan;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled';
  plan_expires_at?: string;
  telegram_user_id?: number;
  telegramUserId?: number;
  telegram_username?: string;
  telegramUsername?: string;
  telegram_chat_id?: number;
  telegramChatId?: number;
  telegram_bot_token?: string;
  telegramBotToken?: string;
  telegram_connection_status?: TelegramConnectionStatus;
  telegram_connected?: boolean;
  telegramConnected?: boolean;
  is_phone_verified?: boolean;
  phoneVerified?: boolean;
  is_whatsapp_verified?: boolean;
  whatsapp_verified?: boolean;
  whatsappVerified?: boolean;
  transactionsThisMonth?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'active';
  approval_status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  createdAt?: string;
  registration_date?: string;
  updated_at?: string;
  wallets?: Wallet[];
  transactions?: Transaction[];
  total_balance?: number;
}

export type User = UserProfile;
export type UsersProfile = UserProfile;
export type Profile = UserProfile;

export interface Wallet {
  id: string;
  user_id?: string;
  userId?: string;
  name: string;
  type?: WalletType;
  balance: number;
  is_default?: boolean;
  isDefault?: boolean;
  icon?: string;
  color?: string;
  colorHex?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  userId?: string | null;
  name: string;
  type: CategoryType;
  emoji?: string;
  iconEmoji?: string;
  color?: string;
  colorHex?: string;
  is_system?: boolean;
  isCustom?: boolean;
  created_at?: string;
  createdAt?: string;
}

export interface Budget {
  id: string;
  user_id?: string;
  userId?: string;
  category_id?: string;
  categoryId?: string;
  categoryName?: string;
  categoryEmoji?: string;
  monthly_amount?: number;
  monthlyAmount?: number;
  month?: number;
  year?: number;
  monthYear?: string;
  spent_amount?: number;
  spentAmount?: number;
  alert_80_sent?: boolean;
  alert_100_sent?: boolean;
  period_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_date?: string;
  periodDate?: string;
  category?: Category;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface RecurringBill {
  id: string;
  user_id?: string;
  userId?: string;
  name: string;
  amount: number;
  category_id?: string;
  categoryId?: string;
  category?: Category;
  wallet_id?: string;
  walletId?: string;
  wallet?: Wallet;
  due_date: string;
  dueDate?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  status: 'active' | 'paused' | 'paid';
  notes?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface ReceiptItem {
  id?: string;
  transactionId?: string;
  transaction_id?: string;
  itemName?: string;
  item_name?: string;
  quantity?: number;
  price?: number;
  pricePerUnit?: number;
  totalPrice?: number;
  categoryId?: string;
  category_name?: string;
  categoryName?: string;
}

export type TransactionItem = ReceiptItem;

export interface Transaction {
  id: string;
  user_id?: string;
  userId?: string;
  wallet_id?: string;
  walletId?: string;
  walletName?: string;
  wallet_name?: string;
  wallet?: Wallet;
  to_wallet_id?: string | null;
  destinationWalletId?: string | null;
  destinationWalletName?: string;
  to_wallet?: Wallet;
  category_id?: string | null;
  categoryId?: string | null;
  categoryName?: string;
  category_name?: string;
  categoryEmoji?: string;
  category?: Category;
  type: TransactionType;
  amount: number;
  notes?: string;
  transaction_date?: string;
  transactionDate?: string;
  source?: TransactionSource;
  receipt_image_url?: string;
  receiptImageUrl?: string;
  voice_transcript?: string;
  voiceTranscript?: string;
  receipt_items?: ReceiptItem[];
  items?: ReceiptItem[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface ExportRecord {
  id: string;
  user_id?: string;
  userId?: string;
  file_name?: string;
  fileName?: string;
  file_type?: 'pdf' | 'xlsx' | 'csv';
  fileFormat?: 'pdf' | 'xlsx' | 'csv';
  storage_path?: string;
  download_url?: string;
  downloadUrl?: string;
  period_start?: string;
  periodStart?: string;
  period_end?: string;
  periodEnd?: string;
  totalRecords?: number;
  fileSizeBytes?: number;
  created_at?: string;
  createdAt?: string;
}

export type ExportHistoryItem = ExportRecord;
export type ExportHistory = ExportRecord;

export interface ReminderSetting {
  id?: string;
  user_id?: string;
  userId?: string;
  is_active?: boolean;
  isActive?: boolean;
  frequency: 1 | 2 | '1x' | '2x';
  time_1?: string;
  time1?: string;
  time_2?: string;
  time2?: string;
  boost_mode?: boolean;
  boostMode?: boolean;
  boost_minutes?: number;
  boostMinutes?: number;
  boost_level?: number;
  boostLevel?: number;
  last_sent_at?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export type ReminderConfig = ReminderSetting;

export interface PaymentRecord {
  id: string;
  user_id?: string;
  userId?: string;
  userName?: string;
  order_id?: string;
  orderId?: string;
  amount: number;
  plan: SubscriptionPlan;
  status: PaymentStatus;
  payment_type?: string;
  paymentMethod?: string;
  midtrans_transaction_id?: string;
  proof_image_url?: string;
  manualProofImage?: string;
  approved_by?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  user?: UserProfile;
}

export type MidtransPayment = PaymentRecord;
export type SubscriptionsMidtrans = PaymentRecord;

export interface AIProviderConfig {
  id: string;
  name: AIProviderName;
  display_name: string;
  displayName?: string;
  api_key_encrypted?: string;
  apiKeyMasked?: string;
  is_active: boolean;
  isActive?: boolean;
  priority: number;
  model_text?: string;
  model_vision?: string;
  model_audio?: string;
  modelName?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface AISettings {
  id: number | string;
  mode: AIMode;
  default_provider?: AIProviderName;
  active_provider_name?: AIProviderName;
  updated_at?: string;
}

export interface AILog {
  id: string;
  provider: string;
  providerName?: string;
  feature: AIFeature;
  endpointType?: 'text_parser' | 'vision_receipt' | 'speech_transcribe' | 'financial_advisor';
  userId?: string;
  user_id?: string;
  userName?: string;
  prompt?: string;
  prompt_text?: string;
  prompt_tokens: number;
  promptTokens?: number;
  completion_tokens: number;
  completionTokens?: number;
  costIdr?: number;
  latency_ms: number;
  latencyMs?: number;
  status: 'success' | 'failed' | 'fallback_triggered' | 'error';
  error_message?: string;
  errorMessage?: string;
  created_at: string;
  createdAt?: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  adminId?: string;
  adminName?: string;
  admin?: UserProfile;
  action: string;
  target_user_id?: string;
  targetUserId?: string;
  targetUserName?: string;
  details?: Record<string, unknown> | string;
  created_at: string;
  createdAt?: string;
}

export type AuditLog = AdminAuditLog;

// Telegram Structures
export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  category?: string;
  categoryName?: string;
  categoryEmoji?: string;
  notes: string;
  description?: string;
  wallet?: string;
  walletName?: string;
  walletKeyword?: string;
  confidence?: number;
  is_ambiguous?: boolean;
  isAmbiguous?: boolean;
  suggested_format?: string;
  errorMessage?: string;
  receipt_items?: ReceiptItem[];
  items?: ReceiptItem[];
  transcript?: string;
  destinationWalletName?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  username?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
  audio?: TelegramVoice;
  caption?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}
