import { useCallback } from "react";
import { Alert } from "react-native";
import { workoutService } from "../services/workout.service";
import { useWorkoutStore } from "../store/workoutStore";

export interface RemoveSetRequest {
  setId: string;
  /** Uyarı metninde görünen sıra numarası. */
  setNumber: number;
  /**
   * AKTİF antrenman ekranı için: setin ait olduğu hareket. Verilirse silme
   * sonrası bellekteki oturum da güncellenir.
   */
  movementId?: string;
  /**
   * Kendi verisini servisten çeken ekranlar (geçmiş detayı) için: silme
   * başarılı olunca çağrılır, ekran listesini tazeler.
   */
  onRemoved?: () => void;
}

/**
 * Tek bir setin silinmesi (onay + DB + ekran durumu). Aktif antrenman ekranı
 * zaten büyük olduğu için mantık dışarı alındı; ekran tek satırla kullanıyor.
 *
 * Önce DB'den silinir, sonra ekrandan: sıra tersine olsaydı silme başarısız
 * olduğunda ekranda görünmeyen ama rekor/hedef hesabına giren bir set kalırdı.
 *
 * Parametreler NESNE olarak alınıyor. Konumsal olduğu sürümde geçmiş ekranı
 * üç parametreli fonksiyonu iki parametreyle çağırıyordu: set numarası
 * movementId'nin yerine geçiyor, uyarı kutusu "undefined. set" yazıyordu ve
 * tip denetimi bunu yakalamıyordu. Nesneyle o hata mümkün değil.
 */
export function useSetRemoval() {
  const removeSetFromMovement = useWorkoutStore((s) => s.removeSetFromMovement);

  const confirmRemoveSet = useCallback(
    ({ setId, setNumber, movementId, onRemoved }: RemoveSetRequest) => {
      Alert.alert("Seti sil", `${setNumber}. set kaydı silinecek.`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await workoutService.removeSet(setId);
              if (movementId) removeSetFromMovement(movementId, setId);
              onRemoved?.();
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
