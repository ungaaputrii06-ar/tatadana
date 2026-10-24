-- ==============================================================================
-- Migration: 20261010000000_tatadana_init.sql
-- Description: Skema Lengkap Supabase PostgreSQL TataDana
-- Timezone: Asia/Jakarta (WIB)
-- ==============================================================================

-- 1. Enable UUID Extension & pgcrypto for Encrypted Keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set Timezone to Asia/Jakarta
SET timezone = 'Asia/Jakarta';

-- 2. USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) UNIQUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    default_currency VARCHAR(10) DEFAULT 'IDR',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    subscription_plan VARCHAR(20) DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'pro')),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled')),
    subscription_expires_at TIMESTAMPTZ,
    
    -- Telegram Link Fields
    telegram_user_id BIGINT UNIQUE,
    telegram_username VARCHAR(100),
    telegram_chat_id BIGINT,
    telegram_connected BOOLEAN DEFAULT FALSE,
    telegram_bot_token_encrypted TEXT,
    telegram_webhook_synced BOOLEAN DEFAULT FALSE,
    
    -- Monthly Limit Tracking (Starter: max 50 transaksi/bulan)
    transactions_this_month INT DEFAULT 0,
    month_cycle VARCHAR(7) DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM'),
    
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 3. WALLETS TABLE (Multi-Wallet)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'investment', 'other')),
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_default BOOLEAN DEFAULT FALSE,
    icon VARCHAR(50) DEFAULT 'wallet',
    color_hex VARCHAR(20) DEFAULT '#FF6B00',
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- Ensure only 1 default wallet per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_wallet_per_user 
ON public.wallets (user_id) 
WHERE is_default = TRUE;

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE, -- NULL means system template
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    icon_emoji VARCHAR(10) NOT NULL DEFAULT '🏷️',
    color_hex VARCHAR(20) DEFAULT '#FF6B00',
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 5. BUDGETS TABLE (Budget per Kategori bulanan)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    monthly_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    spent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    alert_80_sent BOOLEAN DEFAULT FALSE,
    alert_100_sent BOOLEAN DEFAULT FALSE,
    month_year VARCHAR(7) NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM'),
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    UNIQUE(user_id, category_id, month_year)
);

-- 6. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT,
    notes TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    source VARCHAR(30) DEFAULT 'web' CHECK (source IN ('web', 'telegram_text', 'telegram_photo', 'telegram_voice')),
    receipt_image_url TEXT,
    voice_transcript TEXT,
    merchant_name VARCHAR(255),
    raw_ai_output JSONB,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 7. TRANSACTION ITEMS (Multi-item breakdown untuk struk belanja Pro)
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1.0,
    price_per_unit NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 8. TELEGRAM WEBHOOK IDEMPOTENCY LOGS
CREATE TABLE IF NOT EXISTS public.telegram_webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    update_id BIGINT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    telegram_user_id BIGINT,
    message_type VARCHAR(30),
    raw_payload JSONB,
    response_text TEXT,
    status VARCHAR(20) DEFAULT 'processed' CHECK (status IN ('received', 'processed', 'duplicate', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 9. AI PROVIDERS CONFIGURATION (Admin Multi-Provider)
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'gemini', 'openai', 'deepseek'
    display_name VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 10. AI SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.ai_settings (
    id VARCHAR(10) PRIMARY KEY DEFAULT 'global',
    mode VARCHAR(20) DEFAULT 'single' CHECK (mode IN ('single', 'failover')),
    active_provider_name VARCHAR(50) DEFAULT 'gemini',
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 11. AI INVOCATION & COST LOGS
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(50) NOT NULL,
    endpoint_type VARCHAR(50) NOT NULL, -- 'text_parser', 'vision_receipt', 'speech_transcribe', 'financial_advisor'
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    cost_idr NUMERIC(10, 4) DEFAULT 0,
    latency_ms INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'fallback_triggered', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 12. EXPORT HISTORY (PDF/Excel Laporan dengan Storage Signed URL)
CREATE TABLE IF NOT EXISTS public.export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('pdf', 'xlsx')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_records INT DEFAULT 0,
    file_size_bytes BIGINT DEFAULT 0,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 13. USER REMINDERS CONFIG
CREATE TABLE IF NOT EXISTS public.user_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users_profile(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    frequency INT DEFAULT 1 CHECK (frequency IN (1, 2)),
    time_1 TIME DEFAULT '12:00:00',
    time_2 TIME DEFAULT '20:00:00',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 14. MIDTRANS SUBSCRIPTIONS & PAYMENTS
CREATE TABLE IF NOT EXISTS public.subscriptions_midtrans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('starter', 'pro')),
    amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'bank_transfer', 'gopay', 'qris', 'manual'
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'settlement', 'approved_manual', 'rejected_manual', 'expired', 'cancel')),
    manual_proof_image TEXT,
    admin_notes TEXT,
    approved_by UUID REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- 15. AUDIT LOGS (Untuk tracking akses data user oleh Admin demi privasi)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users_profile(id),
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES public.users_profile(id),
    target_resource VARCHAR(100),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Jakarta')
);

-- ==============================================================================
-- TRIGGERS & BUSINESS LOGIC FUNCTIONS
-- ==============================================================================

-- Trigger to Automatically Update Wallet Balance on Transaction Insert
CREATE OR REPLACE FUNCTION public.handle_transaction_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'expense' THEN
            UPDATE public.wallets 
            SET balance = balance - NEW.amount, updated_at = NOW() 
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE public.wallets 
            SET balance = balance + NEW.amount, updated_at = NOW() 
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'transfer' THEN
            -- Deduct from origin, add to destination
            UPDATE public.wallets 
            SET balance = balance - NEW.amount, updated_at = NOW() 
            WHERE id = NEW.wallet_id;
            
            IF NEW.destination_wallet_id IS NOT NULL THEN
                UPDATE public.wallets 
                SET balance = balance + NEW.amount, updated_at = NOW() 
                WHERE id = NEW.destination_wallet_id;
            END IF;
        END IF;
        
        -- Increment monthly transaction count for Starter limit checks
        UPDATE public.users_profile
        SET transactions_this_month = transactions_this_month + 1
        WHERE id = NEW.user_id;

        -- Update Spent Amount on Budgets table if expense
        IF NEW.type = 'expense' AND NEW.category_id IS NOT NULL THEN
            UPDATE public.budgets
            SET spent_amount = spent_amount + NEW.amount, updated_at = NOW()
            WHERE user_id = NEW.user_id 
              AND category_id = NEW.category_id
              AND month_year = TO_CHAR(NEW.transaction_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM');
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Reverse calculation on delete
        IF OLD.type = 'expense' THEN
            UPDATE public.wallets 
            SET balance = balance + OLD.amount, updated_at = NOW() 
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE public.wallets 
            SET balance = balance - OLD.amount, updated_at = NOW() 
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE public.wallets 
            SET balance = balance + OLD.amount, updated_at = NOW() 
            WHERE id = OLD.wallet_id;
            
            IF OLD.destination_wallet_id IS NOT NULL THEN
                UPDATE public.wallets 
                SET balance = balance - OLD.amount, updated_at = NOW() 
                WHERE id = OLD.destination_wallet_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_transaction_balance
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_balance();

-- ==============================================================================
-- DEFAULT SEED DATA (Kategori & AI Providers Template)
-- ==============================================================================

-- Seed Default Categories
INSERT INTO public.categories (id, user_id, name, type, icon_emoji, color_hex, is_custom) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Makanan & Minuman', 'expense', '🍜', '#FF6B00', FALSE),
('00000000-0000-0000-0000-000000000002', NULL, 'Transportasi', 'expense', '🚗', '#3B82F6', FALSE),
('00000000-0000-0000-0000-000000000003', NULL, 'Hiburan & Hobi', 'expense', '🎮', '#8B5CF6', FALSE),
('00000000-0000-0000-0000-000000000004', NULL, 'Tagihan & Utilitas', 'expense', '🏠', '#EF4444', FALSE),
('00000000-0000-0000-0000-000000000005', NULL, 'Kesehatan & Obat', 'expense', '💊', '#10B981', FALSE),
('00000000-0000-0000-0000-000000000006', NULL, 'Belanja Kebutuhan', 'expense', '👕', '#EC4899', FALSE),
('00000000-0000-0000-0000-000000000007', NULL, 'Pendidikan & Kursus', 'expense', '📚', '#6366F1', FALSE),
('00000000-0000-0000-0000-000000000008', NULL, 'Gaji & Pendapatan', 'income', '💼', '#10B981', FALSE),
('00000000-0000-0000-0000-000000000009', NULL, 'Bonus & Freelance', 'income', '💰', '#F59E0B', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Seed Default AI Providers
INSERT INTO public.ai_providers (name, display_name, api_key_encrypted, model_name, is_active, priority) VALUES
('gemini', 'Google Gemini 2.0 Flash', 'ENC_PLACEHOLDER_GEMINI', 'gemini-2.0-flash', TRUE, 1),
('openai', 'OpenAI GPT-4o-mini', 'ENC_PLACEHOLDER_OPENAI', 'gpt-4o-mini', TRUE, 2),
('deepseek', 'DeepSeek-V3 Chat', 'ENC_PLACEHOLDER_DEEPSEEK', 'deepseek-chat', TRUE, 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ai_settings (id, mode, active_provider_name) VALUES
('global', 'failover', 'gemini')
ON CONFLICT (id) DO NOTHING;
