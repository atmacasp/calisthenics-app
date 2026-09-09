import { supabase } from "../lib/supabase";
import { toLocalDateKey } from "../utils/date";

export interface PreviousPerformance {
  /** Ekranda gösterilmeye hazır metin: "12 · 12 · 10 tekrar" ya da "30 · 25 sn" */
  summary: string;
  /** O setlerin yapıldığı gün (YYYY-MM-DD) */
  date: string;
}

/** Bir antrenmandaki en iyi performans - gelişim grafiğinin tek noktası. */
export interface MovementHistoryPoint {
  date: string;
  bestReps: number;
  bestDuration: number;
  setCount: number;
}

const NO_MATCH_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * "Geçen sefer ne yapmıştım" referansı. Aktif antrenman ekranı, kullanıcı set
 * girerken önceki performansını görsün diye kullanır.
 *
 * Sadece BİTMİŞ (ended_at dolu) antrenmanlara bakar - yarım kalmış bir oturum
 * referans olmamalı. excludeSessionId ile içinde bulunulan antrenman dışarıda
 * bırakılır, aksi halde az önce girdiğin set "geçen sefer" diye geri dönerdi.
 */
export const performanceService = {
  async getPreviousPerformance(
    userId: string,
    excludeSessionId?: string
  ): Promise<Record<string, PreviousPerformance>> {
    const { data, error } = await supabase
      .from("workout_sets")
      .select(
        "movement_id, session_id, reps, duration_seconds, added_weight_kg, completed_at, workout_sessions!inner(user_id, ended_at)"
      )
      .eq("workout_sessions.user_id", userId)
      .not("workout_sessions.ended_at", "is", null)
      .neq("session_id", excludeSessionId ?? NO_MATCH_UUID)
      .order("completed_at", { ascending: false })
      .limit(600);
    if (error) throw error;

    // Sorgu en yeniden eskiye geldiği için, bir hareket ilk kez görüldüğünde
    // ait olduğu oturum otomatik olarak o hareketin EN SON oturumudur.
    const latestSessionByMovement = new Map<string, string>();
    const rowsByMovement = new Map<string, any[]>();

    for (const row of (data ?? []) as any[]) {
      const movementId: string | null = row.movement_id;
      const sessionId: string | null = row.session_id;
      if (!movementId || !sessionId) continue;

      if (!latestSessionByMovement.has(movementId)) {
        latestSessionByMovement.set(movementId, sessionId);
        rowsByMovement.set(movementId, []);
      }
      if (latestSessionByMovement.get(movementId) === sessionId) {
        rowsByMovement.get(movementId)!.push(row);
      }
    }

    const result: Record<string, PreviousPerformance> = {};
    rowsByMovement.forEach((rows, movementId) => {
      const ordered = [...rows].reverse(); // set sırası kronolojik olsun
      const isDuration = ordered.some((r) => r.duration_seconds != null);
      const values = ordered
        .map((r) => (isDuration ? r.duration_seconds : r.reps))
        .filter((v) => v != null);
      if (values.length === 0) return;

      const weights = ordered.map((r) => Number(r.added_weight_kg ?? 0)).filter((w) => w > 0);
      const weightSuffix = weights.length > 0 ? ` (+${Math.max(...weights)} kg)` : "";

      result[movementId] = {
        summary: `${values.join(" · ")} ${isDuration ? "sn" : "tekrar"}${weightSuffix}`,
        date: String(ordered[ordered.length - 1].completed_at ?? "").slice(0, 10),
      };
    });

    return result;
  },

  /**
   * Bir hareketin antrenman bazında gelişimi: her BİTMİŞ antrenman için o
   * antrenmandaki en iyi set. Grafiğin ham verisi.
   *
   * Tarihler yerel güne göre üretiliyor (bkz. utils/date) - aksi halde gece
   * yapılan antrenmanlar bir önceki güne etiketlenirdi.
   */
  async getMovementHistory(
    userId: string,
    movementId: string,
    limit = 10
  ): Promise<MovementHistoryPoint[]> {
    const { data, error } = await supabase
      .from("workout_sets")
      .select("session_id, reps, duration_seconds, workout_sessions!inner(user_id, ended_at, started_at)")
      .eq("workout_sessions.user_id", userId)
      .eq("movement_id", movementId)
      .not("workout_sessions.ended_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(400);
    if (error) throw error;

    const bySession = new Map<string, MovementHistoryPoint & { startedAt: string }>();

    for (const row of (data ?? []) as any[]) {
      const sessionId: string | null = row.session_id;
      const startedAt: string | undefined = row.workout_sessions?.started_at;
      if (!sessionId || !startedAt) continue;

      if (!bySession.has(sessionId)) {
        bySession.set(sessionId, {
          date: toLocalDateKey(startedAt),
          bestReps: 0,
          bestDuration: 0,
          setCount: 0,
          startedAt,
        });
      }
      const point = bySession.get(sessionId)!;
      point.setCount += 1;
      if ((row.reps ?? 0) > point.bestReps) point.bestReps = row.reps;
      if ((row.duration_seconds ?? 0) > point.bestDuration) point.bestDuration = row.duration_seconds;
    }

    return Array.from(bySession.values())
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
      .slice(-limit)
      .map(({ startedAt, ...point }) => point);
  },
};
