import { supabase } from "../lib/supabase";
import type { SessionMovementDetail, WorkoutSessionDetail, WorkoutSessionSummary } from "../types/workouts";

/**
 * workout.service.ts (tekil) AKTİF antrenmanı yönetir (başlat/bitir/set ekle).
 * Bu dosya ise TAMAMLANMIŞ antrenmanları listelemek/görüntülemek/düzenlemek
 * için var - aynı workout_sessions/workout_sets tablolarını okuma amaçlı
 * kullanır, ayrı bir domain (geçmiş) olduğu için ayrı dosyada tutuluyor.
 */
export const workoutsService = {
  /**
   * Kullanıcının TAMAMLANMIŞ (ended_at dolu) antrenmanlarını en yeniden eskiye
   * listeler. Hareket adları da çekilir: liste ekranında bir antrenmanı ayırt
   * eden asıl bilgi süre/set sayısı değil, ne çalışıldığıdır.
   */
  async listSessions(userId: string, limit = 50): Promise<WorkoutSessionSummary[]> {
    const { data: sessions, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select("id, started_at, ended_at, notes, programs(name)")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (sessionsError) throw sessionsError;
    if (!sessions?.length) return [];

    const sessionIds = sessions.map((s) => s.id);
    const { data: sets, error: setsError } = await supabase
      .from("workout_sets")
      .select("session_id, movement_id, completed_at, movements(name)")
      .in("session_id", sessionIds)
      .order("completed_at", { ascending: true });
    if (setsError) throw setsError;

    const statsBySession = new Map<
      string,
      { setCount: number; movementIds: Set<string>; movementNames: string[] }
    >();

    (sets ?? []).forEach((s: any) => {
      if (!s.session_id) return;
      const entry =
        statsBySession.get(s.session_id) ?? { setCount: 0, movementIds: new Set<string>(), movementNames: [] };
      entry.setCount += 1;
      if (s.movement_id && !entry.movementIds.has(s.movement_id)) {
        entry.movementIds.add(s.movement_id);
        // Setler kronolojik geldiği için isimler de çalışılma sırasında birikir.
        if (s.movements?.name) entry.movementNames.push(s.movements.name);
      }
      statsBySession.set(s.session_id, entry);
    });

    return sessions.map((s: any) => {
      const stats = statsBySession.get(s.id);
      return {
        id: s.id,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        notes: s.notes,
        movementCount: stats?.movementIds.size ?? 0,
        setCount: stats?.setCount ?? 0,
        movementNames: stats?.movementNames ?? [],
        programName: s.programs?.name ?? null,
      };
    });
  },

  /** Bir antrenmanın tüm setlerini hareket adı/kategorisiyle birlikte, hareket bazında gruplanmış döner. */
  async getSessionDetail(sessionId: string): Promise<WorkoutSessionDetail | null> {
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("id, started_at, ended_at, notes")
      .eq("id", sessionId)
      .single();
    if (sessionError) throw sessionError;
    if (!session) return null;

    const { data: sets, error: setsError } = await supabase
      .from("workout_sets")
      .select(
        `
        id, set_number, reps, duration_seconds, added_weight_kg,
        movements(id, name, movement_groups(name))
      `
      )
      .eq("session_id", sessionId)
      .order("set_number", { ascending: true });
    if (setsError) throw setsError;

    const order: string[] = [];
    const byMovement = new Map<string, SessionMovementDetail>();
    (sets ?? []).forEach((row: any) => {
      const movement = row.movements;
      if (!movement) return;
      if (!byMovement.has(movement.id)) {
        byMovement.set(movement.id, {
          movementId: movement.id,
          movementName: movement.name,
          groupName: movement.movement_groups?.name ?? null,
          sets: [],
        });
        order.push(movement.id);
      }
      byMovement.get(movement.id)!.sets.push({
        id: row.id,
        setNumber: row.set_number,
        reps: row.reps,
        durationSeconds: row.duration_seconds,
        addedWeightKg: row.added_weight_kg,
      });
    });

    return {
      id: session.id,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      notes: session.notes,
      movements: order.map((mId) => byMovement.get(mId)!),
    };
  },

  async updateSessionNotes(sessionId: string, notes: string): Promise<void> {
    const { error } = await supabase.from("workout_sessions").update({ notes }).eq("id", sessionId);
    if (error) throw error;
  },

  /** Antrenmanı siler - workout_sets satırları FK'daki "on delete cascade" ile otomatik silinir. */
  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
    if (error) throw error;
  },
};
