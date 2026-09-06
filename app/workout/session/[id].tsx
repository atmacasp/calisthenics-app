
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../../src/store/authStore";
import { useWorkoutStore } from "../../../src/store/workoutStore";
import { workoutService } from "../../../src/services/workout.service";
import { progressService } from "../../../src/services/progress.service";
import { COLORS } from "../../../src/constants/theme";
import { formatTarget } from "../../../src/utils/targetProgress";

const REST_SECONDS = 60;

interface PersonalBest {
  maxReps: number;
  maxDuration: number;
  maxWeight: number;
}

interface SessionSet {
  id: string;
  reps?: number;
  duration_seconds?: number;
  added_weight_kg?: number;
}

function sanitizeInteger(text: string) {
  return text.replace(/[^0-9]/g, "");
}

function sanitizeDecimal(text: string) {
  let cleaned = text.replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned;
}

/**
 * Bir hareketin bu antrenmandaki setlerini, antrenman öncesi kişisel rekorla
 * (baseline) karşılaştırarak sırayla tarar. Her metrik (tekrar/süre/ek kg) için
 * SADECE o metrikte hâlâ en yüksek değeri tutan TEK seti "rekor sahibi" işaretler.
 * Böylece bir set öncekini geçtiğinde rozet otomatik olarak yeni sete kayar,
 * aynı anda birden fazla set "Yeni Rekor!" göstermez.
 */
function computeRecordHolderIds(sets: SessionSet[], baseline: PersonalBest): Set<string> {
  let bestReps = baseline.maxReps;
  let repsHolder: string | null = null;
  let bestDuration = baseline.maxDuration;
  let durationHolder: string | null = null;
  let bestWeight = baseline.maxWeight;
  let weightHolder: string | null = null;

  for (const s of sets) {
    if (s.reps != null && s.reps > bestReps) {
      bestReps = s.reps;
      repsHolder = s.id;
    }
    if (s.duration_seconds != null && s.duration_seconds > bestDuration) {
      bestDuration = s.duration_seconds;
      durationHolder = s.id;
    }
    if (s.added_weight_kg != null && s.added_weight_kg > bestWeight) {
      bestWeight = s.added_weight_kg;
      weightHolder = s.id;
    }
  }

  return new Set([repsHolder, durationHolder, weightHolder].filter((x): x is string => !!x));
}

/** Bir setin, hareketin KENDİ hedefini karşılayıp karşılamadığını (anlık, tek set bazlı) kontrol eder. */
function setMeetsOwnTarget(
  s: SessionSet,
  targetType: "reps_sets" | "duration" | null | undefined,
  targetReps: number | null | undefined,
  targetDurationSeconds: number | null | undefined
): boolean {
  if (targetType === "duration" && targetDurationSeconds) {
    return (s.duration_seconds ?? 0) >= targetDurationSeconds;
  }
  if (targetType === "reps_sets" && targetReps) {
    return (s.reps ?? 0) >= targetReps;
  }
  return false;
}

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authSession = useAuthStore((s) => s.session);
  const sessionMovements = useWorkoutStore((s) => s.sessionMovements);
  const addSetToMovement = useWorkoutStore((s) => s.addSetToMovement);
  const removeMovement = useWorkoutStore((s) => s.removeMovement);
  const reset = useWorkoutStore((s) => s.reset);

  const [inputs, setInputs] = useState<Record<string, { reps: string; duration: string; weight: string }>>({});
  const [restLeft, setRestLeft] = useState(0);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  // Bu antrenman BAŞLAMADAN ÖNCEKİ kişisel rekorlar - antrenman süresince
  // değişmez, "hâlâ kimin en iyi olduğu" her render'da bu referansla yeniden
  // hesaplanır (bkz. computeRecordHolderIds).
  const [personalBests, setPersonalBests] = useState<Record<string, PersonalBest>>({});
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (restLeft <= 0) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setRestLeft((s) => s - 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [restLeft > 0]);

  useEffect(() => {
    if (!authSession) return;
    progressService.getPersonalRecords(authSession.user.id).then((records) => {
      const map: Record<string, PersonalBest> = {};
      records.forEach((r) => {
        map[r.movementId] = { maxReps: r.maxReps, maxDuration: r.maxDuration, maxWeight: r.maxWeight };
      });
      setPersonalBests(map);
    });
  }, [authSession]);

  const toggleCollapsed = (movementId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(movementId)) next.delete(movementId);
      else next.add(movementId);
      return next;
    });
  };

  const updateInput = (movementId: string, field: "reps" | "duration" | "weight", rawValue: string) => {
    const value = field === "weight" ? sanitizeDecimal(rawValue) : sanitizeInteger(rawValue);
    setInputs((prev) => ({ ...prev, [movementId]: { ...prev[movementId], [field]: value } }));
  };

  const totalLoggedSets = sessionMovements.reduce((sum, m) => sum + m.sets.length, 0);

  const handleRemoveMovement = (movementId: string, name: string, setCount: number) => {
    const message =
      setCount > 0
        ? `"${name}" hareketini ve kayıtlı ${setCount} setini bu antrenmandan silmek istediğine emin misin?`
        : `"${name}" hareketini bu antrenmandan silmek istediğine emin misin?`;

    Alert.alert("Hareketi Sil", message, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            if (setCount > 0 && id) {
              await workoutService.removeMovementSets(id, movementId);
            }
            removeMovement(movementId);
          } catch (error: any) {
            Alert.alert("Hata", error.message ?? "Hareket silinemedi");
          }
        },
      },
    ]);
  };

  const saveSet = async (movementId: string) => {
    const values = inputs[movementId] || { reps: "", duration: "", weight: "" };
    const movement = sessionMovements.find((m) => m.movementId === movementId);
    if (!movement || !id) return;

    const reps = values.reps ? parseInt(values.reps, 10) : undefined;
    const duration = values.duration ? parseInt(values.duration, 10) : undefined;
    const weight = values.weight ? parseFloat(values.weight) : undefined;

    const hasValidValue =
      (reps !== undefined && reps > 0) ||
      (duration !== undefined && duration > 0) ||
      (weight !== undefined && weight > 0);

    if (!hasValidValue) {
      Alert.alert("Eksik bilgi", "Seti kaydetmeden önce tekrar, süre veya ek ağırlıktan en az birini gir.");
      return;
    }

    try {
      const saved = await workoutService.addSet({
        session_id: id,
        movement_id: movementId,
        set_number: movement.sets.length + 1,
        reps,
        duration_seconds: duration,
        added_weight_kg: weight,
      });
      addSetToMovement(movementId, saved);
      setInputs((prev) => ({ ...prev, [movementId]: { reps: "", duration: "", weight: "" } }));
      setRestLeft(REST_SECONDS);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Set kaydedilemedi");
    }
  };

  const finishWorkout = async () => {
    if (!id || !authSession) return;

    if (totalLoggedSets === 0) {
      Alert.alert("Henüz set kaydedilmedi", "Antrenmanı bitirmeden önce en az bir set kaydetmelisin.");
      return;
    }

    try {
      await workoutService.endSession(id, authSession.user.id);
      reset();
      router.replace("/(tabs)/workout");
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Antrenman bitirilemedi");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Aktif Antrenman" }} />

      {restLeft > 0 && (
        <View style={styles.restBanner}>
          <Text style={styles.restText}>Dinlenme: {restLeft}s</Text>
          <TouchableOpacity onPress={() => setRestLeft(0)}>
            <Text style={styles.skipText}>Atla</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sessionMovements.length === 0 && (
          <View style={styles.emptyBox}>
            <Feather name="activity" size={28} color={COLORS.line} />
            <Text style={styles.emptyText}>Henüz hareket eklenmedi. Aşağıdan bir hareket ekle.</Text>
          </View>
        )}

        {sessionMovements.map((movement) => {
          const baseline = personalBests[movement.movementId] ?? { maxReps: 0, maxDuration: 0, maxWeight: 0 };
          const recordHolderIds = computeRecordHolderIds(movement.sets, baseline);
          const targetText = formatTarget({
            target_type: movement.targetType ?? null,
            target_sets: movement.targetSets ?? null,
            target_reps: movement.targetReps ?? null,
            target_duration_seconds: movement.targetDurationSeconds ?? null,
          });
          const collapsed = collapsedIds.has(movement.movementId);
          const showDuration = movement.targetType !== "reps_sets";
          const showReps = movement.targetType !== "duration";

          return (
            <View key={movement.movementId} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeaderRow}
                activeOpacity={0.7}
                onPress={() => toggleCollapsed(movement.movementId)}
              >
                <Feather
                  name={collapsed ? "chevron-right" : "chevron-down"}
                  size={18}
                  color={COLORS.graphite}
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{movement.name}</Text>
                  {movement.groupName && <Text style={styles.cardCategory}>{movement.groupName}</Text>}
                </View>
                {collapsed && (
                  <Text style={styles.collapsedSummary}>
                    {movement.sets.length > 0 ? `${movement.sets.length} set` : "Henüz set yok"}
                  </Text>
                )}
                <TouchableOpacity
                  hitSlop={10}
                  style={{ marginLeft: 12 }}
                  onPress={() => handleRemoveMovement(movement.movementId, movement.name, movement.sets.length)}
                >
                  <Feather name="trash-2" size={18} color={COLORS.graphite} />
                </TouchableOpacity>
              </TouchableOpacity>

              {!collapsed && (
                <>
                  {targetText && (
                    <View style={styles.targetChip}>
                      <Feather name="target" size={12} color={COLORS.accent} />
                      <Text style={styles.targetChipText}>Hedef: {targetText}</Text>
                    </View>
                  )}

                  {movement.sets.map((s, i) => {
                    const metTarget = setMeetsOwnTarget(
                      s,
                      movement.targetType,
                      movement.targetReps,
                      movement.targetDurationSeconds
                    );
                    return (
                      <View key={s.id} style={styles.setLineRow}>
                        <Text style={styles.setLine}>
                          Set {i + 1}: {s.reps ? `${s.reps} tekrar` : ""} {s.duration_seconds ? `${s.duration_seconds} sn` : ""} {s.added_weight_kg ? `+${s.added_weight_kg}kg` : ""}
                        </Text>
                        <View style={styles.setBadges}>
                          {metTarget && <Text style={styles.targetMetBadge}>✓ Hedef</Text>}
                          {recordHolderIds.has(s.id) && <Text style={styles.prBadge}>🏆 Yeni Rekor!</Text>}
                        </View>
                      </View>
                    );
                  })}

                  <View style={styles.inputRow}>
                    {showReps && (
                      <TextInput
                        style={styles.smallInput}
                        placeholder="Tekrar"
                        placeholderTextColor={COLORS.graphite}
                        keyboardType="number-pad"
                        value={inputs[movement.movementId]?.reps ?? ""}
                        onChangeText={(v) => updateInput(movement.movementId, "reps", v)}
                      />
                    )}
                    {showDuration && (
                      <TextInput
                        style={styles.smallInput}
                        placeholder="Süre (sn)"
                        placeholderTextColor={COLORS.graphite}
                        keyboardType="number-pad"
                        value={inputs[movement.movementId]?.duration ?? ""}
                        onChangeText={(v) => updateInput(movement.movementId, "duration", v)}
                      />
                    )}
                    <TextInput
                      style={styles.smallInput}
                      placeholder="Ek kg"
                      placeholderTextColor={COLORS.graphite}
                      keyboardType="decimal-pad"
                      value={inputs[movement.movementId]?.weight ?? ""}
                      onChangeText={(v) => updateInput(movement.movementId, "weight", v)}
                    />
                  </View>
                  <TouchableOpacity style={styles.saveButton} onPress={() => saveSet(movement.movementId)}>
                    <Text style={styles.saveButtonText}>Seti Kaydet</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/workout/pick-movement")}>
          <Text style={styles.addButtonText}>+ Hareket Ekle</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
        <Text style={styles.finishButtonText}>Antrenmanı Bitir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  scrollContent: { padding: 16, paddingBottom: 32 },
  restBanner: {
    backgroundColor: COLORS.ink,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restText: { color: COLORS.white, fontFamily: "Inter_700Bold", fontSize: 14 },
  skipText: { color: COLORS.accent, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyBox: { alignItems: "center", marginTop: 40, gap: 10 },
  emptyText: {
    textAlign: "center",
    color: COLORS.graphite,
    fontFamily: "Inter_400Regular",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center" },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.ink },
  cardCategory: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 1 },
  collapsedSummary: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.graphite },
  targetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  targetChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.accent },
  setLineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  setLine: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
  setBadges: { flexDirection: "row", alignItems: "center", gap: 8 },
  targetMetBadge: { fontFamily: "Inter_700Bold", fontSize: 11, color: COLORS.graphite },
  prBadge: { fontFamily: "Inter_700Bold", fontSize: 12, color: COLORS.accent },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 8,
    backgroundColor: COLORS.paper,
    color: COLORS.ink,
    fontFamily: "Inter_400Regular",
  },
  saveButton: { backgroundColor: COLORS.accent, padding: 12, borderRadius: 10, marginTop: 10 },
  saveButtonText: { color: COLORS.white, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 14 },
  addButton: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  addButtonText: { color: COLORS.accent, fontFamily: "Inter_700Bold", fontSize: 14 },
  finishButton: { backgroundColor: COLORS.ink, padding: 18 },
  finishButtonText: { color: COLORS.white, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 16 },
});
