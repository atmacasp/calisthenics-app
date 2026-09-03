import { supabase } from "../lib/supabase";
import { profileService } from "./profile.service";

export const workoutService = {
  async startSession(userId: string) {
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({ user_id: userId })
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
};
