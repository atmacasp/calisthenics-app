import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../../src/store/authStore";
import { workoutsService } from "../../../src/services/workouts.service";
import { movementsService } from "../../../src/services/movements.service";
import { progressService } from "../../../src/services/progress.service";
import { profileService } from "../../../src/services/profile.service";
import { computeWorkoutAchievements, type WorkoutAchievements } from "../../../src/utils/workoutSummary";
import type { WorkoutSessionDetail } from "../../../src/types/workouts";
import { COLORS } from "../../../src/constants/theme";

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "-";
  const minutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  return `${hours} sa ${minutes % 60} dk`;
}

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<WorkoutSessionDetail | null>(null);
  const [achievements, setAchievements] = useState<WorkoutAchievements>({
    completedTargets: [],
    unlockedSteps: [],
  });
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    if (!id || !userId) return;
    try {
      const [sessionDetail, movements, afterMap, beforeMap, profile] = await Promise.all([
        workoutsService.getSessionDetail(id),
        movementsService.getAllMovementsWithPrerequisites(),
        progressService.getMovementSetLogs(userId),
        // Bu antrenman hariç durum: farkı almak için referans nokta.
        progressService.getMovementSetLogs(userId, id),
        profileService.getProfile(userId),
      ]);
      setDetail(sessionDetail);
      setAchievements(computeWorkoutAchievements(movements, beforeMap, afterMap));
      setStreak(profile?.current_streak ?? 0);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const close = () => router.replace("/(tabs)/workout");

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const setCount = detail?.movements.reduce((sum, m) => sum + m.sets.length, 0) ?? 0;
  const movementCount = detail?.movements.length ?? 0;
  const hasAchievements = achievements.completedTargets.length > 0 || achievements.unlockedSteps.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={30} color={COLORS.ink} />
        </View>
        <Text style={styles.heroTitle}>Antrenman tamamlandı</Text>
        {streak > 0 && <Text style={styles.heroStreak}>Serin {streak} gün</Text>}

        <View style={styles.statRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{detail ? formatDuration(detail.startedAt, detail.endedAt) : "-"}</Text>
            <Text style={styles.statLabel}>süre</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{movementCount}</Text>
            <Text style={styles.statLabel}>hareket</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{setCount}</Text>
            <Text style={styles.statLabel}>set</Text>
          </View>
        </View>
      </View>

      {achievements.completedTargets.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Tamamladığın hedefler</Text>
          {achievements.completedTargets.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.achievementCard}
              activeOpacity={0.75}
              onPress={() => router.push(`/movement/${m.id}`)}
            >
              <View style={styles.achievementIcon}>
                <Ionicons name="trophy" size={18} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementCategory}>{m.groupName}</Text>
                <Text style={styles.achievementName}>{m.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.graphite} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {achievements.unlockedSteps.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Kilidi açılan basamaklar</Text>
          {achievements.unlockedSteps.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.achievementCard, styles.unlockCard]}
              activeOpacity={0.75}
              onPress={() => router.push(`/movement/${m.id}`)}
            >
              <View style={[styles.achievementIcon, { backgroundColor: COLORS.ink }]}>
                <Ionicons name="lock-open" size={18} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementCategory}>{m.groupName}</Text>
                <Text style={styles.achievementName}>{m.name}</Text>
                <Text style={styles.achievementHint}>Artık bu basamağa çalışabilirsin</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.graphite} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {!hasAchievements && (
        <View style={styles.plainBox}>
          <MaterialCommunityIcons name="dumbbell" size={22} color={COLORS.graphite} />
          <Text style={styles.plainText}>
            Bu antrenmanda yeni bir hedef tamamlanmadı — ama her set birikiyor. Hedeflerine ne kadar
            yaklaştığını Hareket Kütüphanesi'nden görebilirsin.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.doneButton} onPress={close} activeOpacity={0.85}>
        <Text style={styles.doneButtonText}>Bitti</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryLink} onPress={() => router.replace(`/workout/history/${id}`)}>
        <Text style={styles.secondaryLinkText}>Antrenman detayını gör</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  hero: { backgroundColor: COLORS.ink, borderRadius: 24, padding: 22, alignItems: "center" },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.paper, marginTop: 14 },
  heroStreak: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.accent, marginTop: 4 },
  statRow: { flexDirection: "row", alignItems: "center", marginTop: 20, alignSelf: "stretch" },
  statCol: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(250,249,246,0.15)" },
  statNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: COLORS.paper },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(250,249,246,0.55)", marginTop: 2 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.ink, marginTop: 26, marginBottom: 10 },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    padding: 14,
    marginBottom: 10,
  },
  unlockCard: { borderColor: COLORS.line },
  achievementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementCategory: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: COLORS.graphite,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  achievementName: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.ink, marginTop: 2 },
  achievementHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.accent, marginTop: 2 },
  plainBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginTop: 26,
  },
  plainText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite, lineHeight: 19 },
  doneButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  doneButtonText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.white },
  secondaryLink: { alignItems: "center", marginTop: 14 },
  secondaryLinkText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.graphite, textDecorationLine: "underline" },
});
