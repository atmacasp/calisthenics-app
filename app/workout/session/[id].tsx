
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Vibration, Animated, Easing } from "react-native";
import { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../../src/store/authStore";
import { useWorkoutStore, type LoggedSet } from "../../../src/store/workoutStore";
import { workoutService } from "../../../src/services/workout.service";
import { workoutsService } from "../../../src/services/workouts.service";
import { progressService } from "../../../src/services/progress.service";
import { performanceService, type PreviousPerformance } from "../../../src/services/performance.service";
import { COLORS } from "../../../src/constants/theme";
import { formatTarget } from "../../../src/utils/targetProgress";
import { useSetRemoval } from "../../../src/hooks/useSetRemoval";

const REST_SECONDS = 60;

interface PersonalBest {
  maxReps: number;
  maxDuration: number;
  maxWeight: number;
}

// Bu ekranin set tipi store'daki LoggedSet ile birebir aynidir. Kopyasini tutmak
// ikisinin zamanla ayrisip tip hatasi uretmesine yol acmisti; artik tek kaynak var.
type SessionSet = LoggedSet;

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
  const insets = useSafeAreaInsets();
  const authSession = useAuthStore((s) => s.session);
  const sessionMovements = useWorkoutStore((s) => s.sessionMovements);
  const sessionProgramLabel = useWorkoutStore((s) => s.sessionProgramLabel);
  const addSetToMovement = useWorkoutStore((s) => s.addSetToMovement);
  const removeMovement = useWorkoutStore((s) => s.removeMovement);
  const { confirmRemoveSet } = useSetRemoval();
  const reset = useWorkoutStore((s) => s.reset);

  const [inputs, setInputs] = useState<Record<string, { reps: string; duration: string; weight: string }>>({});
  const [restLeft, setRestLeft] = useState(0);
  // Kalan süre çubuğunun paydası: dinlenme kaç saniyeyle başladı.
  const [restTotal, setRestTotal] = useState(REST_SECONDS);
  const restAnim = useRef(new Animated.Value(0)).current;
  // scaleY merkezden büyür; üst kenarı sabit tutmak için bandın yüksekliği ölçülüyor.
  const [restHeight, setRestHeight] = useState(64);
  // Bant, restLeft sıfırlanınca hemen kaldırılmıyor; kapanış animasyonu bitince kalkıyor.
  const [restVisible, setRestVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(96);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  // Bu antrenman BAŞLAMADAN ÖNCEKİ kişisel rekorlar - antrenman süresince
  // değişmez, "hâlâ kimin en iyi olduğu" her render'da bu referansla yeniden
  // hesaplanır (bkz. computeRecordHolderIds).
  const [personalBests, setPersonalBests] = useState<Record<string, PersonalBest>>({});
  // "Geçen sefer" referansı: bu antrenman hariç, her hareketin en son bitmiş
  // antrenmandaki setleri.
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, PreviousPerformance>>({});
  const intervalRef = useRef<any>(null);
  // Sayaç kendiliğinden mi bitti, kullanıcı mı atladı - titreşim için ayırt ediliyor.
  const restWasRunning = useRef(false);

  useEffect(() => {
    if (restLeft <= 0) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setRestLeft((s) => s - 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [restLeft > 0]);

  // Dinlenme dolduğunda titret: telefon yerdeyken sessiz bir sayacın faydası yok.
  // "Atla" ile kesildiğinde titretmiyoruz - kullanıcı zaten kasten bitirdi.
  useEffect(() => {
    if (restLeft > 0) {
      restWasRunning.current = true;
      return;
    }
    if (restWasRunning.current) {
      restWasRunning.current = false;
      Vibration.vibrate([0, 300, 150, 300]);
    }
  }, [restLeft]);

  // Bildirim ekranın üstünden küçük başlar, aşağı inerken büyür, yere değince
  // balon gibi ezilip toparlanır. Tek sürücü (restAnim) var; "damla" hissi ayrı
  // yaylardan değil, aşağıdaki ölçek eğrisinin tepe/çukur noktalarından geliyor -
  // yayla yapılamazdı, çünkü yay ölçeği 1'in altına indirip geri getiremez.
  useEffect(() => {
    if (restLeft > 0) {
      setRestVisible(true);
      restAnim.setValue(0);
      Animated.sequence([
        // 1) HIZLI FAZ: tepeden dar bir damla olarak düşerken kendi pencere
        //    boyutuna kadar büyür. Kasten çok kısa; hızlanan easing ile bitiyor.
        Animated.timing(restAnim, {
          toValue: 0.3,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // 2) AĞIR ÇEKİM: boyut tamamlandığı anda hız düşer. Kalan iniş, çarpma
        //    ve sekme bu fazda. Doğrusal - hızın sabit kalması, birinci fazla
        //    arasındaki kırılmayı belirginleştiriyor.
        Animated.timing(restAnim, {
          toValue: 1,
          duration: 760,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.timing(restAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRestVisible(false);
    });
  }, [restLeft > 0]);

  const skipRest = () => {
    restWasRunning.current = false;
    setRestLeft(0);
  };

  useEffect(() => {
    if (!authSession) return;
    progressService.getPersonalRecords(authSession.user.id, id).then((records) => {
      const map: Record<string, PersonalBest> = {};
      records.forEach((r) => {
        map[r.movementId] = { maxReps: r.maxReps, maxDuration: r.maxDuration, maxWeight: r.maxWeight };
      });
      setPersonalBests(map);
      performanceService
        .getPreviousPerformance(authSession.user.id, id)
        .then(setPreviousPerformance)
        .catch(() => {});
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

  // Bant kendi yüksekliği + başlık + çentik kadar yukarıdan, yani ekran dışından düşer.
  const restDropFrom = -(headerHeight + restHeight + 24);

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
      const restFor = movement.restSeconds ?? REST_SECONDS;
      setRestTotal(restFor);
      setRestLeft(restFor);
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
      if (notes.trim()) {
        await workoutsService.updateSessionNotes(id, notes.trim());
      }
      await workoutService.endSession(id, authSession.user.id);
      reset();
      router.replace(`/workout/summary/${id}`);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Antrenman bitirilemedi");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.header, { paddingTop: insets.top + 8 }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBack}>
          <Feather name="arrow-left" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aktif Antrenman</Text>
      </View>

      {restVisible && (
        <Animated.View
          onLayout={(e) => setRestHeight(e.nativeEvent.layout.height)}
          style={[
            styles.restBanner,
            { position: "absolute", top: headerHeight + 8, left: 16, right: 16, zIndex: 20 },
            {
              opacity: restAnim.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] }),
              transform: [
                {
                  translateY: restAnim.interpolate({
                    inputRange: [0, 0.15, 0.3, 0.52, 0.62, 0.78, 0.9, 1],
                    outputRange: [restDropFrom, restDropFrom * 0.55, restDropFrom * 0.18, 12, 6, -10, 3, 0],
                  }),
                },
                {
                  scaleY: restAnim.interpolate({
                    inputRange: [0, 0.15, 0.3, 0.52, 0.62, 0.78, 0.9, 1],
                    outputRange: [0.5, 0.72, 1, 1.02, 0.82, 1.08, 0.97, 1],
                  }),
                },
                {
                  scaleX: restAnim.interpolate({
                    inputRange: [0, 0.15, 0.3, 0.52, 0.62, 0.78, 0.9, 1],
                    outputRange: [0.12, 0.55, 1, 1, 1.14, 0.95, 1.02, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.restTrack}>
            <View style={[styles.restFill, { width: `${Math.max(0, Math.min(100, (restLeft / Math.max(1, restTotal)) * 100))}%` }]} />
          </View>
          <Text style={styles.restText}>Dinlenme: {restLeft}s</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <TouchableOpacity
              onPress={() => {
                setRestTotal((t) => t + 30);
                setRestLeft((s) => s + 30);
              }}
              hitSlop={8}
            >
              <Text style={styles.skipText}>+30 sn</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={skipRest} hitSlop={8}>
            <Text style={styles.skipText}>Atla</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sessionProgramLabel && (
          <View style={styles.programBadge}>
            <Feather name="calendar" size={12} color={COLORS.accent} />
            <Text style={styles.programBadgeText}>{sessionProgramLabel}</Text>
          </View>
        )}

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

                  {previousPerformance[movement.movementId] && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 8, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
                      <Feather name="rotate-ccw" size={12} color={COLORS.graphite} />
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, flex: 1 }}>
                        Geçen sefer: {previousPerformance[movement.movementId].summary}
                      </Text>
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
                          Set {i + 1}: {[s.reps ? `${s.reps} tekrar` : null, s.duration_seconds ? `${s.duration_seconds} sn` : null, s.added_weight_kg ? `+${s.added_weight_kg} kg` : null].filter(Boolean).join(" · ")}
                        </Text>
                        <View style={styles.setBadges}>
                          {metTarget ? (
                            <View style={styles.targetMetBadge}>
                              <Feather name="check" size={12} color={COLORS.graphite} />
                              <Text style={styles.targetMetBadgeText}>Hedef</Text>
                            </View>
                          ) : null}
                          {recordHolderIds.has(s.id) && <Text style={styles.prBadge}>🏆 Yeni Rekor!</Text>}
                          <TouchableOpacity hitSlop={8} onPress={() => confirmRemoveSet(s.id, movement.movementId, i + 1)}>
                            <Feather name="x" size={14} color={COLORS.graphite} />
                          </TouchableOpacity>
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

        {sessionMovements.length > 0 && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Antrenman Notu (opsiyonel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Bugün nasıl geçti?"
              placeholderTextColor={COLORS.graphite}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.finishButton} onPress={finishWorkout} activeOpacity={0.85}>
        <Text style={styles.finishButtonText}>Antrenmanı Bitir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: COLORS.paper,
  },
  headerBack: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.ink },
  scrollContent: { padding: 16, paddingBottom: 32 },
  programBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
  },
  programBadgeText: { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.accent },
  restBanner: {


    borderRadius: 16,
    overflow: "hidden",
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: COLORS.ink,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restText: { color: COLORS.white, fontFamily: "Inter_700Bold", fontSize: 14 },
  skipText: { color: COLORS.accent, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  restTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(250,249,246,0.15)" },
  restFill: { height: 3, backgroundColor: COLORS.accent },
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

    marginBottom: 8,
  },
  targetChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.accent },
  setLineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  setLine: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.ink },
  setBadges: { flexDirection: "row", alignItems: "center", gap: 8 },
  targetMetBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  targetMetBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: COLORS.graphite },
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
  notesBox: { marginTop: 20 },
  notesLabel: { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.ink, marginBottom: 8 },
  notesInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 14,
    minHeight: 70,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.ink,
    textAlignVertical: "top",
  },
  footer: {
    backgroundColor: COLORS.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  finishButton: { backgroundColor: COLORS.ink, borderRadius: 16, paddingVertical: 16 },
  finishButtonText: { color: COLORS.white, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 16 },
});
