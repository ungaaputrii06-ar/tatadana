-- ==========================================================
-- TATADANA SEED DATA
-- Default Categories & Default AI Providers
-- ==========================================================

-- 1. Default System Categories
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

-- 2. Default AI Providers
INSERT INTO public.ai_providers (id, name, display_name, is_active, priority, model_text, model_vision, model_audio)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'gemini', 'Google Gemini', TRUE, 1, 'gemini-1.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash'),
  ('22222222-2222-2222-2222-222222222222', 'openai', 'OpenAI (GPT-4o / Whisper)', TRUE, 2, 'gpt-4o-mini', 'gpt-4o', 'whisper-1'),
  ('33333333-3333-3333-3333-333333333333', 'deepseek', 'DeepSeek (V3 / R1)', TRUE, 3, 'deepseek-chat', 'deepseek-chat', 'none')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active;

-- 3. Default AI Settings
INSERT INTO public.ai_settings (id, mode, default_provider)
VALUES (1, 'single', 'gemini')
ON CONFLICT (id) DO NOTHING;
