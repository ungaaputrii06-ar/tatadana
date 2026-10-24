-- ==========================================================
-- TATADANA DATABASE INITIAL MIGRATION
-- Migration Version: 20241010000000_initial_schema.sql
-- Stack: Supabase PostgreSQL (Auth + Postgres + RLS + Triggers)
-- Timezone: Asia/Jakarta (WIB)
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) UNIQUE,
  full_name VARCHAR(100),
  avatar_url TEXT,
  default_currency VARCHAR(5) DEFAULT 'IDR',
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
  plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
  plan_expires_at TIMESTAMPTZ,
  telegram_chat_id BIGINT UNIQUE,
  telegram_bot_token TEXT, -- Encrypted bot token if user custom bot
  telegram_connection_status VARCHAR(20) DEFAULT 'disconnected' CHECK (telegram_connection_status IN ('connected', 'disconnected', 'testing')),
  is_phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 2. WALLETS TABLE (Multi-wallet: Cash, BCA, Mandiri, GoPay, OVO, dll)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  balance NUMERIC(15, 2) DEFAULT 0.00,
  is_default BOOLEAN DEFAULT FALSE,
  icon VARCHAR(50) DEFAULT 'wallet',
  color VARCHAR(20) DEFAULT '#f97316',
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 3. CATEGORIES TABLE (Emoji, color, custom vs system)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means global system default
  name VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  emoji VARCHAR(10) DEFAULT '🏷️',
  color VARCHAR(20) DEFAULT '#f97316',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 4. BUDGETS TABLE (Budget bulanan per kategori & alert tracking)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  month INT NOT NULL, -- 1 to 12
  year INT NOT NULL,  -- e.g. 2026
  alert_80_sent BOOLEAN DEFAULT FALSE,
  alert_100_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  UNIQUE (user_id, category_id, month, year)
);

-- 5. TRANSACTIONS TABLE (Income, expense, transfer; receipt items multi-line support)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT, -- For transfer
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  transaction_date TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  source VARCHAR(20) DEFAULT 'web_manual' CHECK (source IN ('web_manual', 'telegram_text', 'telegram_receipt', 'telegram_voice')),
  receipt_image_url TEXT,
  receipt_items JSONB DEFAULT '[]'::jsonb, -- Array of { item_name: string, price: number, category_name: string }
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 6. EXPORT HISTORY TABLE (PDF & Excel generation tracking)
CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'xlsx')),
  storage_path TEXT,
  download_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 7. REMINDERS TABLE (Max 2x per day as per product policy)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  frequency VARCHAR(5) DEFAULT '1x' CHECK (frequency IN ('1x', '2x')),
  time_1 TIME DEFAULT '12:00',
  time_2 TIME DEFAULT '20:00',
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  UNIQUE (user_id)
);

-- 8. PAYMENTS TABLE (Midtrans & manual bank transfer)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id VARCHAR(100) UNIQUE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('starter', 'pro')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'manual_pending', 'rejected')),
  payment_type VARCHAR(50),
  midtrans_transaction_id VARCHAR(100),
  proof_image_url TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 9. AI CONFIGURATION & AUDIT TABLES
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'gemini', 'openai', 'deepseek'
  display_name VARCHAR(100) NOT NULL,
  api_key_encrypted TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 1,
  model_text VARCHAR(100) DEFAULT 'gemini-1.5-flash',
  model_vision VARCHAR(100) DEFAULT 'gemini-1.5-flash',
  model_audio VARCHAR(100) DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id INT PRIMARY KEY DEFAULT 1,
  mode VARCHAR(30) DEFAULT 'single' CHECK (mode IN ('single', 'parallel_failover')),
  default_provider VARCHAR(50) DEFAULT 'gemini',
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  feature VARCHAR(50) NOT NULL, -- 'telegram_text', 'telegram_receipt', 'telegram_voice', 'onboarding_category', 'financial_advisor'
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 10. TELEGRAM WEBHOOK DEDUPLICATION LOGS (Idempotency)
CREATE TABLE IF NOT EXISTS public.telegram_webhook_logs (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  command_or_text TEXT,
  processed_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  raw_payload JSONB
);

-- 11. ADMIN AUDIT LOGS (Privacy protection when admin accesses user data)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- ==========================================================
-- TRIGGERS & AUTOMATION: WALLET BALANCE UPDATES
-- ==========================================================
CREATE OR REPLACE FUNCTION public.update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.type = 'income') THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id;
    ELSIF (NEW.type = 'expense') THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id;
    ELSIF (NEW.type = 'transfer') THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id;
      IF NEW.to_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.to_wallet_id;
      END IF;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.type = 'income') THEN
      UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.wallet_id;
    ELSIF (OLD.type = 'expense') THEN
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.wallet_id;
    ELSIF (OLD.type = 'transfer') THEN
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.wallet_id;
      IF OLD.to_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.to_wallet_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.transactions;
CREATE TRIGGER trg_update_wallet_balance
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance_on_transaction();

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage own wallets" ON public.wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view system and own categories" ON public.categories FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own exports" ON public.export_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- ==========================================================
-- SEED INITIAL SYSTEM CATEGORIES & PROVIDERS
-- ==========================================================
INSERT INTO public.categories (id, user_id, name, type, emoji, color, is_system)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Makanan & Minuman', 'expense', '🍜', '#f97316', TRUE),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Transportasi', 'expense', '🚗', '#3b82f6', TRUE),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Hiburan', 'expense', '🎮', '#a855f7', TRUE),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Tagihan & Utilitas', 'expense', '🏠', '#ef4444', TRUE),
  ('00000000-0000-0000-0000-000000000005', NULL, 'Kesehatan', 'expense', '💊', '#10b981', TRUE),
  ('00000000-0000-0000-0000-000000000006', NULL, 'Belanja', 'expense', '👕', '#ec4899', TRUE),
  ('00000000-0000-0000-0000-000000000007', NULL, 'Pendidikan', 'expense', '📚', '#6366f1', TRUE),
  ('00000000-0000-0000-0000-000000000008', NULL, 'Gaji & Upah', 'income', '💰', '#22c55e', TRUE),
  ('00000000-0000-0000-0000-000000000009', NULL, 'Freelance & Side Hustle', 'income', '💻', '#14b8a6', TRUE),
  ('00000000-0000-0000-0000-000000000010', NULL, 'Investasi & Bunga', 'income', '📈', '#f59e0b', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ai_providers (id, name, display_name, is_active, priority, model_text, model_vision, model_audio)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'gemini', 'Google Gemini', TRUE, 1, 'gemini-1.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash'),
  ('22222222-2222-2222-2222-222222222222', 'openai', 'OpenAI (GPT-4o / Whisper)', TRUE, 2, 'gpt-4o-mini', 'gpt-4o', 'whisper-1'),
  ('33333333-3333-3333-3333-333333333333', 'deepseek', 'DeepSeek (V3 / R1)', TRUE, 3, 'deepseek-chat', 'deepseek-chat', 'none')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ai_settings (id, mode, default_provider)
VALUES (1, 'single', 'gemini')
ON CONFLICT (id) DO NOTHING;
