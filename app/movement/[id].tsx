
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import { COLORS } from "../../src/constants/theme";
import type { MovementWithPrerequisites, MovementSetLogMap, TargetSpec } from "../../src/types/movements";
import { getPrerequisiteTarget, isPrerequisiteMet } from "../../src/utils/targetProgress";

function formatTarget(t: TargetSpec | null | undefined) {
  if (!t?.target_type) return null;
  if (t.target_type === "reps_sets" && t.target_sets && t.target_reps) {
    return `${t.target_sets} set x ${t.target_reps} tekrar`;
  }
  if (t.target_type === "duration" && t.target_duration_seconds) {
    return `${t.target_duration_seconds} saniye tutuş`;
  }
  return null;
}

export default function MovementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [movement, setMovement] = useState<MovementWithPrerequisites | null>(null);
  const [setLogMap, setSetLogMap] = useState<MovementSetLogMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      movementsService.getMovementById(id),
      userId ? progressService.getMovementSetLogs(userId) : Promise.resolve({} as MovementSetLogMap),
    ])
      .then(([m, logs]) => {
        setMovement(m);
        setSetLogMap(logs);
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
  const prerequisites = movement.prerequisites ?? [];
  const metCount = prerequisites.filter((p) => isPrerequisiteMet(p, setLogMap)).length;
  const allMet = prerequisites.length === 0 || metCount === prerequisites.length;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: movement.name }} />
      <View style={styles.imagePlaceholder}>
        {movement.gif_url ? (
          <Image source={{ uri: movement.gif_url }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>Görsel/GIF yakında eklenecek</Text>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.category}>{movement.movement_groups?.name}</Text>
        <Text style={styles.title}>{movement.name}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>Zorluk: {movement.difficulty_level}/10</Text>
        </View>
        <Text style={styles.description}>{movement.description}</Text>

        {targetText && (
          <View style={styles.targetCard}>
            <Text style={styles.targetLabel}>Hedef</Text>
            <Text style={styles.targetValue}>{targetText}</Text>
            {movement.target_note && <Text style={styles.targetNote}>{movement.target_note}</Text>}
          </View>
        )}

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
            <Text style={styles.prereqHint}>Detayını görmek için bir hareketin üzerine dokun</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  notFoundText: { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.graphite },
  imagePlaceholder: {
    height: 220,
    backgroundColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  placeholderText: { fontFamily: "Inter_400Regular", color: COLORS.graphite },
  content: { padding: 22 },
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
  prereqSection: { marginTop: 24 },
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
