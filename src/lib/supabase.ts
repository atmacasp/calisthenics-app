import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Bazı sorgular cihaz saati kayması yüzünden "JWT issued at future" hatası verebiliyor.
// Bu durumda oturumu bir kez yenileyip sorguyu tekrar deniyoruz.
export async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isJwtIssue =
      error?.code === "PGRST303" ||
      (typeof error?.message === "string" && error.message.toLowerCase().includes("jwt"));
    if (isJwtIssue) {
      await supabase.auth.refreshSession();
      return await fn();
    }
    throw error;
  }
}
