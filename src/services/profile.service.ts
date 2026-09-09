import { supabase, withAuthRetry } from "../lib/supabase";
import { toLocalDateKey, todayLocalKey } from "../utils/date";

export const profileService = {
  async getProfile(userId: string) {
    return withAuthRetry(async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    });
  },
  async updateProfile(userId: string, updates: Record<string, any>) {
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
    if (error) throw error;
    return data;
  },
  /**
   * Seri hesabı kullanıcının YEREL gününe göre yapılır. Eskiden UTC kullanılıyordu;
   * gece yapılan antrenman bir önceki güne yazıldığı için seri hem fazla hem eksik
   * sayabiliyordu.
   */
  async updateStreakOnWorkoutComplete(userId: string) {
    const profile = await this.getProfile(userId);
    const today = todayLocalKey();
    const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));

    if (profile.last_workout_date === today) {
      return profile;
    }

    let newStreak = 1;
    if (profile.last_workout_date === yesterday) {
      newStreak = (profile.current_streak ?? 0) + 1;
    }

    const newLongest = Math.max(profile.longest_streak ?? 0, newStreak);

    return this.updateProfile(userId, {
      current_streak: newStreak,
      longest_streak: newLongest,
      last_workout_date: today,
    });
  },
};
