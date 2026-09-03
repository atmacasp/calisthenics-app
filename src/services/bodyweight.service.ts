import { supabase } from "../lib/supabase";

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
  async addLog(userId: string, weightKg: number) {
    const { data, error } = await supabase
      .from("body_weight_logs")
      .insert({ user_id: userId, weight_kg: weightKg })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
