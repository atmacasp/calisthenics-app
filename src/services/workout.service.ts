
import { supabase } from "../lib/supabase";
import { profileService } from "./profile.service";

export const workoutService = {
  /** programId verilirse oturum o programa bağlı olarak işaretlenir (workout_sessions.program_id). */
  async startSession(userId: string, programId?: string) {
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({ user_id: userId, program_id: programId ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async endSession(sessionId: string, userId: string) {
    const { error } = await supabase
      .from("workout_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;
    await profileService.updateStreakOnWorkoutComplete(userId);
  },
  async addSet(input: {
    session_id: string;
    movement_id: string;
    set_number: number;
    reps?: number;
    duration_seconds?: number;
    added_weight_kg?: number;
  }) {
    const { data, error } = await supabase.from("workout_sets").insert(input).select().single();
    if (error) throw error;
    return data;
  },
  /**
   * Aktif antrenmandan bir hareketi kaldırırken, o harekete ait DAHA ÖNCE
   * KAYDEDİLMİŞ setleri de siler - aksi halde antrenman ekranında görünmeyen
   * ama DB'de (ve dolayısıyla PR/hedef hesaplamalarında) hâlâ sayılan
   * "hayalet" setler kalırdı.
   */
  async removeMovementSets(sessionId: string, movementId: string) {
    const { error } = await supabase
      .from("workout_sets")
      .delete()
      .eq("session_id", sessionId)
      .eq("movement_id", movementId);
    if (error) throw error;
  },
};
