-- Migration: 20261011000000_recurring_bills_and_budget_periods.sql
-- Description: Adds recurring_bills table and multi-period budget support (daily, weekly, monthly, yearly)

-- 1. Extend budgets table with period_type
ALTER TABLE IF EXISTS public.budgets
  ADD COLUMN IF NOT EXISTS period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS period_date DATE DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, period_type);

-- 2. Create recurring_bills table
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  due_date VARCHAR(50) NOT NULL, -- e.g. 'Every month on the 25th' or '25'
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

CREATE INDEX IF NOT EXISTS idx_recurring_bills_user ON public.recurring_bills(user_id, status);

-- 3. RLS Policies for recurring_bills
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring bills"
  ON public.recurring_bills
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Audit trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('Asia/Jakarta', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_recurring_bills_updated_at ON public.recurring_bills;
CREATE TRIGGER set_recurring_bills_updated_at
  BEFORE UPDATE ON public.recurring_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
