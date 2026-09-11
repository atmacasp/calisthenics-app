import { supabase } from "../lib/supabase";
import type { MovementSetLogMap, SetLogEntry } from "../types/movements";
import { toLocalDateKey } from "../utils/date";
import type { ReadinessSession } from "../utils/readiness";

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

  async getPersonalRecords(userId: string, excludeSessionId?: string) {
    const { data, error } = await supabase
      .from("workout_sets")
      .select("movement_id, reps, duration_seconds, added_weight_kg, movements(name, movement_groups(name)), workout_sessions!inner(user_id)")
      .neq("session_id", excludeSessionId ?? "00000000-0000-0000-0000-000000000000")
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

  /**
   * Ön koşul/hedef kilit mekaniği için: kullanıcının attığı her seti,
   * hareket ve session bazında gruplar. "3 set x 15 tekrar" gibi hedefler
   * TEK bir session içindeki set sayısına bakılarak değerlendirilebilsin diye
   * (bkz. src/utils/targetProgress.ts) session_id ayrımı korunuyor.
   */
  async getMovementSetLogs(userId: string, excludeSessionId?: string): Promise<MovementSetLogMap> {
    const { data, error } = await supabase
      .from("workout_sets")
      .select("movement_id, session_id, reps, duration_seconds, workout_sessions!inner(user_id)")
      .neq("session_id", excludeSessionId ?? "00000000-0000-0000-0000-000000000000")
      .eq("workout_sessions.user_id", userId);
    if (error) throw error;

    const map: MovementSetLogMap = {};
    (data ?? []).forEach((row: any) => {
      const movementId: string | null = row.movement_id;
      const sessionId: string | null = row.session_id;
      if (!movementId || !sessionId) return;
      if (!map[movementId]) map[movementId] = {};
      if (!map[movementId][sessionId]) map[movementId][sessionId] = [];
      const entry: SetLogEntry = { reps: row.reps, duration_seconds: row.duration_seconds };
      map[movementId][sessionId].push(entry);
    });
    return map;
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
      const key = toLocalDateKey(d);
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

    // let + forEach kalibi TypeScript'in akis analizini yaniltiyordu: degisken
    // sadece closure icinde atandigi icin disarida hala "null" sanilip narrow
    // ediliyor, sonrasinda .name/.value okumak "never" hatasi veriyordu.
    // reduce ile ayni is, tip guvenli sekilde yapiliyor.
    type Highlight = { name: string; value: number };
    const pickBest = (metric: "maxDuration" | "maxWeight" | "maxReps"): Highlight | null =>
      prs.reduce<Highlight | null>(
        (best, pr) =>
          pr[metric] > 0 && (!best || pr[metric] > best.value) ? { name: pr.name, value: pr[metric] } : best,
        null
      );

    const bestDuration = pickBest("maxDuration");
    const bestWeight = pickBest("maxWeight");
    const bestReps = pickBest("maxReps");

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
      const key = toLocalDateKey(s.workout_sessions.started_at);
      countsByDate[key] = (countsByDate[key] || 0) + 1;
    });

    const days = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      days.push({ date: key, count: countsByDate[key] ?? 0 });
    }
    return days;
  },

  /**
   * Tek bir hareketin son antrenmanları, ESKİDEN YENİYE sıralı.
   *
   * getMovementSetLogs oturumları bir sözlükte topluyor ve tarih taşımıyor -
   * "son 3 antrenman" sorusu oradan cevaplanamıyor (session_id'ler UUID, sıraya
   * sokulamaz). readiness motorunun ihtiyacı olan sıralı geçmiş bu sorgu.
   *
   * Yalnızca BİTMİŞ oturumlar sayılıyor: yarım kalan oturum "bu antrenmanda
   * ilerleyemedin" demek için henüz erken.
   */
  async getMovementSessionHistory(
    userId: string,
    movementId: string,
    limit = 10
  ): Promise<ReadinessSession[]> {
    const { data, error } = await supabase
      .from("workout_sets")
      .select("session_id, reps, duration_seconds, added_weight_kg, workout_sessions!inner(user_id, started_at, ended_at)")
      .eq("movement_id", movementId)
      .eq("workout_sessions.user_id", userId)
      .not("workout_sessions.ended_at", "is", null)
      .order("completed_at", { ascending: true });
    if (error) throw error;

    const bySession = new Map<string, ReadinessSession>();
    for (const row of (data ?? []) as any[]) {
      const sessionId: string | null = row.session_id;
      if (!sessionId) continue;
      let session = bySession.get(sessionId);
      if (!session) {
        session = { sessionId, date: row.workout_sessions?.started_at ?? "", sets: [] };
        bySession.set(sessionId, session);
      }
      session.sets.push({
        reps: row.reps,
        duration_seconds: row.duration_seconds,
        added_weight_kg: row.added_weight_kg,
      });
    }

    // Oturumları başlangıç tarihine göre sırala: setler completed_at'e göre
    // geldi ama iki oturumun setleri tarih olarak iç içe geçebilir.
    const sessions = [...bySession.values()].sort((a, b) => a.date.localeCompare(b.date));
    return sessions.slice(-limit);
  },
};
