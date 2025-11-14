import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Browser-side Supabase client for Client Components
 * Uses @supabase/ssr which automatically handles cookies
 * For Server Components, use getServerAuth() from lib/auth-server.ts
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;
