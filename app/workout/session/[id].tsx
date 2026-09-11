
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useEffect, useMemo, useState, useRef } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../../src/store/authStore";
import { useWorkoutStore, type SessionMovement } from "../../../src/store/workoutStore";
import { workoutService } from "../../../src/services/workout.service";
import { workoutsService } from "../../../src/services/workouts.service";
import { progressService } from "../../../src/services/progress.service";
import { movementsService } from "../../../src/services/movements.service";
import { performanceService, type PreviousPerformance } from "../../../src/services/performance.service";
import { computeFocusSuggestions, orderSuggestions } from "../../../src/utils/workoutSuggestions";
import { buildSetPlan } from "../../../src/utils/setCoach";
import {
  finishNote,
  focusAfterSet,
  initialFocus,
  restPlanFor,
  sessionHeadline,
  sessionOutline,
  sessionProgress,
} from "../../../src/utils/sessionFlow";
import { SessionMovementCard } from "../../../src/components/SessionMovementCard";
import { RestBanner, type RestRequest } from "../../../src/components/RestBanner";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../../src/constants/theme";
import { formatTarget } from "../../../src/utils/targetProgress";
import type { PersonalBest } from "../../../src/utils/setRecords";
import { useSetRemoval } from "../../../src/hooks/useSetRemoval";

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
  // Dinlenme bandına verilen istek: kaç saniye, sırada ne var. Süreyi sessionFlow
  // hesaplıyor, sayacı ve animasyonu bant kendi yönetiyor.
  const [restRequest, setRestRequest] = useState<RestRequest | null>(null);
  const restToken = useRef(0);
  const [headerHeight, setHeaderHeight] = useState(96);
  // TEK ODAK: aynı anda yalnızca bir hareket açık. Hedefi dolunca odak kendiliğinden
  // sıradakine geçiyor; kullanıcı başlığa dokunarak istediğine dönebiliyor.
  const [focusId, setFocusId] = useState<string | null>(null);
  // Ek ağırlık alanı varsayılan olarak KAPALI: calisthenics'te setlerin çoğu
  // vücut ağırlığıyla. Alan hep açık durduğunda ekranın üçte birini boş bir
  // kutu yiyordu; şimdi sayacın yanındaki KG düğmesi açıyor.
  const [weightOpenIds, setWeightOpenIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  // Bu antrenman BAŞLAMADAN ÖNCEKİ kişisel rekorlar - antrenman süresince
  // değişmez, "hâlâ kimin en iyi olduğu" her render'da bu referansla yeniden
  // hesaplanır (bkz. setRecords.computeRecordHolderIds).
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
  // Odak bir kez kurulduktan sonra motor kullanıcının seçimiyle yarışmıyor.
  const focusInitialized = useRef(false);

  const progress = useMemo(() => sessionProgress(sessionMovements), [sessionMovements]);
  const outline = useMemo(() => sessionOutline(sessionMovements, focusId), [sessionMovements, focusId]);

  /**
   * Odak iki durumda motor tarafından kuruluyor: ekran ilk açıldığında ve
   * odaktaki hareket silindiğinde. Bunun dışında karışmıyor - kullanıcı açık
   * kartı kapatmışsa (focusId null) motor onu geri açmamalı.
   */
  useEffect(() => {
    if (sessionMovements.length === 0) {
      focusInitialized.current = false;
      if (focusId !== null) setFocusId(null);
      return;
    }
    const stale = focusId != null && !sessionMovements.some((m) => m.movementId === focusId);
    if (!focusInitialized.current || stale) {
      focusInitialized.current = true;
      setFocusId(initialFocus(sessionMovements).movementId);
    }
  }, [sessionMovements, focusId]);

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

  /** Başlığa dokunmak odağı oraya taşır; açık karta dokunmak kapatır. */
  const toggleFocus = (movementId: string) => {
    setFocusId((prev) => (prev === movementId ? null : movementId));
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

  const totalLoggedSets = progress.loggedSets;
  const note = finishNote(progress);

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

      // Store güncellemesi bu closure'a yansımıyor; dinlenme ve odak kararları
      // setin EKLENMİŞ halindeki listeye göre veriliyor.
      const next = sessionMovements.map((m) =>
        m.movementId === movementId ? { ...m, sets: [...m.sets, saved] } : m
      );

      const rest = restPlanFor(next, movementId);
      restToken.current += 1;
      setRestRequest({
        token: restToken.current,
        seconds: rest.seconds,
        upNext: rest.upNext,
        note: rest.note,
      });

      // Hedef dolduysa odak sıradaki eksik harekete geçiyor. Oturumun tamamı
      // bittiğinde (movementId null) kart açık kalıyor: ekstra set atmak isteyen
      // kullanıcı boş ekranla karşılaşmasın.
      const focus = focusAfterSet(next, movementId);
      setFocusId(focus.movementId ?? movementId);
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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBack}>
            <Feather name="arrow-left" size={22} color={COLORS.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Aktif Antrenman</Text>
            <Text style={styles.headerSub}>{sessionHeadline(progress)}</Text>
          </View>
          {progress.requiredSets > 0 && (
            <Text style={styles.headerCount}>
              {progress.qualifiedSets}/{progress.requiredSets}
            </Text>
          )}
        </View>

        {/* Oturumun ilerlemesi başlığın alt kenarında ince bir çizgi. Her hareket
            kendi tamamlanma oranı kadar katkı veriyor - çubuk tutan setlerle
            ilerliyor, girilen setlerle değil. */}
        <View style={styles.headerTrack}>
          <View style={[styles.headerFill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
        </View>
      </View>

      <RestBanner request={restRequest} headerHeight={headerHeight} />

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

        {sessionMovements.map((movement, movementIndex) => {
          const step = outline[movementIndex];
          return (
            <SessionMovementCard
              key={movement.movementId}
              movement={movement}
              state={step?.state ?? "todo"}
              requiredSets={step?.requiredSets ?? null}
              qualifiedSets={step?.qualifiedSets ?? 0}
              collapsed={movement.movementId !== focusId}
              personalBest={personalBests[movement.movementId]}
              previous={previousPerformance[movement.movementId]}
              input={inputs[movement.movementId]}
              weightOpen={weightOpenIds.has(movement.movementId)}
              onToggle={() => toggleFocus(movement.movementId)}
              onRemove={() => handleRemoveMovement(movement.movementId, movement.name, movement.sets.length)}
              onChangeInput={(field, value) => updateInput(movement.movementId, field, value)}
              onBump={(field, delta) => bumpValue(movement.movementId, field, delta)}
              onToggleWeight={() => toggleWeightField(movement.movementId)}
              onSave={() => saveSet(movement.movementId)}
              onRemoveSet={(setId, setNumber) =>
                confirmRemoveSet({ setId, movementId: movement.movementId, setNumber })
              }
            />
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
        {/* Bitirme kararının yanındaki tek satır. Yarım oturumda asıl mesaj
            "yine de bitirebilirsin" - kullanıcı eksik hareket kalınca
            bitirmeye çekiniyordu. */}
        {note && (
          <View style={styles.footerNote}>
            <Feather
              name={progress.complete ? "check-circle" : "info"}
              size={12}
              color={progress.complete ? COLORS.accent : COLORS.graphite}
            />
            <Text style={[styles.footerNoteText, progress.complete && styles.footerNoteDone]}>{note}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.finishButton,
            progress.complete && styles.finishButtonDone,
            totalLoggedSets === 0 && styles.cancelButton,
          ]}
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.paper,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBack: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.ink },
  headerSub: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite, marginTop: 1 },
  headerCount: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: COLORS.accent, letterSpacing: 0.5 },
  headerTrack: { height: 3, borderRadius: 2, backgroundColor: COLORS.line, marginTop: 10, overflow: "hidden" },
  headerFill: { height: 3, borderRadius: 2, backgroundColor: COLORS.accent },
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
  footerNote: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  footerNoteText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite },
  footerNoteDone: { color: COLORS.accent },
  finishButton: { backgroundColor: COLORS.inverse, borderRadius: 16, paddingVertical: 16 },
  // Hedefler tamamlanınca düğme vurgu rengine geçiyor: bitirmek artık
  // "vazgeçmek" değil, yapılacak şey.
  finishButtonDone: { backgroundColor: COLORS.accent },
  finishButtonText: { color: COLORS.onAccent, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 16 },
  cancelButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  cancelButtonText: { color: COLORS.graphite },
  })
);
