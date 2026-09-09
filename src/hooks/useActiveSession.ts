import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { workoutService, type UnfinishedSession } from "../services/workout.service";
import { useWorkoutStore } from "../store/workoutStore";

/**
 * "Yarım kalmış antrenmanın var" durumunun tek kaynağı.
 *
 * workoutStore sadece bellekte yaşadığı için uygulama yeniden yüklendiğinde
 * aktif oturum kaybolur; setler DB'de durur ama kullanıcı onlara ulaşamaz.
 * Bu hook o oturumu bulur, geri yükler ya da siler.
 */
export function useActiveSession(userId?: string) {
  const restoreSession = useWorkoutStore((s) => s.restoreSession);
  const resetStore = useWorkoutStore((s) => s.reset);

  const [pending, setPending] = useState<UnfinishedSession | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setPending(null);
      return;
    }
    try {
      setPending(await workoutService.getUnfinishedSession(userId));
    } catch {
      setPending(null);
    }
  }, [userId]);

  const resume = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const movements = await workoutService.getSessionState(pending.id);
      restoreSession(pending.id, movements, pending.programName);
      router.push(`/workout/session/${pending.id}`);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Antrenman geri yüklenemedi");
    } finally {
      setBusy(false);
    }
  }, [pending, busy, restoreSession]);

  const discard = useCallback(() => {
    if (!pending || busy) return;
    const detail =
      pending.setCount > 0
        ? `Bu antrenmandaki ${pending.setCount} set kalıcı olarak silinecek.`
        : "Bu antrenmanda hiç set kaydedilmemiş.";
    Alert.alert("Antrenmanı Sil", detail, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await workoutService.discardSession(pending.id);
            resetStore();
            setPending(null);
          } catch (error: any) {
            Alert.alert("Hata", error.message ?? "Silinemedi");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [pending, busy, resetStore]);

  return { pending, busy, reload, resume, discard };
}
