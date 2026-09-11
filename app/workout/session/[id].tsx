
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Vibration, Animated, Easing } from "react-native";
import { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../../src/store/authStore";
import { useWorkoutStore, type LoggedSet, type SessionMovement } from "../../../src/store/workoutStore";
import { workoutService } from "../../../src/services/workout.service";
import { workoutsService } from "../../../src/services/workouts.service";
import { progressService } from "../../../src/services/progress.service";
import { movementsService } from "../../../src/services/movements.service";
import { performanceService, type PreviousPerformance } from "../../../src/services/performance.service";
import { computeFocusSuggestions, orderSuggestions } from "../../../src/utils/workoutSuggestions";
import { buildSetPlan, lastSetFeedback, setValueRatio } from "../../../src/utils/setCoach";
import { SetChip } from "../../../src/components/SetChip";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../../src/constants/theme";
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
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const authSession = useAuthStore((s) => s.session);
  const sessionMovements = useWorkoutStore((s) => s.sessionMovements);
  const sessionProgramLabel = useWorkoutStore((s) => s.sessionProgramLabel);
  const addSetToMovement = useWorkoutStore((s) => s.addSetToMovement);
  const addMovement = useWorkoutStore((s) => s.addMovement);
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
  // Ek ağırlık alanı varsayılan olarak KAPALI: calisthenics'te setlerin çoğu
  // vücut ağırlığıyla. Alan hep açık durduğunda ekranın üçte birini boş bir
  // kutu yiyordu; şimdi sayacın yanındaki KG düğmesi açıyor.
  const [weightOpenIds, setWeightOpenIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  // Bu antrenman BAŞLAMADAN ÖNCEKİ kişisel rekorlar - antrenman süresince
  // değişmez, "hâlâ kimin en iyi olduğu" her render'da bu referansla yeniden
  // hesaplanır (bkz. computeRecordHolderIds).
  const [personalBests, setPersonalBests] = useState<Record<string, PersonalBest>>({});
  // "Geçen sefer" referansı: bu antrenman hariç, her hareketin en son bitmiş
  // antrenmandaki setleri.
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, PreviousPerformance>>({});
  // Boş antrenman ekranının kısayolları. Sadece hiç hareket yokken yükleniyor -
  // dolu bir antrenmanda bu sorgular boşuna çalışmasın.
  const [quickPicks, setQuickPicks] = useState<
    { movementId: string; name: string; groupName: string | null; targetLabel: string | null; seed: SessionMovement }[]
  >([]);
  const [lastMovements, setLastMovements] = useState<SessionMovement[]>([]);
  const quickPicksLoaded = useRef(false);
  // Hangi hareket için kaçıncı sette reçete doldurulduğu. Set sayısı her
  // değiştiğinde bir sonraki setin önerisi bir kez yazılır; arada kullanıcı ne
  // yazarsa o kalır.
  const seededSetCount = useRef<Record<string, number>>({});
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

  /**
   * Boş antrenman ekranının kısayolları: kilidi açık ilk basamaklar ve son
   * antrenmanın hareketleri. Bir kez, yalnızca ekran gerçekten boşken yüklenir.
   */
  useEffect(() => {
    if (!authSession || quickPicksLoaded.current || sessionMovements.length > 0) return;
    quickPicksLoaded.current = true;

    (async () => {
      try {
        const [movements, logs] = await Promise.all([
          movementsService.getAllMovementsWithPrerequisites(),
          progressService.getMovementSetLogs(authSession.user.id),
        ]);
        const focus = orderSuggestions(computeFocusSuggestions(movements, logs))
          .filter((s) => !s.locked && !s.completed)
          .slice(0, 3);

        setQuickPicks(
          focus.map((s) => ({
            movementId: s.movement.id,
            name: s.movement.name,
            groupName: s.movement.movement_groups?.name ?? null,
            targetLabel: formatTarget(s.movement),
            seed: {
              movementId: s.movement.id,
              name: s.movement.name,
              groupName: s.movement.movement_groups?.name ?? null,
              targetType: s.movement.target_type,
              targetSets: s.movement.target_sets,
              targetReps: s.movement.target_reps,
              targetDurationSeconds: s.movement.target_duration_seconds,
              sets: [],
            } as SessionMovement,
          }))
        );
      } catch {
        setQuickPicks([]);
      }

      try {
        const lastId = await workoutService.getLastFinishedSessionId(authSession.user.id);
        if (!lastId) return;
        setLastMovements(await workoutService.getSessionState(lastId));
      } catch {
        setLastMovements([]);
      }
    })();
  }, [authSession, sessionMovements.length]);

  const addSeed = (seed: SessionMovement) => {
    addMovement({
      id: seed.movementId,
      name: seed.name,
      groupName: seed.groupName,
      targetType: seed.targetType,
      targetSets: seed.targetSets,
      targetReps: seed.targetReps,
      targetDurationSeconds: seed.targetDurationSeconds,
      restSeconds: seed.restSeconds,
    });
  };

  const repeatLastWorkout = () => {
    lastMovements.forEach((movement) => addSeed(movement));
  };

  const toggleCollapsed = (movementId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(movementId)) next.delete(movementId);
      else next.add(movementId);
      return next;
    });
  };

  const toggleWeightField = (movementId: string) => {
    setWeightOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(movementId)) next.delete(movementId);
      else next.add(movementId);
      return next;
    });
  };

  /**
   * Sıradaki setin önerisini giriş alanına yazar. Ekran artık boş bir form değil,
   * "şimdi şu kadar yap" diyen bir reçete; kullanıcı isterse üstüne yazıyor.
   * Ek ağırlık bilerek korunuyor - genelde setten sete değişmiyor.
   */
  useEffect(() => {
    const pending = sessionMovements.filter(
      (m) => seededSetCount.current[m.movementId] !== m.sets.length
    );
    if (pending.length === 0) return;

    pending.forEach((m) => {
      seededSetCount.current[m.movementId] = m.sets.length;
    });

    setInputs((prev) => {
      const next = { ...prev };
      pending.forEach((m) => {
        const plan = buildSetPlan(m);
        const current = prev[m.movementId] ?? { reps: "", duration: "", weight: "" };
        next[m.movementId] = {
          reps: plan.kind === "reps" ? plan.prefill : current.reps,
          duration: plan.kind === "duration" ? plan.prefill : current.duration,
          weight: current.weight,
        };
      });
      return next;
    });
  }, [sessionMovements]);

  /** Sayaç butonları: tekrar birer birer, süre beşer beşer değişiyor. */
  const bumpValue = (movementId: string, field: "reps" | "duration", delta: number) => {
    setInputs((prev) => {
      const current = prev[movementId] ?? { reps: "", duration: "", weight: "" };
      const parsed = parseInt(current[field] || "0", 10);
      const base = Number.isNaN(parsed) ? 0 : parsed;
      const value = Math.max(0, base + delta);
      return { ...prev, [movementId]: { ...current, [field]: value > 0 ? String(value) : "" } };
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

  /**
   * Hiç set girilmemiş antrenmanı bitirmek yerine iptal ediyoruz: eskiden
   * "önce set kaydet" uyarısı çıkıyor ve kullanıcı bu ekrandan çıkamıyordu,
   * boş oturum satırı da DB'de kalıyordu.
   */
  const cancelWorkout = () => {
    if (!id) return;
    Alert.alert("Antrenmanı İptal Et", "Hiç set kaydedilmedi, bu antrenman silinecek.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "İptal Et",
        style: "destructive",
        onPress: async () => {
          try {
            await workoutService.discardSession(id);
          } catch {
            // Satır zaten yoksa sorun değil; önemli olan ekrandan çıkabilmek.
          }
          reset();
          router.replace("/(tabs)/workout");
        },
      },
    ]);
  };

  const finishWorkout = async () => {
    if (!id || !authSession) return;

    if (totalLoggedSets === 0) {
      cancelWorkout();
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
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Bugün ne çalışıyorsun?</Text>
            <Text style={styles.emptyText}>
              Aşağıdan seç, ya da hareket kütüphanesinden kendin ekle. Antrenman ilk seti kaydedince başlar.
            </Text>

            {lastMovements.length > 0 && (
              <TouchableOpacity style={styles.repeatCard} onPress={repeatLastWorkout} activeOpacity={0.85}>
                <View style={styles.repeatIcon}>
                  <Feather name="rotate-ccw" size={16} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.repeatTitle}>Son antrenmanını tekrarla</Text>
                  <Text style={styles.repeatMeta} numberOfLines={1}>
                    {lastMovements.map((m) => m.name).join(" · ")}
                  </Text>
                </View>
                <Feather name="plus" size={18} color={COLORS.accent} />
              </TouchableOpacity>
            )}

            {quickPicks.length > 0 && (
              <>
                <Text style={styles.quickHeader}>Sırada bu var</Text>
                {quickPicks.map((pick) => (
                  <TouchableOpacity
                    key={pick.movementId}
                    style={styles.quickCard}
                    onPress={() => addSeed(pick.seed)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.quickAccent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quickName}>{pick.name}</Text>
                      <Text style={styles.quickMeta}>
                        {pick.groupName ?? ""}
                        {pick.targetLabel ? ` · ${pick.targetLabel}` : ""}
                      </Text>
                    </View>
                    <Feather name="plus" size={18} color={COLORS.accent} />
                  </TouchableOpacity>
                ))}
              </>
            )}
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
          const plan = buildSetPlan(movement);
          const feedback = lastSetFeedback(movement);
          // Hedefi olmayan harekette hem tekrar hem süre girilebilsin diye
          // sayaç tekrarı, yanındaki küçük alan süreyi alıyor.
          const showLooseDuration = !movement.targetType;
          const stepField: "reps" | "duration" = plan.kind;
          const stepDelta = plan.kind === "duration" ? 5 : 1;

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
                  {/* Başlık satırı: solda kaçıncı set, sağda HEDEF ilerlemesi.
                      İkisi farklı sayı - aynı kesirde gösterilince "Set 4/3"
                      gibi saçma bir şey çıkıyordu. */}
                  <View style={styles.planRow}>
                    <Text style={styles.planHeadline}>{plan.setNumber}. SET</Text>
                    {plan.requiredSets != null && plan.requiredSets > 1 && (
                      <Text style={styles.planCounter}>
                        {plan.qualifiedSets} / {plan.requiredSets} HEDEF SET
                      </Text>
                    )}
                  </View>

                  {plan.requiredSets != null && plan.requiredSets > 1 && (
                    <View style={styles.planBarTrack}>
                      <View
                        style={[
                          styles.planBarFill,
                          { width: `${Math.round(Math.min(1, plan.qualifiedSets / plan.requiredSets) * 100)}%` },
                        ]}
                      />
                    </View>
                  )}

                  {(plan.hint || targetText) && (
                    <View style={styles.hintRow}>
                      <Feather
                        name={plan.targetComplete ? "check-circle" : "target"}
                        size={12}
                        color={COLORS.accent}
                      />
                      <Text style={styles.planHint}>{plan.hint ?? `Hedef: ${targetText}`}</Text>
                    </View>
                  )}

                  {previousPerformance[movement.movementId] && (
                    <View style={styles.previousRow}>
                      <Feather name="rotate-ccw" size={12} color={COLORS.graphite} />
                      <Text style={styles.previousText}>
                        Geçen sefer: {previousPerformance[movement.movementId].summary}
                      </Text>
                    </View>
                  )}

                  {/* Setler yatay şeritte: 11 setlik bir hareket ekranı aşağı
                      doğru şişirmiyor, son setler de göz hizasında kalıyor. */}
                  {movement.sets.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.setStrip}
                    >
                      {movement.sets.map((s, i) => {
                        const value = plan.kind === "duration" ? s.duration_seconds ?? null : s.reps ?? null;
                        return (
                          <SetChip
                            key={s.id}
                            index={i}
                            value={value}
                            unit={plan.kind === "duration" ? "sn" : "tekrar"}
                            addedWeightKg={s.added_weight_kg}
                            ratio={setValueRatio(value, plan.targetValue)}
                            met={setMeetsOwnTarget(
                              s,
                              movement.targetType,
                              movement.targetReps,
                              movement.targetDurationSeconds
                            )}
                            isRecord={recordHolderIds.has(s.id)}
                            onDelete={() =>
                              confirmRemoveSet({
                                setId: s.id,
                                movementId: movement.movementId,
                                setNumber: i + 1,
                              })
                            }
                          />
                        );
                      })}
                    </ScrollView>
                  )}

                  {feedback && (
                    <View style={styles.coachRow}>
                      <Feather name="message-circle" size={12} color={COLORS.accent} />
                      <Text style={styles.coachText}>{feedback}</Text>
                    </View>
                  )}

                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepButton}
                      onPress={() => bumpValue(movement.movementId, stepField, -stepDelta)}
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={20} color={COLORS.ink} />
                    </TouchableOpacity>

                    <View style={styles.stepValueBox}>
                      <TextInput
                        style={styles.stepValue}
                        placeholder="0"
                        placeholderTextColor={COLORS.line}
                        keyboardType="number-pad"
                        value={inputs[movement.movementId]?.[stepField] ?? ""}
                        onChangeText={(v) => updateInput(movement.movementId, stepField, v)}
                      />
                      <Text style={styles.stepUnit}>{plan.kind === "duration" ? "saniye" : "tekrar"}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepButton}
                      onPress={() => bumpValue(movement.movementId, stepField, stepDelta)}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={20} color={COLORS.ink} />
                    </TouchableOpacity>

                    {/* Değer girilmişse düğme onu gösteriyor: alan kapalıyken de
                        "ek ağırlık var" bilgisi kaybolmuyor. */}
                    <TouchableOpacity
                      style={[styles.kgButton, !!inputs[movement.movementId]?.weight && styles.kgButtonActive]}
                      onPress={() => toggleWeightField(movement.movementId)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.kgText, !!inputs[movement.movementId]?.weight && styles.kgTextActive]}
                        numberOfLines={1}
                      >
                        {inputs[movement.movementId]?.weight
                          ? `+${inputs[movement.movementId]?.weight}`
                          : "KG"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {(weightOpenIds.has(movement.movementId) || showLooseDuration) && (
                    <View style={styles.extraRow}>
                      {showLooseDuration && (
                        <TextInput
                          style={styles.smallInput}
                          placeholder="Süre (sn)"
                          placeholderTextColor={COLORS.graphite}
                          keyboardType="number-pad"
                          value={inputs[movement.movementId]?.duration ?? ""}
                          onChangeText={(v) => updateInput(movement.movementId, "duration", v)}
                        />
                      )}
                      {weightOpenIds.has(movement.movementId) && (
                        <TextInput
                          style={styles.smallInput}
                          placeholder="Ek ağırlık (kg)"
                          placeholderTextColor={COLORS.graphite}
                          keyboardType="decimal-pad"
                          autoFocus
                          value={inputs[movement.movementId]?.weight ?? ""}
                          onChangeText={(v) => updateInput(movement.movementId, "weight", v)}
                        />
                      )}
                    </View>
                  )}

                  <TouchableOpacity style={styles.saveButton} onPress={() => saveSet(movement.movementId)}>
                    <Text style={styles.saveButtonText}>{plan.setNumber}. SETİ KAYDET</Text>
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
        <TouchableOpacity
          style={[styles.finishButton, totalLoggedSets === 0 && styles.cancelButton]}
          onPress={finishWorkout}
          activeOpacity={0.85}
        >
          <Text style={[styles.finishButtonText, totalLoggedSets === 0 && styles.cancelButtonText]}>
            {totalLoggedSets === 0 ? "Antrenmanı İptal Et" : "Antrenmanı Bitir"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
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
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: COLORS.inverse,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restText: { color: COLORS.onAccent, fontFamily: "Inter_700Bold", fontSize: 14 },
  skipText: { color: COLORS.accent, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  restTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(250,249,246,0.15)" },
  restFill: { height: 3, backgroundColor: COLORS.accent },
  emptyWrap: { marginTop: 18, marginBottom: 4 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 19, color: COLORS.ink },
  emptyText: {
    color: COLORS.graphite,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  repeatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    padding: 14,
    marginTop: 18,
  },
  repeatIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  repeatTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink },
  repeatMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 2 },
  quickHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.graphite,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 10,
  },
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    marginBottom: 8,
  },
  quickAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: COLORS.accent },
  quickName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink },
  quickMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center" },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.ink },
  cardCategory: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 1 },
  collapsedSummary: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.graphite },
  planRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  planHeadline: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0.5,
    color: COLORS.ink,
  },
  planCounter: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
    color: COLORS.graphite,
  },
  planBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.line,
    overflow: "hidden",
    marginTop: 6,
  },
  planBarFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  planHint: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.accent },
  previousRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  previousText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite },
  setStrip: { flexDirection: "row", gap: 8, paddingVertical: 12, paddingRight: 4 },
  kgButton: {
    minWidth: 46,
    height: 56,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  kgButtonActive: { borderColor: COLORS.accent },
  kgText: { fontFamily: "Inter_700Bold", fontSize: 12, color: COLORS.graphite },
  kgTextActive: { color: COLORS.accent },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  coachText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.accent, flex: 1 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  stepButton: {
    width: 48,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  stepValueBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 30,
    color: COLORS.ink,
    padding: 0,
    minWidth: 60,
    textAlign: "center",
  },
  stepUnit: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.graphite, marginTop: -2 },
  extraRow: { flexDirection: "row", gap: 8, marginTop: 8 },
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
  saveButtonText: { color: COLORS.onAccent, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 14 },
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
    backgroundColor: COLORS.surface,
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
  finishButton: { backgroundColor: COLORS.inverse, borderRadius: 16, paddingVertical: 16 },
  finishButtonText: { color: COLORS.onAccent, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 16 },
  cancelButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  cancelButtonText: { color: COLORS.graphite },
  })
);
