import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import type { MovementWithPrerequisites, MovementSetLogMap } from "../../src/types/movements";
import { getPrerequisiteTarget, isPrerequisiteMet } from "../../src/utils/targetProgress";
import type { TargetSpec } from "../../src/types/movements";

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
        <ActivityIndicator color="#22c55e" />
      </View>
    );
  }

  if (!movement) {
    return (
      <View style={styles.center}>
        <Text>Hareket bulunamadı.</Text>
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
                <Feather name={allMet ? "unlock" : "lock"} size={12} color={allMet ? "#059669" : "#b45309"} />
                <Text style={[styles.statusPillText, { color: allMet ? "#059669" : "#b45309" }]}>
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
                  activeOpacity={0.6}
                  onPress={() => router.push(`/movement/${pm.id}`)}
                >
                  <View style={[styles.prereqAccent, { backgroundColor: met ? "#22c55e" : "#d1d5db" }]} />
                  <View style={styles.prereqLeft}>
                    <Text style={styles.prereqName}>{pm.name}</Text>
                    {overrideTarget && <Text style={styles.prereqTarget}>{overrideTarget}</Text>}
                  </View>
                  <Feather
                    name={met ? "check-circle" : "lock"}
                    size={18}
                    color={met ? "#22c55e" : "#9ca3af"}
                    style={{ marginRight: 8 }}
                  />
                  <Feather name="chevron-right" size={20} color="#9ca3af" />
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
  container: { flex: 1, backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  imagePlaceholder: { height: 220, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  placeholderText: { color: "#9ca3af" },
  content: { padding: 20 },
  category: { color: "#22c55e", fontWeight: "600", marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 12 },
  difficultyBadge: { alignSelf: "flex-start", backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  difficultyText: { fontWeight: "600", color: "#374151" },
  description: { fontSize: 16, lineHeight: 24, color: "#374151" },
  targetCard: { marginTop: 20, backgroundColor: "#ecfdf5", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#a7f3d0" },
  targetLabel: { fontSize: 12, fontWeight: "700", color: "#059669", textTransform: "uppercase", marginBottom: 4 },
  targetValue: { fontSize: 18, fontWeight: "700", color: "#065f46" },
  targetNote: { fontSize: 13, color: "#047857", marginTop: 6 },
  prereqSection: { marginTop: 24 },
  prereqHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  prereqTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillMet: { backgroundColor: "#d1fae5" },
  statusPillLocked: { backgroundColor: "#fef3c7" },
  statusPillText: { fontSize: 12, fontWeight: "700" },
  prereqHint: { fontSize: 12, color: "#9ca3af", marginTop: 2, marginBottom: 10 },
  prereqRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  prereqAccent: { width: 4, alignSelf: "stretch", backgroundColor: "#22c55e" },
  prereqLeft: { flex: 1, paddingVertical: 14, paddingLeft: 14 },
  prereqName: { fontSize: 15, fontWeight: "600", color: "#374151" },
  prereqTarget: { fontSize: 13, color: "#6b7280", marginTop: 2 },
});
