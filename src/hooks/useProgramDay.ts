import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { programsService } from "../services/programs.service";
import { workoutService } from "../services/workout.service";
import { useWorkoutStore } from "../store/workoutStore";
import type { TodayProgramPlan } from "../types/programs";

/** Bugün bu programdan tamamlanmış antrenman - varsa ekranlar "bitti" hâlini gösterir. */
export interface CompletedTodaySession {
  id: string;
  startedAt: string;
}

/**
 * "Bugün programımda ne var ve tek dokunuşla nasıl başlarım" mantığının tek
 * kaynağı. Hem Ana Sayfa hem Antrenman tab'ı aynı davranışı paylaşsın diye
 * ekranlardan çıkarıldı.
 *
 * plan null            -> takip edilen aktif program yok
 * plan.movements boş   -> program var ama bugün dinlenme günü
 * completedToday dolu  -> bugünün program antrenmanı zaten bitirilmiş
 */
export function useProgramDay(userId?: string) {
  const startSessionInStore = useWorkoutStore((s) => s.startSession);
  const addMovement = useWorkoutStore((s) => s.addMovement);

  const [plan, setPlan] = useState<TodayProgramPlan | null>(null);
  const [completedToday, setCompletedToday] = useState<CompletedTodaySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setPlan(null);
      setCompletedToday(null);
      setLoading(false);
      return;
    }
    try {
      const todayPlan = await programsService.getActiveProgramForToday(userId);
      setPlan(todayPlan);
      // Dinlenme gününde "tamamlandı" sorusunun anlamı yok - sorgu da atılmaz.
      setCompletedToday(
        todayPlan && todayPlan.movements.length > 0
          ? await programsService.getTodayCompletedSession(userId, todayPlan.program.id)
          : null
      );
    } catch {
      // Program bilgisi ikincil - yüklenemezse ekran programsızmış gibi çalışır.
      setPlan(null);
      setCompletedToday(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Bugünün TÜM hareketlerini, programın kendi hedef ve dinlenme reçetesiyle
   * yükleyip program_id'li bir oturum açar ve aktif antrenman ekranına götürür.
   */
  const startToday = useCallback(async () => {
    if (!userId || !plan || starting || plan.movements.length === 0) return;
    setStarting(true);
    try {
      const session = await workoutService.startSession(userId, plan.program.id);
      startSessionInStore(session.id, `${plan.program.name} · ${plan.dayName}`);
      plan.movements.forEach((pm) => {
        if (!pm.movementId) return;
        addMovement({
          id: pm.movementId,
          name: pm.movementName,
          // program_movements'ta target_type kolonu yok; süre dolu mu diye bakıp çıkarıyoruz
          targetType: pm.targetDurationSeconds ? "duration" : "reps_sets",
          targetSets: pm.targetSets,
          targetReps: pm.targetReps,
          targetDurationSeconds: pm.targetDurationSeconds,
          restSeconds: pm.restSeconds,
        });
      });
      router.push(`/workout/session/${session.id}`);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Antrenman başlatılamadı");
    } finally {
      setStarting(false);
    }
  }, [userId, plan, starting, startSessionInStore, addMovement]);

  return {
    plan,
    loading,
    starting,
    reload,
    startToday,
    completedToday,
    hasProgram: !!plan,
    isRestDay: !!plan && plan.movements.length === 0,
  };
}
