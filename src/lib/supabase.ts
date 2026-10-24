import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-tatadana.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key-tatadana';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isRealSupabaseConfigured = () => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://demo-tatadana.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};
