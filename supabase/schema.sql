-- ==============================================================================
-- TATADANA CANONICAL DATABASE SCHEMA
-- PostgreSQL / Supabase
-- Timezone: Asia/Jakarta (WIB, UTC+7)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS TABLE (Core Profile & SaaS Subscription)
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

-- Updatable views for legacy/alternative aliases
CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM public.users;
CREATE OR REPLACE VIEW public.users_profile AS SELECT * FROM public.users;

-- ==============================================================================
-- 2. WALLETS TABLE (Multi-wallet: Cash, BCA, Mandiri, GoPay, OVO, Dompet Tunai)
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

-- ==============================================================================
-- 3. CATEGORIES TABLE (System default & custom categories)
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

-- ==============================================================================
-- 4. TRANSACTIONS TABLE (Income, Expense, Transfer & Receipt Breakdown)
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

-- ==============================================================================
-- 5. BUDGETS TABLE (Multi-Period: Daily, Weekly, Monthly, Yearly)
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

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, period_type);

-- ==============================================================================
-- 6. RECURRING_BILLS TABLE (Subscription & Routine Bill Reminders)
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

-- ==============================================================================
-- 7. AI_LOGS TABLE (Telemetry, LLM Tokens, Latency & Failover Audit)
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

-- ==============================================================================
-- 8. EXPORT_RECORDS TABLE (PDF & Excel Download History Tracking)
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

CREATE OR REPLACE VIEW public.export_history AS SELECT * FROM public.export_records;

-- ==============================================================================
-- 9. MIDTRANS_PAYMENTS TABLE (Midtrans & Manual Bank Transfer Approvals)
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

CREATE OR REPLACE VIEW public.subscriptions_midtrans AS SELECT * FROM public.midtrans_payments;
CREATE OR REPLACE VIEW public.payments AS SELECT * FROM public.midtrans_payments;

-- ==============================================================================
-- 10. AUDIT_LOGS TABLE (Privacy Protection & Admin Audit Tracking)
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

CREATE OR REPLACE VIEW public.admin_audit_logs AS SELECT * FROM public.audit_logs;

-- ==============================================================================
-- 11. AUXILIARY TABLES (Reminders, AI Providers, AI Settings, Webhook Logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  frequency VARCHAR(5) DEFAULT '1x' CHECK (frequency IN ('1x', '2x')),
  time_1 TIME DEFAULT '12:00',
  time_2 TIME DEFAULT '20:00',
  boost_mode BOOLEAN DEFAULT FALSE,
  boost_minutes INT DEFAULT 10,
  boost_level INT DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
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
  mode VARCHAR(30) DEFAULT 'single' CHECK (mode IN ('single', 'failover', 'parallel_failover')),
  default_provider VARCHAR(50) DEFAULT 'gemini',
  updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

CREATE TABLE IF NOT EXISTS public.telegram_webhook_logs (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  command_or_text TEXT,
  processed_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
  raw_payload JSONB
);

-- ==============================================================================
-- DATABASE TRIGGER: WALLET BALANCE UPDATES ON TRANSACTION INSERT / DELETE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_dest_wallet_id UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.type = 'income') THEN
      UPDATE public.wallets 
      SET balance = balance + NEW.amount, updated_at = NOW() 
      WHERE id = NEW.wallet_id;
    ELSIF (NEW.type = 'expense') THEN
      UPDATE public.wallets 
      SET balance = balance - NEW.amount, updated_at = NOW() 
      WHERE id = NEW.wallet_id;

      IF (NEW.category_id IS NOT NULL) THEN
        UPDATE public.budgets
        SET spent_amount = spent_amount + NEW.amount, updated_at = NOW()
        WHERE user_id = NEW.user_id 
          AND category_id = NEW.category_id
          AND (month_year = TO_CHAR(NEW.transaction_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
               OR month = EXTRACT(MONTH FROM NEW.transaction_date));
      END IF;
    ELSIF (NEW.type = 'transfer') THEN
      v_dest_wallet_id := COALESCE(NEW.to_wallet_id, NEW.destination_wallet_id);
      
      UPDATE public.wallets 
      SET balance = balance - NEW.amount, updated_at = NOW() 
      WHERE id = NEW.wallet_id;

      IF (v_dest_wallet_id IS NOT NULL) THEN
        UPDATE public.wallets 
        SET balance = balance + NEW.amount, updated_at = NOW() 
        WHERE id = v_dest_wallet_id;
      END IF;
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.type = 'income') THEN
      UPDATE public.wallets 
      SET balance = balance - OLD.amount, updated_at = NOW() 
      WHERE id = OLD.wallet_id;
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
    ELSIF (OLD.type = 'transfer') THEN
      v_dest_wallet_id := COALESCE(OLD.to_wallet_id, OLD.destination_wallet_id);
      
      UPDATE public.wallets 
      SET balance = balance + OLD.amount, updated_at = NOW() 
      WHERE id = OLD.wallet_id;

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

DROP TRIGGER IF EXISTS trg_update_wallet_balance ON public.transactions;
CREATE TRIGGER trg_update_wallet_balance
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance_on_transaction();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES ON ALL 10 CORE TABLES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.midtrans_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Users view own record" ON public.users FOR SELECT USING (auth.uid() = id OR EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));
CREATE POLICY "Users update own record" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins manage all users" ON public.users FOR ALL USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 2. Wallets policies
CREATE POLICY "Users manage own wallets" ON public.wallets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 3. Categories policies
CREATE POLICY "Users view system and own categories" ON public.categories FOR SELECT USING (user_id IS NULL OR is_system = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all categories" ON public.categories FOR ALL USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 4. Transactions policies
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.transactions FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 5. Budgets policies
CREATE POLICY "Users manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all budgets" ON public.budgets FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 6. Recurring Bills policies
CREATE POLICY "Users manage own recurring bills" ON public.recurring_bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all recurring bills" ON public.recurring_bills FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 7. AI Logs policies (Explicit RLS on ai_logs)
CREATE POLICY "Users view own ai logs" ON public.ai_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));
CREATE POLICY "Allow inserting ai logs" ON public.ai_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage all ai logs" ON public.ai_logs FOR ALL USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 8. Export Records policies
CREATE POLICY "Users manage own export records" ON public.export_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all export records" ON public.export_records FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 9. Midtrans Payments policies
CREATE POLICY "Users view own payments" ON public.midtrans_payments FOR SELECT USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));
CREATE POLICY "Users insert own payments" ON public.midtrans_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all payments" ON public.midtrans_payments FOR ALL USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- 10. Audit Logs policies
CREATE POLICY "Admins view and create audit logs" ON public.audit_logs FOR ALL USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
));

-- Reminders policy
CREATE POLICY "Users manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- DEFAULT SEED DATA
-- ==============================================================================
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

INSERT INTO public.ai_settings (id, mode, default_provider)
VALUES (1, 'single', 'gemini')
ON CONFLICT (id) DO NOTHING;
