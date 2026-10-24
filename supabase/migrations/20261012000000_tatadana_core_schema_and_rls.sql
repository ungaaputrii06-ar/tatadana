-- ==============================================================================
-- Migration: 20261012000000_tatadana_core_schema_and_rls.sql
-- Description: Core Schema Harmonization, Row Level Security (RLS) & Trigger Automation
-- Database: PostgreSQL 15+ / Supabase
-- Timezone: Asia/Jakarta (WIB, UTC+7)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE 1: USERS (with profiles & users_profile alias/view)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  phone_number VARCHAR(20) UNIQUE,
  phone_verified BOOLEAN DEFAULT FALSE,
  is_phone_verified BOOLEAN DEFAULT FALSE,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT,
  default_currency VARCHAR(10) DEFAULT 'IDR',
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
  subscription_plan VARCHAR(20) DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'pro')),
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled')),
  plan_expires_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  telegram_user_id BIGINT UNIQUE,
  telegram_username VARCHAR(100),
  telegram_chat_id BIGINT UNIQUE,
  telegram_connected BOOLEAN DEFAULT FALSE,
  telegram_bot_token TEXT,
  telegram_connection_status VARCHAR(20) DEFAULT 'disconnected' CHECK (telegram_connection_status IN ('connected', 'disconnected', 'testing')),
  transactions_this_month INT DEFAULT 0,
  month_cycle VARCHAR(7) DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM'),
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- Backfill from existing profiles or users_profile tables if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.users (
      id, phone_number, full_name, avatar_url, default_currency, role, plan,
      subscription_plan, plan_expires_at, telegram_chat_id, telegram_bot_token,
      telegram_connection_status, is_phone_verified, phone_verified, created_at, updated_at
    )
    SELECT
      id, phone_number, COALESCE(full_name, ''), avatar_url, COALESCE(default_currency, 'IDR'),
      COALESCE(role, 'user'), COALESCE(plan, 'starter'), COALESCE(plan, 'starter'),
      plan_expires_at, telegram_chat_id, telegram_bot_token,
      COALESCE(telegram_connection_status, 'disconnected'),
      COALESCE(is_phone_verified, false), COALESCE(is_phone_verified, false),
      COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
    FROM public.profiles
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users_profile') THEN
    INSERT INTO public.users (
      id, phone_number, full_name, avatar_url, default_currency, role, plan,
      subscription_plan, subscription_status, subscription_expires_at,
      telegram_chat_id, telegram_user_id, telegram_username, telegram_connected,
      telegram_connection_status, is_phone_verified, phone_verified, transactions_this_month,
      created_at, updated_at
    )
    SELECT
      id, phone_number, COALESCE(full_name, ''), avatar_url, COALESCE(default_currency, 'IDR'),
      COALESCE(role, 'user'), COALESCE(subscription_plan, 'starter'), COALESCE(subscription_plan, 'starter'),
      COALESCE(subscription_status, 'active'), subscription_expires_at,
      telegram_chat_id, telegram_user_id, telegram_username, COALESCE(telegram_connected, false),
      CASE WHEN telegram_connected THEN 'connected' ELSE 'disconnected' END,
      COALESCE(phone_verified, false), COALESCE(phone_verified, false),
      COALESCE(transactions_this_month, 0),
      COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
    FROM public.users_profile
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      subscription_plan = EXCLUDED.subscription_plan,
      subscription_status = EXCLUDED.subscription_status,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- Synchronize users with profiles & users_profile aliases/views
CREATE OR REPLACE FUNCTION public.sync_users_bidirectional()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
      INSERT INTO public.profiles (
        id, phone_number, full_name, avatar_url, default_currency, role, plan,
        plan_expires_at, telegram_chat_id, telegram_bot_token, telegram_connection_status,
        is_phone_verified, created_at, updated_at
      )
      VALUES (
        NEW.id, NEW.phone_number, NEW.full_name, NEW.avatar_url, NEW.default_currency,
        CASE WHEN NEW.role = 'admin' THEN 'superadmin' ELSE NEW.role END,
        NEW.plan, NEW.plan_expires_at, NEW.telegram_chat_id, NEW.telegram_bot_token,
        NEW.telegram_connection_status, NEW.is_phone_verified, NEW.created_at, NEW.updated_at
      )
      ON CONFLICT (id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        default_currency = EXCLUDED.default_currency,
        role = EXCLUDED.role,
        plan = EXCLUDED.plan,
        telegram_chat_id = EXCLUDED.telegram_chat_id,
        updated_at = NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users_profile') THEN
      INSERT INTO public.users_profile (
        id, phone_number, full_name, avatar_url, default_currency, role,
        subscription_plan, subscription_status, subscription_expires_at,
        telegram_user_id, telegram_username, telegram_chat_id, telegram_connected,
        phone_verified, transactions_this_month, created_at, updated_at
      )
      VALUES (
        NEW.id, NEW.phone_number, NEW.full_name, NEW.avatar_url, NEW.default_currency, NEW.role,
        NEW.subscription_plan, NEW.subscription_status, NEW.subscription_expires_at,
        NEW.telegram_user_id, NEW.telegram_username, NEW.telegram_chat_id, NEW.telegram_connected,
        NEW.phone_verified, NEW.transactions_this_month, NEW.created_at, NEW.updated_at
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        role = EXCLUDED.role,
        subscription_plan = EXCLUDED.subscription_plan,
        subscription_status = EXCLUDED.subscription_status,
        updated_at = NOW();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
      DELETE FROM public.profiles WHERE id = OLD.id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users_profile') THEN
      DELETE FROM public.users_profile WHERE id = OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_users_bidirectional ON public.users;
CREATE TRIGGER trg_sync_users_bidirectional
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_users_bidirectional();

-- Create updatable Views if profiles / users_profile are not physical tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM public.users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users_profile') THEN
    CREATE OR REPLACE VIEW public.users_profile AS SELECT * FROM public.users;
  END IF;
END $$;

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user record" ON public.users;
CREATE POLICY "Users can view own user record"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));

DROP POLICY IF EXISTS "Users can update own user record" ON public.users;
CREATE POLICY "Users can update own user record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins manage all user records" ON public.users;
CREATE POLICY "Admins manage all user records"
  ON public.users FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 2: WALLETS (Multi-wallet: Cash, BCA, Mandiri, GoPay, OVO, Tunai)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'bank' CHECK (type IN ('cash', 'bank', 'ewallet', 'investment', 'other')),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  is_default BOOLEAN DEFAULT FALSE,
  icon VARCHAR(50) DEFAULT 'wallet',
  color VARCHAR(20) DEFAULT '#2563EB',
  color_hex VARCHAR(20) DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- Ensure auxiliary columns exist
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'bank';
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#2563EB';
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20) DEFAULT '#2563EB';

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wallets" ON public.wallets;
CREATE POLICY "Users manage own wallets"
  ON public.wallets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all wallets" ON public.wallets;
CREATE POLICY "Admins view all wallets"
  ON public.wallets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 3: CATEGORIES (System default templates & user custom categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  emoji VARCHAR(10) DEFAULT '🏷️',
  icon_emoji VARCHAR(10) DEFAULT '🏷️',
  color VARCHAR(20) DEFAULT '#2563EB',
  color_hex VARCHAR(20) DEFAULT '#2563EB',
  is_system BOOLEAN DEFAULT FALSE,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS emoji VARCHAR(10) DEFAULT '🏷️';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon_emoji VARCHAR(10) DEFAULT '🏷️';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#2563EB';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20) DEFAULT '#2563EB';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view system and own categories" ON public.categories;
CREATE POLICY "Users view system and own categories"
  ON public.categories FOR SELECT
  USING (user_id IS NULL OR is_system = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own custom categories" ON public.categories;
CREATE POLICY "Users manage own custom categories"
  ON public.categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all categories" ON public.categories;
CREATE POLICY "Admins manage all categories"
  ON public.categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 4: TRANSACTIONS (Income, Expense, Transfer & Receipt Breakdown)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT,
  destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  transaction_date TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  source VARCHAR(30) DEFAULT 'web_manual' CHECK (source IN ('web', 'web_manual', 'telegram_text', 'telegram_photo', 'telegram_receipt', 'telegram_voice')),
  receipt_image_url TEXT,
  receipt_items JSONB DEFAULT '[]'::jsonb,
  voice_transcript TEXT,
  merchant_name VARCHAR(255),
  raw_ai_output JSONB,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS voice_transcript TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS raw_ai_output JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta');

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all transactions" ON public.transactions;
CREATE POLICY "Admins view all transactions"
  ON public.transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 5: BUDGETS (Multi-Period: Daily, Weekly, Monthly, Yearly)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  spent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  period_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_date DATE DEFAULT CURRENT_DATE,
  month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  month_year VARCHAR(7) DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM'),
  alert_80_sent BOOLEAN DEFAULT FALSE,
  alert_100_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly'));
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS spent_amount NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS month_year VARCHAR(7) DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM');

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, period_type);

-- Enable RLS on budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own budgets" ON public.budgets;
CREATE POLICY "Users manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all budgets" ON public.budgets;
CREATE POLICY "Admins view all budgets"
  ON public.budgets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 6: RECURRING_BILLS (Subscription & Recurring Payment Agenda)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  due_date VARCHAR(50) NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

CREATE INDEX IF NOT EXISTS idx_recurring_bills_user ON public.recurring_bills(user_id, status);

-- Enable RLS on recurring_bills
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recurring bills" ON public.recurring_bills;
CREATE POLICY "Users manage own recurring bills"
  ON public.recurring_bills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all recurring bills" ON public.recurring_bills;
CREATE POLICY "Admins view all recurring bills"
  ON public.recurring_bills FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 7: AI_LOGS (Telemetry, LLM Tokens, Latency & Failover Audit)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
  provider_name VARCHAR(50) DEFAULT 'gemini',
  feature VARCHAR(50) NOT NULL DEFAULT 'text_parser',
  endpoint_type VARCHAR(50) DEFAULT 'text_parser',
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost_idr NUMERIC(10, 4) DEFAULT 0,
  latency_ms INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'fallback_triggered', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS provider_name VARCHAR(50) DEFAULT 'gemini';
ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS endpoint_type VARCHAR(50) DEFAULT 'text_parser';
ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS cost_idr NUMERIC(10, 4) DEFAULT 0;

-- Explicitly ENABLE ROW LEVEL SECURITY on ai_logs
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ai logs" ON public.ai_logs;
CREATE POLICY "Users view own ai logs"
  ON public.ai_logs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));

DROP POLICY IF EXISTS "Authenticated users and services can insert ai logs" ON public.ai_logs;
CREATE POLICY "Authenticated users and services can insert ai logs"
  ON public.ai_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage all ai logs" ON public.ai_logs;
CREATE POLICY "Admins manage all ai logs"
  ON public.ai_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 8: EXPORT_RECORDS (PDF & Excel Download History Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.export_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'xlsx', 'csv')),
  file_format VARCHAR(10),
  storage_path TEXT,
  download_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_records INT DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- Backfill from export_history if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'export_history') THEN
    INSERT INTO public.export_records (
      id, user_id, file_name, file_type, file_format, storage_path, download_url,
      period_start, period_end, created_at
    )
    SELECT
      id, user_id, file_name, COALESCE(file_type, 'pdf'), COALESCE(file_type, 'pdf'),
      storage_path, download_url, period_start, period_end, created_at
    FROM public.export_history
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Synchronize export_records and export_history
CREATE OR REPLACE FUNCTION public.sync_export_records_bidirectional()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'export_history') THEN
      INSERT INTO public.export_history (
        id, user_id, file_name, file_type, storage_path, download_url, period_start, period_end, created_at
      )
      VALUES (
        NEW.id, NEW.user_id, NEW.file_name, NEW.file_type, NEW.storage_path, NEW.download_url, NEW.period_start, NEW.period_end, NEW.created_at
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'export_history') THEN
      DELETE FROM public.export_history WHERE id = OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_export_records ON public.export_records;
CREATE TRIGGER trg_sync_export_records
AFTER INSERT OR DELETE ON public.export_records
FOR EACH ROW EXECUTE FUNCTION public.sync_export_records_bidirectional();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'export_history') THEN
    CREATE OR REPLACE VIEW public.export_history AS SELECT * FROM public.export_records;
  END IF;
END $$;

-- Enable RLS on export_records
ALTER TABLE public.export_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own export records" ON public.export_records;
CREATE POLICY "Users manage own export records"
  ON public.export_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all export records" ON public.export_records;
CREATE POLICY "Admins view all export records"
  ON public.export_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 9: MIDTRANS_PAYMENTS (Midtrans & Manual Bank Transfer Approvals)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.midtrans_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id VARCHAR(100) UNIQUE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('starter', 'pro')),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'settlement', 'success', 'failed', 'manual_pending', 'approved_manual', 'rejected', 'rejected_manual', 'expired', 'cancel')),
  payment_type VARCHAR(50),
  payment_method VARCHAR(50),
  midtrans_transaction_id VARCHAR(100),
  proof_image_url TEXT,
  manual_proof_image TEXT,
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- Backfill from payments / subscriptions_midtrans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    INSERT INTO public.midtrans_payments (
      id, user_id, order_id, amount, plan, status, payment_type, midtrans_transaction_id,
      proof_image_url, approved_by, created_at, updated_at
    )
    SELECT
      id, user_id, order_id, amount, plan, status, payment_type, midtrans_transaction_id,
      proof_image_url, approved_by, created_at, updated_at
    FROM public.payments
    ON CONFLICT (order_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions_midtrans') THEN
    INSERT INTO public.midtrans_payments (
      id, user_id, order_id, amount, plan, status, payment_method, manual_proof_image,
      admin_notes, approved_by, created_at, updated_at
    )
    SELECT
      id, user_id, order_id, amount, plan, status, payment_method, manual_proof_image,
      admin_notes, approved_by, created_at, updated_at
    FROM public.subscriptions_midtrans
    ON CONFLICT (order_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = NOW();
  END IF;
END $$;

-- Synchronize midtrans_payments with subscriptions_midtrans and payments
CREATE OR REPLACE FUNCTION public.sync_midtrans_payments_bidirectional()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
      INSERT INTO public.payments (
        id, user_id, order_id, amount, plan, status, payment_type, midtrans_transaction_id,
        proof_image_url, approved_by, created_at, updated_at
      )
      VALUES (
        NEW.id, NEW.user_id, NEW.order_id, NEW.amount, NEW.plan, NEW.status, NEW.payment_type,
        NEW.midtrans_transaction_id, COALESCE(NEW.proof_image_url, NEW.manual_proof_image),
        NEW.approved_by, NEW.created_at, NEW.updated_at
      )
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions_midtrans') THEN
      INSERT INTO public.subscriptions_midtrans (
        id, user_id, order_id, amount, plan, status, payment_method, manual_proof_image,
        admin_notes, approved_by, created_at, updated_at
      )
      VALUES (
        NEW.id, NEW.user_id, NEW.order_id, NEW.amount, NEW.plan, NEW.status,
        COALESCE(NEW.payment_method, NEW.payment_type),
        COALESCE(NEW.manual_proof_image, NEW.proof_image_url),
        NEW.admin_notes, NEW.approved_by, NEW.created_at, NEW.updated_at
      )
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
      DELETE FROM public.payments WHERE id = OLD.id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions_midtrans') THEN
      DELETE FROM public.subscriptions_midtrans WHERE id = OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_midtrans_payments ON public.midtrans_payments;
CREATE TRIGGER trg_sync_midtrans_payments
AFTER INSERT OR UPDATE OR DELETE ON public.midtrans_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_midtrans_payments_bidirectional();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions_midtrans') THEN
    CREATE OR REPLACE VIEW public.subscriptions_midtrans AS SELECT * FROM public.midtrans_payments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    CREATE OR REPLACE VIEW public.payments AS SELECT * FROM public.midtrans_payments;
  END IF;
END $$;

-- Enable RLS on midtrans_payments
ALTER TABLE public.midtrans_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payments" ON public.midtrans_payments;
CREATE POLICY "Users view own payments"
  ON public.midtrans_payments FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));

DROP POLICY IF EXISTS "Users insert own payments" ON public.midtrans_payments;
CREATE POLICY "Users insert own payments"
  ON public.midtrans_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all payments" ON public.midtrans_payments;
CREATE POLICY "Admins manage all payments"
  ON public.midtrans_payments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- TABLE 10: AUDIT_LOGS (Privacy Protection & Admin Audit Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_resource VARCHAR(100),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- Backfill from admin_audit_logs if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_logs') THEN
    INSERT INTO public.audit_logs (
      id, admin_id, action, target_user_id, details, created_at
    )
    SELECT
      id, admin_id, action, target_user_id, details, created_at
    FROM public.admin_audit_logs
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Synchronize audit_logs and admin_audit_logs
CREATE OR REPLACE FUNCTION public.sync_audit_logs_bidirectional()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_audit_logs') THEN
      INSERT INTO public.admin_audit_logs (
        id, admin_id, action, target_user_id, details, created_at
      )
      VALUES (
        NEW.id, NEW.admin_id, NEW.action, NEW.target_user_id, NEW.details, NEW.created_at
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_sync_audit_logs
AFTER INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_audit_logs_bidirectional();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_audit_logs') THEN
    CREATE OR REPLACE VIEW public.admin_audit_logs AS SELECT * FROM public.audit_logs;
  END IF;
END $$;

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view and insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins view and insert audit logs"
  ON public.audit_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
  ));


-- ==============================================================================
-- DATABASE TRIGGER: WALLET BALANCE UPDATES ON TRANSACTION INSERT / DELETE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_dest_wallet_id UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- 1. Handle Income
    IF (NEW.type = 'income') THEN
      UPDATE public.wallets 
      SET balance = balance + NEW.amount, updated_at = NOW() 
      WHERE id = NEW.wallet_id;

    -- 2. Handle Expense
    ELSIF (NEW.type = 'expense') THEN
      UPDATE public.wallets 
      SET balance = balance - NEW.amount, updated_at = NOW() 
      WHERE id = NEW.wallet_id;

      -- Automatically update spent_amount on matching budget if present
      IF (NEW.category_id IS NOT NULL) THEN
        UPDATE public.budgets
        SET spent_amount = spent_amount + NEW.amount, updated_at = NOW()
        WHERE user_id = NEW.user_id 
          AND category_id = NEW.category_id
          AND (month_year = TO_CHAR(NEW.transaction_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
               OR month = EXTRACT(MONTH FROM NEW.transaction_date));
      END IF;

    -- 3. Handle Inter-Wallet Transfer
    ELSIF (NEW.type = 'transfer') THEN
      v_dest_wallet_id := COALESCE(NEW.to_wallet_id, NEW.destination_wallet_id);
      
      -- Deduct from origin wallet
      UPDATE public.wallets 
      SET balance = balance - NEW.amount, updated_at = NOW() 
      WHERE id = NEW.wallet_id;

      -- Add to destination wallet
      IF (v_dest_wallet_id IS NOT NULL) THEN
        UPDATE public.wallets 
        SET balance = balance + NEW.amount, updated_at = NOW() 
        WHERE id = v_dest_wallet_id;
      END IF;
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    -- 1. Revert Income
    IF (OLD.type = 'income') THEN
      UPDATE public.wallets 
      SET balance = balance - OLD.amount, updated_at = NOW() 
      WHERE id = OLD.wallet_id;

    -- 2. Revert Expense
    ELSIF (OLD.type = 'expense') THEN
      UPDATE public.wallets 
      SET balance = balance + OLD.amount, updated_at = NOW() 
      WHERE id = OLD.wallet_id;

      IF (OLD.category_id IS NOT NULL) THEN
        UPDATE public.budgets
        SET spent_amount = GREATEST(0, spent_amount - OLD.amount), updated_at = NOW()
        WHERE user_id = OLD.user_id 
          AND category_id = OLD.category_id
          AND (month_year = TO_CHAR(OLD.transaction_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
               OR month = EXTRACT(MONTH FROM OLD.transaction_date));
      END IF;

    -- 3. Revert Inter-Wallet Transfer
    ELSIF (OLD.type = 'transfer') THEN
      v_dest_wallet_id := COALESCE(OLD.to_wallet_id, OLD.destination_wallet_id);
      
      -- Restore origin wallet
      UPDATE public.wallets 
      SET balance = balance + OLD.amount, updated_at = NOW() 
      WHERE id = OLD.wallet_id;

      -- Reverse destination wallet
      IF (v_dest_wallet_id IS NOT NULL) THEN
        UPDATE public.wallets 
        SET balance = balance - OLD.amount, updated_at = NOW() 
        WHERE id = v_dest_wallet_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop redundant legacy triggers to prevent duplicate balance computations
DROP TRIGGER IF EXISTS trg_transaction_balance ON public.transactions;
DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.transactions;

CREATE TRIGGER trg_update_wallet_balance
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance_on_transaction();


-- ==============================================================================
-- DEFAULT SEED DATA (10 System Categories & Multi-AI Providers)
-- ==============================================================================

-- 1. Seed 10 Default System Categories
INSERT INTO public.categories (id, user_id, name, type, emoji, icon_emoji, color, color_hex, is_system, is_custom)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Makanan & Minuman', 'expense', '🍜', '🍜', '#f97316', '#f97316', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Transportasi', 'expense', '🚗', '🚗', '#3b82f6', '#3b82f6', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Hiburan', 'expense', '🎮', '🎮', '#a855f7', '#a855f7', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Tagihan & Utilitas', 'expense', '🏠', '🏠', '#ef4444', '#ef4444', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000005', NULL, 'Kesehatan', 'expense', '💊', '💊', '#10b981', '#10b981', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000006', NULL, 'Belanja', 'expense', '👕', '👕', '#ec4899', '#ec4899', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000007', NULL, 'Pendidikan', 'expense', '📚', '📚', '#6366f1', '#6366f1', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000008', NULL, 'Gaji & Upah', 'income', '💰', '💰', '#22c55e', '#22c55e', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000009', NULL, 'Freelance & Side Hustle', 'income', '💻', '💻', '#14b8a6', '#14b8a6', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000010', NULL, 'Investasi & Bunga', 'income', '📈', '📈', '#f59e0b', '#f59e0b', TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  emoji = EXCLUDED.emoji,
  icon_emoji = EXCLUDED.icon_emoji,
  color = EXCLUDED.color,
  color_hex = EXCLUDED.color_hex,
  is_system = TRUE;

-- 2. Seed Default AI Providers
INSERT INTO public.ai_providers (id, name, display_name, is_active, priority, model_text, model_vision, model_audio)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'gemini', 'Google Gemini', TRUE, 1, 'gemini-1.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash'),
  ('22222222-2222-2222-2222-222222222222', 'openai', 'OpenAI (GPT-4o / Whisper)', TRUE, 2, 'gpt-4o-mini', 'gpt-4o', 'whisper-1'),
  ('33333333-3333-3333-3333-333333333333', 'deepseek', 'DeepSeek (V3 / R1)', TRUE, 3, 'deepseek-chat', 'deepseek-chat', 'none')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active,
  priority = EXCLUDED.priority,
  model_text = EXCLUDED.model_text;

-- 3. Seed Default AI Settings
INSERT INTO public.ai_settings (id, mode, default_provider)
VALUES (1, 'single', 'gemini')
ON CONFLICT (id) DO NOTHING;
