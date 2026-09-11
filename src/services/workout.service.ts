import { supabase } from "../lib/supabase";
import { profileService } from "./profile.service";
import type { SessionMovement } from "../store/workoutStore";

/** Bitirilmemiş (ended_at null) bir oturumun özeti - "devam eden antrenman" bandı için. */
export interface UnfinishedSession {
  id: string;
  startedAt: string;
  /** Oturum bir programdan başlatıldıysa "Program Adı" (gün adı DB'de tutulmuyor). */
  programName: string | null;
  setCount: number;
  movementCount: number;
}

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

  /**
   * Antrenman başlatmanın TEK kapısı.
   *
   * Hiç set girilmemiş yarım bir oturum varsa yenisini açmak yerine onu geri
   * kullanır (yoksa her yanlış dokunuş DB'de çöp satır bırakıyordu) - AMA
   * started_at'i o anki zamana çeker. Bu damga olmadan saatler önce açılmış
   * boş satır geri kullanıldığında antrenman 3 saat 38 dakika sürmüş
   * görünüyordu: süre ended_at - started_at ile hesaplanıyor ve sayaç
   * kullanıcı "başlat"a basmadan çok önce başlamış oluyordu.
   *
   * program_id de tazeleniyor: boş satır program günüyle açılıp serbest
   * antrenmana dönülmüşse (ya da tersi) eski bağ kalmasın.
   */
  async beginSession(userId: string, programId?: string) {
    const unfinished = await workoutService.getUnfinishedSession(userId);

    if (unfinished && unfinished.setCount === 0) {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ started_at: new Date().toISOString(), program_id: programId ?? null })
        .eq("id", unfinished.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    return workoutService.startSession(userId, programId);
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
   * Yanlış girilen tek bir seti siler. Set anında DB'ye yazıldığı ve rekor /
   * hedef hesaplarına girdiği için, düzeltmenin tek doğru yolu kaydı silmek.
   */
  async removeSet(setId: string) {
    const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
    if (error) throw error;
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

  /**
   * Kullanıcının bitirilmemiş EN SON oturumunu döner. Uygulama kapanıp
   * açıldığında bellekteki oturum kaybolduğu için, DB'deki bu satır
   * antrenmanı kurtarmanın tek yolu.
   */
  async getUnfinishedSession(userId: string): Promise<UnfinishedSession | null> {
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .select("id, started_at, programs(name)")
      .eq("user_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!session) return null;

    const { data: sets, error: setsError } = await supabase
      .from("workout_sets")
      .select("movement_id")
      .eq("session_id", session.id);
    if (setsError) throw setsError;

    const movementIds = new Set((sets ?? []).map((s: any) => s.movement_id).filter(Boolean));

    return {
      id: session.id,
      startedAt: session.started_at,
      programName: (session as any).programs?.name ?? null,
      setCount: sets?.length ?? 0,
      movementCount: movementIds.size,
    };
  },

  /**
   * Bir oturumun ekran durumunu DB'deki setlerden yeniden kurar.
   *
   * Sıralama set_number'a değil kayıt zamanına göre: set_number ekranda
   * "mevcut set sayısı + 1" olarak üretiliyor, aradan bir set silinirse aynı
   * numara tekrar kullanılabiliyor. completed_at her durumda doğru sırayı verir.
   *
   * Sınır: antrenmana eklenip HİÇ set girilmemiş hareketler geri gelmez -
   * onların tek izi bellekteydi. Kullanıcı isterse tek dokunuşla yeniden ekler.
   */
  async getSessionState(sessionId: string): Promise<SessionMovement[]> {
    const { data, error } = await supabase
      .from("workout_sets")
      .select(
        `id, movement_id, set_number, reps, duration_seconds, added_weight_kg, completed_at,
         movements(id, name, target_type, target_sets, target_reps, target_duration_seconds, movement_groups(name))`
      )
      .eq("session_id", sessionId)
      .order("completed_at", { ascending: true });
    if (error) throw error;

    const byMovement = new Map<string, SessionMovement>();
    (data ?? []).forEach((row: any) => {
      const movement = row.movements;
      if (!movement) return;
      if (!byMovement.has(movement.id)) {
        byMovement.set(movement.id, {
          movementId: movement.id,
          name: movement.name,
          groupName: movement.movement_groups?.name ?? null,
          targetType: movement.target_type,
          targetSets: movement.target_sets,
          targetReps: movement.target_reps,
          targetDurationSeconds: movement.target_duration_seconds,
          sets: [],
        });
      }
      byMovement.get(movement.id)!.sets.push({
        id: row.id,
        reps: row.reps ?? undefined,
        duration_seconds: row.duration_seconds ?? undefined,
        added_weight_kg: row.added_weight_kg ?? undefined,
      });
    });

    return Array.from(byMovement.values());
  },

  /**
   * En son BİTMİŞ antrenmanın id'si. "Son antrenmanı tekrarla" için;
   * hareket listesini getSessionState ile buradan kuruyoruz.
   */
  async getLastFinishedSessionId(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  },

  /** Yarım kalmış bir oturumu setleriyle birlikte siler (workout_sets FK cascade). */
  async discardSession(sessionId: string) {
    const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
    if (error) throw error;
  },
};
