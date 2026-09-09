import { useCallback } from "react";
import { Alert } from "react-native";
import { bodyWeightService } from "../services/bodyweight.service";
import { useAuthStore } from "../store/authStore";

/** Yanlış girilen kilo kaydını silme (onay + DB + listeyi tazeleme). */
export function useWeightLog() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const confirmRemoveWeight = useCallback(
    (log: any, onDone?: () => void) => {
      if (!log || !userId) return;
      Alert.alert("Kaydı sil", `${log.weight_kg} kg (${log.logged_at}) kaydı silinecek.`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await bodyWeightService.removeLog(log.id, userId);
              onDone?.();
            } catch (error: any) {
              Alert.alert("Hata", error.message ?? "Kayıt silinemedi");
            }
          },
        },
      ]);
    },
    [userId]
  );

  return { confirmRemoveWeight };
}
