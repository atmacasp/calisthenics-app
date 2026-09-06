
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { workoutService } from "../../src/services/workout.service";
import { useAuthStore } from "../../src/store/authStore";
import { useWorkoutStore } from "../../src/store/workoutStore";
import { COLORS } from "../../src/constants/theme";
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../src/types/movements";
import { formatTarget } from "../../src/utils/targetProgress";
import { computeFocusSuggestions, type FocusSuggestion } from "../../src/utils/workoutSuggestions";

export default function WorkoutScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const startSession = useWorkoutStore((s) => s.startSession);
  const addMovement = useWorkoutStore((s) => s.addMovement);

  const [suggestions, setSuggestions] = useState<FocusSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const [movements, setLogMap]: [MovementWithGroupAndPrerequisites[], MovementSetLogMap] = await Promise.all([
        movementsService.getAllMovementsWithPrerequisites(),
        progressService.getMovementSetLogs(userId),
      ]);
      setSuggestions(computeFocusSuggestions(movements, setLogMap));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Sekmeye her dönüşte yeniden hesaplanır - bir antrenman bitirildiğinde veya
  // yeni bir hedef karşılandığında "Sırada Bu Var" listesi güncel kalır.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleFreeStart = () => router.push("/workout/start");

  const handleQuickStart = async (suggestion: FocusSuggestion) => {
    if (!userId || startingId) return;
    setStartingId(suggestion.movement.id);
    try {
      const newSession = await workoutService.startSession(userId);
      startSession(newSession.id);
      addMovement({
        id: suggestion.movement.id,
        name: suggestion.movement.name,
        groupName: suggestion.movement.movement_groups?.name,
        targetType: suggestion.movement.target_type,
        targetSets: suggestion.movement.target_sets,
        targetReps: suggestion.movement.target_reps,
        targetDurationSeconds: suggestion.movement.target_duration_seconds,
      });
      router.push(`/workout/session/${newSession.id}`);
    } finally {
      setStartingId(null);
    }
  };

  const handleCardPress = (suggestion: FocusSuggestion) => {
    if (suggestion.locked || suggestion.completed) {
      router.push(`/movement/${suggestion.movement.id}`);
    } else {
      handleQuickStart(suggestion);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Antrenman</Text>
      <Text style={styles.subtitle}>Hazır olduğunda antrenmanına başla, ya da sıradaki hedeflerinden birine dokun.</Text>

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleFreeStart}>
        <Text style={styles.primaryButtonText}>Antrenman Başlat</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Sırada Bu Var</Text>
      <Text style={styles.sectionSubtitle}>Her kategoride bir sonraki hedefin</Text>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      )}

      {!loading &&
        suggestions.map((s) => {
          const isStarting = startingId === s.movement.id;
          return (
            <TouchableOpacity
              key={s.movement.id}
              style={styles.card}
              activeOpacity={0.7}
              disabled={isStarting}
              onPress={() => handleCardPress(s)}
            >
              <View
                style={[
                  styles.cardAccent,
                  { backgroundColor: s.locked ? COLORS.line : COLORS.accent },
                ]}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardCategory}>{s.groupName}</Text>
                <Text style={styles.cardTitle}>{s.movement.name}</Text>
                {s.completed ? (
                  <Text style={styles.cardMetaAccent}>🏆 Bu kategoride en üst basamağa ulaştın</Text>
                ) : s.locked ? (
                  <Text style={styles.cardMetaLocked}>Temel Güç hazırlığı gerekiyor</Text>
                ) : (
                  <Text style={styles.cardMeta}>{formatTarget(s.movement) ?? `Zorluk: ${s.movement.difficulty_level}/10`}</Text>
                )}
              </View>
              {isStarting ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : s.completed ? (
                <Feather name="award" size={20} color={COLORS.accent} />
              ) : s.locked ? (
                <Feather name="lock" size={20} color={COLORS.graphite} />
              ) : (
                <Feather name="play-circle" size={22} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  content: { padding: 22, paddingTop: 48, paddingBottom: 60 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: COLORS.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
    marginBottom: 20,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 32,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  sectionHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.graphite,
    marginTop: 4,
    marginBottom: 16,
  },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    height: 32,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardCategory: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.graphite,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: COLORS.ink,
  },
  cardMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.graphite,
    marginTop: 2,
  },
  cardMetaLocked: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.graphite,
    marginTop: 2,
  },
  cardMetaAccent: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 2,
  },
});
