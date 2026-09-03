import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useWorkoutStore } from "../../src/store/workoutStore";
import { workoutService } from "../../src/services/workout.service";

export default function WorkoutStartScreen() {
  const session = useAuthStore((s) => s.session);
  const startSession = useWorkoutStore((s) => s.startSession);

  useEffect(() => {
    if (!session) return;
    workoutService.startSession(session.user.id).then((newSession) => {
      startSession(newSession.id);
      router.replace(`/workout/session/${newSession.id}`);
    });
  }, [session]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
      <Text style={{ marginTop: 12 }}>Antrenman başlatılıyor...</Text>
    </View>
  );
}
