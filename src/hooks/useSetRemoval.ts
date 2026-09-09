import { useCallback } from "react";
import { Alert } from "react-native";
import { workoutService } from "../services/workout.service";
import { useWorkoutStore } from "../store/workoutStore";

/**
 * Tek bir setin silinmesi (onay + DB + ekran durumu). Aktif antrenman ekranı
 * zaten büyük olduğu için mantık dışarı alındı; ekran tek satırla kullanıyor.
 *
 * Önce DB'den silinir, sonra ekrandan: sıra tersine olsaydı silme başarısız
 * olduğunda ekranda görünmeyen ama rekor/hedef hesabına giren bir set kalırdı.
 */
export function useSetRemoval() {
  const removeSetFromMovement = useWorkoutStore((s) => s.removeSetFromMovement);

  const confirmRemoveSet = useCallback(
    (setId: string, movementId: string, setNumber: number) => {
      Alert.alert("Seti sil", `${setNumber}. set kaydı silinecek.`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await workoutService.removeSet(setId);
              removeSetFromMovement(movementId, setId);
            } catch (error: any) {
              Alert.alert("Hata", error.message ?? "Set silinemedi");
            }
          },
        },
      ]);
    },
    [removeSetFromMovement]
  );

  return { confirmRemoveSet };
}
