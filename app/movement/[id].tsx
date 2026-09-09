
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { performanceService, type MovementHistoryPoint } from "../../src/services/performance.service";
import { workoutService } from "../../src/services/workout.service";
import { useAuthStore } from "../../src/store/authStore";
import { useWorkoutStore } from "../../src/store/workoutStore";
import { COLORS } from "../../src/constants/theme";
import type { MovementWithPrerequisites, MovementSetLogMap } from "../../src/types/movements";
import { areAllPrerequisitesMet, computeTargetProgress, formatTarget, getPrerequisiteTarget, isPrerequisiteMet } from "../../src/utils/targetProgress";

const WARN = "#dc2626";

export default function MovementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const startSession = useWorkoutStore((s) => s.startSession);
  const addMovement = useWorkoutStore((s) => s.addMovement);
  const [movement, setMovement] = useState<MovementWithPrerequisites | null>(null);
  const [setLogMap, setSetLogMap] = useState<MovementSetLogMap>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [history, setHistory] = useState<MovementHistoryPoint[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      movementsService.getMovementById(id),
      userId ? progressService.getMovementSetLogs(userId) : Promise.resolve({} as MovementSetLogMap),
      userId ? performanceService.getMovementHistory(userId, id) : Promise.resolve([] as MovementHistoryPoint[]),
    ])
      .then(([m, logs, hist]) => {
        setMovement(m);
        setSetLogMap(logs);
        setHistory(hist);
      })
      .finally(() => setLoading(false));
  }, [id, userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Hareket" }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!movement) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Hareket" }} />
        <Text style={styles.notFoundText}>Hareket bulunamadı.</Text>
      </View>
    );
  }

  const targetText = formatTarget(movement);
  const targetProgress = computeTargetProgress(movement, setLogMap[movement.id]);
  // Grafik hangi metriği çizecek: hedef süreyse saniye, değilse tekrar.
  const isDurationTarget = movement.target_type === "duration";
  const historyMax = Math.max(1, ...history.map((p) => (isDurationTarget ? p.bestDuration : p.bestReps)));
  const prerequisites = movement.prerequisites ?? [];
  const metCount = prerequisites.filter((p) => isPrerequisiteMet(p, setLogMap)).length;
  const allMet = prerequisites.length === 0 || metCount === prerequisites.length;
  const movementLocked = !areAllPrerequisitesMet(prerequisites, setLogMap);

  const handleQuickStart = async () => {
    if (!userId || movementLocked || starting) return;
    setStarting(true);
    try {
      const newSession = await workoutService.startSession(userId);
      startSession(newSession.id);
      addMovement({
        id: movement.id,
        name: movement.name,
        groupName: movement.movement_groups?.name,
        targetType: movement.target_type,
        targetSets: movement.target_sets,
        targetReps: movement.target_reps,
        targetDurationSeconds: movement.target_duration_seconds,
      });
      router.push(`/workout/session/${newSession.id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: movement.name }} />
      {/* Görsel yoksa boş gri kutu çizmiyoruz - "yakında" vaadi yerine hiç yer kaplamasın. */}
      {movement.gif_url ? (
        <View style={styles.imageBox}>
          <Image source={{ uri: movement.gif_url }} style={styles.image} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={styles.category}>{movement.movement_groups?.name}</Text>
        <Text style={styles.title}>{movement.name}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>Zorluk: {movement.difficulty_level}/10</Text>
        </View>
        <Text style={styles.description}>{movement.description}</Text>

        {movement.how_to?.length ? (
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>Nasıl Yapılır</Text>
            {movement.how_to.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {movement.cues?.length ? (
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>İpuçları</Text>
            {movement.cues.map((cue, i) => (
              <View key={i} style={styles.bulletRow}>
                <Feather name="check" size={14} color={COLORS.accent} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>{cue}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {movement.mistakes?.length ? (
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>Sık Yapılan Hatalar</Text>
            {movement.mistakes.map((mistake, i) => (
              <View key={i} style={styles.bulletRow}>
                <Feather name="x" size={14} color={WARN} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>{mistake}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {targetText && (
          <View style={styles.targetCard}>
            <Text style={styles.targetLabel}>Hedef</Text>
            <Text style={styles.targetValue}>{targetText}</Text>
            {targetProgress && (
              <View style={{ marginTop: 10 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: COLORS.line, overflow: "hidden" }}>
                  <View style={{ height: 6, borderRadius: 3, width: `${Math.round(targetProgress.ratio * 100)}%`, backgroundColor: COLORS.accent }} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: targetProgress.met ? COLORS.accent : COLORS.ink }}>
                    {targetProgress.met ? "Hedef tamamlandı" : targetProgress.label}
                  </Text>
                  {targetProgress.detail && (
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite }}>
                      {targetProgress.detail}
                    </Text>
                  )}
                </View>
              </View>
            )}
            {movement.target_note && <Text style={styles.targetNote}>{movement.target_note}</Text>}
          </View>
        )}

        <TouchableOpacity
          style={[styles.quickStartButton, movementLocked && styles.quickStartButtonDisabled]}
          activeOpacity={0.85}
          disabled={movementLocked || starting}
          onPress={handleQuickStart}
        >
          {starting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Feather name={movementLocked ? "lock" : "play"} size={18} color={movementLocked ? COLORS.graphite : COLORS.white} />
              <Text style={[styles.quickStartText, movementLocked && styles.quickStartTextDisabled]}>
                {movementLocked ? "Önce ön koşulları tamamla" : "Bu Hareketle Antrenman Başlat"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {prerequisites.length > 0 && (
          <View style={styles.prereqSection}>
            <View style={styles.prereqHeaderRow}>
              <Text style={styles.prereqTitle}>Bu adıma geçmeden önce</Text>
              <View style={[styles.statusPill, allMet ? styles.statusPillMet : styles.statusPillLocked]}>
                <Feather name={allMet ? "unlock" : "lock"} size={12} color={allMet ? COLORS.accent : COLORS.graphite} />
                <Text style={[styles.statusPillText, { color: allMet ? COLORS.accent : COLORS.graphite }]}>
                  {allMet ? "Hazırsın" : `${metCount}/${prerequisites.length} tamam`}
                </Text>
              </View>
            </View>
            <Text style={styles.prereqHint}>Detayını görmek ve hemen çalışmak için bir hareketin üzerine dokun</Text>
            {prerequisites.map((p) => {
              const pm = p.prerequisite_movement;
              const overrideTarget = formatTarget(getPrerequisiteTarget(p));
              const met = isPrerequisiteMet(p, setLogMap);
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={styles.prereqRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/movement/${pm.id}`)}
                >
                  <View style={[styles.prereqAccent, { backgroundColor: met ? COLORS.accent : COLORS.line }]} />
                  <View style={styles.prereqLeft}>
                    <Text style={styles.prereqName}>{pm.name}</Text>
                    {overrideTarget && <Text style={styles.prereqTarget}>{overrideTarget}</Text>}
                  </View>
                  <Feather
                    name={met ? "check-circle" : "lock"}
                    size={18}
                    color={met ? COLORS.accent : COLORS.graphite}
                    style={{ marginRight: 8 }}
                  />
                  <Feather name="chevron-right" size={20} color={COLORS.graphite} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      {history.length > 1 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Gelişim</Text>
          <Text style={styles.historySubtitle}>
            Son {history.length} antrenmandaki en iyi setin
          </Text>
          <View style={styles.historyChart}>
            {history.map((p, i) => {
              const value = isDurationTarget ? p.bestDuration : p.bestReps;
              const barHeight = Math.max(6, Math.round((value / historyMax) * 92));
              const isBest = value === historyMax && value > 0;
              return (
                <View key={`${p.date}-${i}`} style={styles.historyCol}>
                  <Text style={styles.historyValue}>{value}</Text>
                  <View style={[styles.historyBar, { height: barHeight }, isBest && styles.historyBarBest]} />
                  <Text style={styles.historyLabel}>{p.date.slice(5)}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.historyUnit}>{isDurationTarget ? "saniye" : "tekrar"}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  notFoundText: { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.graphite },
  imageBox: { height: 220, backgroundColor: COLORS.line },
  image: { width: "100%", height: "100%" },
  guideSection: { marginTop: 24 },
  guideTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink, marginBottom: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  stepNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumber: { fontFamily: "Inter_700Bold", fontSize: 12, color: COLORS.accent },
  stepText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.ink, lineHeight: 21 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  bulletIcon: { marginTop: 3 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.graphite, lineHeight: 21 },
  content: { padding: 22 },
  historySection: { paddingHorizontal: 22, paddingBottom: 36 },
  historyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.ink },
  historySubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2, marginBottom: 14 },
  historyChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 14,
    paddingTop: 20,
    height: 170,
  },
  historyCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  historyValue: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.graphite, marginBottom: 6 },
  historyBar: { width: 14, borderRadius: 4, backgroundColor: "rgba(34,197,94,0.35)" },
  historyBarBest: { backgroundColor: COLORS.accent },
  historyLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: COLORS.graphite, marginTop: 6 },
  historyUnit: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 8, textAlign: "right" },
  category: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.accent,
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: COLORS.ink,
    marginBottom: 12,
  },
  difficultyBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  difficultyText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.ink },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.ink,
  },
  targetCard: {
    marginTop: 20,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  targetLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  targetValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.ink },
  targetNote: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite, marginTop: 6 },
  quickStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  quickStartButtonDisabled: { backgroundColor: COLORS.line },
  quickStartText: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.white },
  quickStartTextDisabled: { color: COLORS.graphite },
  prereqSection: { marginTop: 28 },
  prereqHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  prereqTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillMet: { backgroundColor: "rgba(34, 197, 94, 0.12)" },
  statusPillLocked: { backgroundColor: COLORS.line },
  statusPillText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  prereqHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2, marginBottom: 10 },
  prereqRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  prereqAccent: { width: 4, alignSelf: "stretch" },
  prereqLeft: { flex: 1, paddingVertical: 14, paddingLeft: 14 },
  prereqName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.ink },
  prereqTarget: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite, marginTop: 2 },
});
