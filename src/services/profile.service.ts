import { supabase, withAuthRetry } from "../lib/supabase";

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

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
  async updateStreakOnWorkoutComplete(userId: string) {
    const profile = await this.getProfile(userId);
    const today = getDateString(new Date());
    const yesterday = getDateString(new Date(Date.now() - 86400000));

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
