import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: Boolean(supabaseUrl && supabaseAnonKey)
};

export const supabase = supabaseConfig.isConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

// TODO: 추후 Auth/권한 연결
