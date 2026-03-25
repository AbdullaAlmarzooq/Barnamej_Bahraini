import Constants from 'expo-constants';

type ExpoExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

const pickFirst = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

export const runtimeEnv = {
  supabaseUrl: pickFirst(process.env.EXPO_PUBLIC_SUPABASE_URL, extra.supabaseUrl),
  supabaseAnonKey: pickFirst(
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    extra.supabaseAnonKey
  ),
};

export const getMissingSupabaseVars = () => {
  const missing: string[] = [];

  if (!runtimeEnv.supabaseUrl) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!runtimeEnv.supabaseAnonKey) {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return missing;
};

export const hasSupabaseConfig = Boolean(runtimeEnv.supabaseUrl && runtimeEnv.supabaseAnonKey);
