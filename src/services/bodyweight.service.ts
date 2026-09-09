import { supabase } from "../lib/supabase";

/**
 * Cihazın YEREL günü. new Date().toISOString() UTC verdiği için, UTC+3'te
 * akşam 21:00'den sonra girilen kayıt ertesi güne yazılıyordu.
 */
function todayLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const bodyWeightService = {
  async getLogs(userId: string) {
    const { data, error } = await supabase
      .from("body_weight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  /**
   * Kilo kaydı ekler. Aynı güne ikinci kez girilirse yeni satır açmak yerine
   * üzerine yazar (0011 migration'daki (user_id, logged_at) tekil indeksi).
   */
  async addLog(userId: string, weightKg: number) {
    const { data, error } = await supabase
      .from("body_weight_logs")
      .upsert(
        { user_id: userId, weight_kg: weightKg, logged_at: todayLocal() },
        { onConflict: "user_id,logged_at" }
      )
      .select()
      .single();
    if (error) throw error;
    await bodyWeightService.syncProfileWeight(userId);
    return data;
  },

  async removeLog(logId: string, userId: string) {
    const { error } = await supabase.from("body_weight_logs").delete().eq("id", logId);
    if (error) throw error;
    await bodyWeightService.syncProfileWeight(userId);
  },

  /**
   * profiles.weight_kg'yi en güncel kilo kaydına eşitler. İki ayrı doğruluk
   * kaynağı olmasın diye: kayıtlar asıl veri, profildeki alan onun yansıması.
   * Kayıt kalmadıysa profildeki değere dokunulmaz (onboarding değeri korunur).
   */
  async syncProfileWeight(userId: string) {
    const { data, error } = await supabase
      .from("body_weight_logs")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    await supabase.from("profiles").update({ weight_kg: data.weight_kg }).eq("id", userId);
  },
};
