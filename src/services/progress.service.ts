import { supabase } from "../lib/supabase";

function getMonday(weekOffset: number) {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diffToMonday + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const progressService = {
  async getOverallStats(userId: string) {
    const { count: totalWorkouts } = await supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("ended_at", "is", null);

    const { data: setsData, error } = await supabase
      .from("workout_sets")
      .select("id, movements(movement_groups(name)), workout_sessions!inner(user_id)")
      .eq("workout_sessions.user_id", userId);
    if (error) throw error;

    const totalSets = setsData?.length ?? 0;

    const categoryCounts: Record<string, number> = {};
    setsData?.forEach((s: any) => {
      const groupName = s.movements?.movement_groups?.name;
      if (groupName) categoryCounts[groupName] = (categoryCounts[groupName] || 0) + 1;
    });
    const mostTrainedCategory =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return { totalWorkouts: totalWorkouts ?? 0, totalSets, mostTrainedCategory };
  },

  async getPersonalRecords(userId: string) {
    const { data, error } = await supabase
      .from("workout_sets")
      .select("movement_id, reps, duration_seconds, added_weight_kg, movements(name, movement_groups(name)), workout_sessions!inner(user_id)")
      .eq("workout_sessions.user_id", userId);
    if (error) throw error;

    const prMap: Record<string, { name: string; category: string; maxReps: number; maxDuration: number; maxWeight: number }> = {};
    data?.forEach((s: any) => {
      const id = s.movement_id;
      if (!prMap[id]) {
        prMap[id] = {
          name: s.movements?.name ?? "Bilinmeyen",
          category: s.movements?.movement_groups?.name ?? "Diğer",
          maxReps: 0,
          maxDuration: 0,
          maxWeight: 0,
        };
      }
      if (s.reps && s.reps > prMap[id].maxReps) prMap[id].maxReps = s.reps;
      if (s.duration_seconds && s.duration_seconds > prMap[id].maxDuration) prMap[id].maxDuration = s.duration_seconds;
      if (s.added_weight_kg && s.added_weight_kg > prMap[id].maxWeight) prMap[id].maxWeight = s.added_weight_kg;
    });

    return Object.entries(prMap).map(([movementId, pr]) => ({ movementId, ...pr }));
  },

  async getLast7DaysActivity(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", sevenDaysAgo.toISOString());
    if (error) throw error;

    const trainedDates = new Set((data ?? []).map((s: any) => s.started_at.slice(0, 10)));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        trained: trainedDates.has(key),
        label: d.toLocaleDateString("tr-TR", { weekday: "narrow" }),
        isToday: i === 0,
      });
    }
    return days;
  },

  async getWeeklyStats(userId: string) {
    const mondayThis = getMonday(0);
    const mondayLast = getMonday(-1);

    const { count: thisWeekWorkouts } = await supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", mondayThis.toISOString());

    const { count: lastWeekWorkouts } = await supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", mondayLast.toISOString())
      .lt("started_at", mondayThis.toISOString());

    const { data: thisWeekSetsData } = await supabase
      .from("workout_sets")
      .select("id, workout_sessions!inner(user_id, started_at)")
      .eq("workout_sessions.user_id", userId)
      .gte("workout_sessions.started_at", mondayThis.toISOString());

    return {
      thisWeekWorkouts: thisWeekWorkouts ?? 0,
      lastWeekWorkouts: lastWeekWorkouts ?? 0,
      thisWeekSets: thisWeekSetsData?.length ?? 0,
    };
  },

  async getTopHighlight(userId: string) {
    const prs = await this.getPersonalRecords(userId);
    if (!prs.length) return null;

    let bestDuration: { name: string; value: number } | null = null;
    let bestWeight: { name: string; value: number } | null = null;
    let bestReps: { name: string; value: number } | null = null;

    prs.forEach((pr) => {
      if (pr.maxDuration > 0 && (!bestDuration || pr.maxDuration > bestDuration.value)) {
        bestDuration = { name: pr.name, value: pr.maxDuration };
      }
      if (pr.maxWeight > 0 && (!bestWeight || pr.maxWeight > bestWeight.value)) {
        bestWeight = { name: pr.name, value: pr.maxWeight };
      }
      if (pr.maxReps > 0 && (!bestReps || pr.maxReps > bestReps.value)) {
        bestReps = { name: pr.name, value: pr.maxReps };
      }
    });

    if (bestDuration) return { name: bestDuration.name, value: `${bestDuration.value} sn`, kind: "en uzun tuttuğun hareket" };
    if (bestWeight) return { name: bestWeight.name, value: `+${bestWeight.value} kg`, kind: "en yüksek ek ağırlık" };
    if (bestReps) return { name: bestReps.name, value: `${bestReps.value} tekrar`, kind: "en yüksek tekrar" };
    return null;
  },

  async getWeeklyVolume(userId: string, weeksBack = 8) {
    const weekStarts: Date[] = [];
    for (let i = weeksBack - 1; i >= 0; i--) {
      weekStarts.push(getMonday(-i));
    }
    const rangeStart = weekStarts[0];

    const { data, error } = await supabase
      .from("workout_sets")
      .select("id, workout_sessions!inner(user_id, started_at)")
      .eq("workout_sessions.user_id", userId)
      .gte("workout_sessions.started_at", rangeStart.toISOString());
    if (error) throw error;

    const counts = new Array(weeksBack).fill(0);
    data?.forEach((s: any) => {
      const started = new Date(s.workout_sessions.started_at).getTime();
      for (let i = weekStarts.length - 1; i >= 0; i--) {
        if (started >= weekStarts[i].getTime()) {
          counts[i] += 1;
          break;
        }
      }
    });

    return weekStarts.map((d, i) => ({
      weekLabel: `${d.getDate()}/${d.getMonth() + 1}`,
      totalSets: counts[i],
      isCurrent: i === weeksBack - 1,
    }));
  },

  async getCategoryBreakdown(userId: string) {
    const [{ data: groups, error: gErr }, { data: movements, error: mErr }, { data: sets, error: sErr }] = await Promise.all([
      supabase.from("movement_groups").select("id, name, order_index").order("order_index"),
      supabase.from("movements").select("id, group_id"),
      supabase
        .from("workout_sets")
        .select("movement_id, movements(group_id), workout_sessions!inner(user_id)")
        .eq("workout_sessions.user_id", userId),
    ]);
    if (gErr) throw gErr;
    if (mErr) throw mErr;
    if (sErr) throw sErr;

    const totalStepsByGroup: Record<string, number> = {};
    movements?.forEach((m: any) => {
      totalStepsByGroup[m.group_id] = (totalStepsByGroup[m.group_id] || 0) + 1;
    });

    const setsByGroup: Record<string, number> = {};
    const reachedByGroup: Record<string, Set<string>> = {};
    sets?.forEach((s: any) => {
      const gid = s.movements?.group_id;
      if (!gid) return;
      setsByGroup[gid] = (setsByGroup[gid] || 0) + 1;
      if (!reachedByGroup[gid]) reachedByGroup[gid] = new Set();
      reachedByGroup[gid].add(s.movement_id);
    });

    const totalSetsAll = Object.values(setsByGroup).reduce((a, b) => a + b, 0);

    return (groups ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      totalSets: setsByGroup[g.id] ?? 0,
      percentage: totalSetsAll ? Math.round(((setsByGroup[g.id] ?? 0) / totalSetsAll) * 100) : 0,
      stepsReached: reachedByGroup[g.id]?.size ?? 0,
      totalSteps: totalStepsByGroup[g.id] ?? 0,
    }));
  },

  async getActivityHeatmap(userId: string, daysBack = 49) {
    const start = new Date();
    start.setDate(start.getDate() - (daysBack - 1));
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("workout_sets")
      .select("id, workout_sessions!inner(user_id, started_at)")
      .eq("workout_sessions.user_id", userId)
      .gte("workout_sessions.started_at", start.toISOString());
    if (error) throw error;

    const countsByDate: Record<string, number> = {};
    data?.forEach((s: any) => {
      const key = s.workout_sessions.started_at.slice(0, 10);
      countsByDate[key] = (countsByDate[key] || 0) + 1;
    });

    const days = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: countsByDate[key] ?? 0 });
    }
    return days;
  },
};
