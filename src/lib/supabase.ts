import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  db: { schema: 'naszdomek' },
  auth: { persistSession: true, autoRefreshToken: true },
});

export const STORAGE_BUCKET = 'naszdomek';
