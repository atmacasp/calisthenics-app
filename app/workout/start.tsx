import { useEffect } from "react";
import { View, ActivityIndicator, Text, Alert } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useWorkoutStore } from "../../src/store/workoutStore";
import { workoutService } from "../../src/services/workout.service";
import { useColors } from "../../src/constants/theme";

export default function WorkoutStartScreen() {
  const COLORS = useColors();
  const session = useAuthStore((s) => s.session);
  const startSession = useWorkoutStore((s) => s.startSession);
  const restoreSession = useWorkoutStore((s) => s.restoreSession);
  const activeSessionId = useWorkoutStore((s) => s.activeSessionId);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    (async () => {
      try {
        const unfinished = await workoutService.getUnfinishedSession(session.user.id);

        // Hiç set girilmemiş yarım oturum varsa yenisini açmak yerine onu
        // kullanırız - aksi halde her yarım deneme DB'de çöp satır bırakıyordu.
        if (unfinished && unfinished.setCount === 0) {
          if (cancelled) return;
          // Bellekteki oturum zaten buysa startSession çağırma: o, hareket
          // listesini sıfırlıyor. Kullanıcı hareket ekleyip (henüz set
          // girmeden) ana sayfaya döndüyse seçtikleri kaybolurdu.
          if (activeSessionId !== unfinished.id) {
            startSession(unfinished.id, unfinished.programName);
          }
          router.replace(`/workout/session/${unfinished.id}`);
          return;
        }

        // Set girilmiş yarım oturum varsa kullanıcıya soralım; sessizce
        // yeni oturum açmak o setleri erişilemez bırakırdı.
        if (unfinished) {
          if (cancelled) return;
          Alert.alert(
            "Devam eden antrenman var",
            `${unfinished.movementCount} hareket, ${unfinished.setCount} set kaydedilmiş. Ona devam etmek ister misin?`,
            [
              {
                text: "Yeni Başlat",
                style: "destructive",
                onPress: async () => {
                  const created = await workoutService.startSession(session.user.id);
                  startSession(created.id);
                  router.replace(`/workout/session/${created.id}`);
                },
              },
              {
                text: "Devam Et",
                onPress: async () => {
                  const movements = await workoutService.getSessionState(unfinished.id);
                  restoreSession(unfinished.id, movements, unfinished.programName);
                  router.replace(`/workout/session/${unfinished.id}`);
                },
              },
            ]
          );
          return;
        }

        const created = await workoutService.startSession(session.user.id);
        if (cancelled) return;
        startSession(created.id);
        router.replace(`/workout/session/${created.id}`);
      } catch (error: any) {
        Alert.alert("Hata", error.message ?? "Antrenman başlatılamadı");
        router.back();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper }}>
      <ActivityIndicator color={COLORS.accent} />
      <Text style={{ marginTop: 12, fontFamily: "Inter_400Regular", color: COLORS.graphite }}>Antrenman hazırlanıyor...</Text>
    </View>
  );
}
