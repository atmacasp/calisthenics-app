import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { workoutService } from "../../src/services/workout.service";
import { useAuthStore } from "../../src/store/authStore";
import { useWorkoutStore } from "../../src/store/workoutStore";
import { useProgramDay } from "../../src/hooks/useProgramDay";
import { ActiveSessionBanner } from "../../src/components/ActiveSessionBanner";
import { COLORS } from "../../src/constants/theme";
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../src/types/movements";
import { formatTarget, type TargetProgress } from "../../src/utils/targetProgress";
import { computeFocusSuggestions, summarizeSteps, type FocusSuggestion } from "../../src/utils/workoutSuggestions";

/** Hedefe kalan mesafeyi kart içinde gösteren ince çubuk. */
function TargetProgressBar({ progress }: { progress: TargetProgress }) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{progress.label}</Text>
      {progress.detail && <Text style={styles.progressDetail}>{progress.detail}</Text>}
    </View>
  );
}

export default function WorkoutScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const startSession = useWorkoutStore((s) => s.startSession);
  const addMovement = useWorkoutStore((s) => s.addMovement);

  // Bugünün program planı ve "tek dokunuşla başlat" mantığı Ana Sayfa ile ortak
  // hook'tan geliyor - eskiden bu ekranda ayrı bir kopyası duruyordu.
  const { plan, starting, reload: reloadProgram, startToday } = useProgramDay(userId);

  const [suggestions, setSuggestions] = useState<FocusSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  // Hic set kaydi yoksa "siradaki hedefin" demek olmayan bir gecmise atif olur.
  const [isNewUser, setIsNewUser] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const [movements, setLogMap]: [MovementWithGroupAndPrerequisites[], MovementSetLogMap] = await Promise.all([
        movementsService.getAllMovementsWithPrerequisites(),
        progressService.getMovementSetLogs(userId),
      ]);
      setSuggestions(computeFocusSuggestions(movements, setLogMap));
      setIsNewUser(Object.keys(setLogMap).length === 0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Sekmeye her dönüşte yeniden hesaplanır - bir antrenman bitirildiğinde veya
  // yeni bir hedef karşılandığında "Sırada Bu Var" listesi güncel kalır.
  useFocusEffect(
    useCallback(() => {
      loadData();
      reloadProgram();
    }, [loadData, reloadProgram])
  );

  // Tüm kategorilerin toplam basamak sayacı: "sırada ne var" listesinin üstünde
  // kullanıcının zincirlerde nerede olduğunu tek satırda özetler.
  const stepSummary = summarizeSteps(suggestions);

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

      <ActiveSessionBanner userId={userId} style={{ marginHorizontal: 0, marginTop: 0, marginBottom: 20 }} />

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleFreeStart}>
        <Text style={styles.primaryButtonText}>Antrenman Başlat</Text>
      </TouchableOpacity>

      <View style={styles.linksRow}>
        <TouchableOpacity
          style={styles.historyLink}
          activeOpacity={0.7}
          onPress={() => router.push("/workout/history")}
        >
          <Feather name="clock" size={16} color={COLORS.graphite} />
          <Text style={styles.historyLinkText}>Geçmiş Antrenmanlarım</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyLink}
          activeOpacity={0.7}
          onPress={() => router.push("/programs")}
        >
          <Feather name="calendar" size={16} color={COLORS.graphite} />
          <Text style={styles.historyLinkText}>Programlar</Text>
        </TouchableOpacity>
      </View>

      {plan && (
        <View style={styles.todayCard}>
          <View style={styles.todayHeaderRow}>
            <Feather name="calendar" size={14} color={COLORS.accent} />
            <Text style={styles.todayProgramName}>{plan.program.name}</Text>
          </View>
          <Text style={styles.todayDayName}>{plan.dayName}</Text>

          {plan.movements.length === 0 ? (
            <Text style={styles.restDayText}>Bugün dinlenme günü 🌿</Text>
          ) : (
            <>
              {plan.movements.map((pm) => (
                <View key={pm.id} style={styles.todayMovementRow}>
                  <Text style={styles.todayMovementName}>{pm.movementName}</Text>
                  <Text style={styles.todayMovementTarget}>
                    {pm.targetDurationSeconds
                      ? `${pm.targetSets ?? 1} set x ${pm.targetDurationSeconds} sn`
                      : `${pm.targetSets ?? 1} set x ${pm.targetReps ?? "-"} tekrar`}
                  </Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.todayStartButton}
                activeOpacity={0.85}
                disabled={starting}
                onPress={startToday}
              >
                {starting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.todayStartButtonText}>Bugünün Antrenmanına Başla</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>{isNewUser ? "Buradan Başla" : "Sırada Bu Var"}</Text>
        {stepSummary.total > 0 && (
          <Text style={styles.stepSummaryText}>
            {stepSummary.completed}/{stepSummary.total} basamak
          </Text>
        )}
      </View>
      <Text style={styles.sectionSubtitle}>{isNewUser ? "Kilidi açık ilk hedefin. Diğer kategoriler Temel Güç hedeflerini tamamladıkça açılır." : "Her kategoride bir sonraki hedefin"}</Text>

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
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardCategory} numberOfLines={1}>{s.groupName}</Text>
                  <Text style={styles.cardStepBadge}>
                    {s.stepIndex}/{s.chainLength}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{s.movement.name}</Text>
                {s.completed ? (
                  <Text style={styles.cardMetaAccent}>🏆 Bu kategoride en üst basamağa ulaştın</Text>
                ) : s.locked ? (
                  <>
                    <Text style={styles.cardMetaLocked}>
                      {s.blockingPrerequisite
                        ? `Önce: ${s.blockingPrerequisite.name}${
                            s.blockingPrerequisite.targetLabel ? ` — ${s.blockingPrerequisite.targetLabel}` : ""
                          }`
                        : "Temel Güç hazırlığı gerekiyor"}
                    </Text>
                    {s.blockingPrerequisite?.progress && (
                      <TargetProgressBar progress={s.blockingPrerequisite.progress} />
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.cardMeta}>{formatTarget(s.movement) ?? `Zorluk: ${s.movement.difficulty_level}/10`}</Text>
                    {s.progress && <TargetProgressBar progress={s.progress} />}
                  </>
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
    marginBottom: 14,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 28,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyLinkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: COLORS.graphite,
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepSummaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.graphite,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardStepBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: COLORS.graphite,
    backgroundColor: COLORS.paper,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  progressWrap: { marginTop: 8 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.line,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  progressLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.ink,
    marginTop: 5,
  },
  progressDetail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.graphite,
    marginTop: 2,
  },
  todayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  todayHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  todayProgramName: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  todayDayName: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: COLORS.ink,
    marginTop: 4,
    marginBottom: 12,
  },
  restDayText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.graphite },
  todayMovementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  todayMovementName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink, flex: 1, marginRight: 8 },
  todayMovementTarget: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
  todayStartButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  todayStartButtonText: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.white },
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
    flex: 1,
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
