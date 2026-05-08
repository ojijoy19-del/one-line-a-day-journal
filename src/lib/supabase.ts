import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Check if keys are present and valid (must start with http and not be placeholder)
    if (!url || !url.startsWith('http') || !key || key === 'your-anon-key' || key === 'placeholder') {
      return null;
    }

    try {
      supabaseInstance = createClient(url, key);
    } catch (e) {
      console.error('Supabase initialization failed:', e);
      return null;
    }
  }
  return supabaseInstance;
}
