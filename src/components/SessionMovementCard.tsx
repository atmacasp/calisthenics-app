import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";
import type { SessionMovement } from "../store/workoutStore";
import type { PreviousPerformance } from "../services/performance.service";
import { buildSetPlan, lastSetFeedback, setValueRatio } from "../utils/setCoach";
import { computeRecordHolderIds, setMeetsOwnTarget, type PersonalBest } from "../utils/setRecords";
import { formatTarget } from "../utils/targetProgress";
import type { FlowState } from "../utils/sessionFlow";
import { SetChip } from "./SetChip";

export interface SessionInput {
  reps: string;
  duration: string;
  weight: string;
}

export interface SessionMovementCardProps {
  movement: SessionMovement;
  /** sessionOutline'dan gelen durum: bitti / açık / bekliyor. */
  state: FlowState;
  /** Kapalıyken başlıkta gösterilen sayaç; hedefi olmayan harekette null. */
  requiredSets: number | null;
  qualifiedSets: number;
  collapsed: boolean;
  /** Antrenman BAŞLAMADAN önceki rekorlar - antrenman boyunca değişmez. Rekorlar
   *  daha yüklenmediyse verilmeyebilir. */
  personalBest?: PersonalBest;
  previous?: PreviousPerformance;
  /** Giriş alanlarının o anki değeri; hareket için hiç dokunulmadıysa verilmeyebilir. */
  input?: SessionInput;
  weightOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onChangeInput: (field: keyof SessionInput, value: string) => void;
  onBump: (field: "reps" | "duration", delta: number) => void;
  onToggleWeight: () => void;
  onSave: () => void;
  onRemoveSet: (setId: string, setNumber: number) => void;
}

const EMPTY_BEST: PersonalBest = { maxReps: 0, maxDuration: 0, maxWeight: 0 };
const EMPTY_INPUT: SessionInput = { reps: "", duration: "", weight: "" };

/**
 * Aktif antrenmandaki tek bir hareketin kartı.
 *
 * Ekranın içinde isimsiz bir blok olarak duruyordu - 230 satır JSX ve kendi
 * stilleri. Kart, hangi seti önereceğine kendi karar vermiyor: setCoach'a
 * soruyor. Buradaki tek iş o kararı çizmek.
 *
 * Kapalıyken sadece başlık + sayaç görünüyor (tek odak kuralı: aynı anda tek
 * kart açık), açıkken reçete satırı, setler ve giriş sayacı geliyor.
 */
export function SessionMovementCard({
  movement,
  state,
  requiredSets,
  qualifiedSets,
  collapsed,
  personalBest = EMPTY_BEST,
  previous,
  input = EMPTY_INPUT,
  weightOpen,
  onToggle,
  onRemove,
  onChangeInput,
  onBump,
  onToggleWeight,
  onSave,
  onRemoveSet,
}: SessionMovementCardProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);

  const plan = buildSetPlan(movement);
  const feedback = lastSetFeedback(movement);
  const recordHolderIds = computeRecordHolderIds(movement.sets, personalBest);
  const targetText = formatTarget({
    target_type: movement.targetType ?? null,
    target_sets: movement.targetSets ?? null,
    target_reps: movement.targetReps ?? null,
    target_duration_seconds: movement.targetDurationSeconds ?? null,
  });

  // Hedefi olmayan harekette hem tekrar hem süre girilebilsin diye
  // sayaç tekrarı, yanındaki küçük alan süreyi alıyor.
  const showLooseDuration = !movement.targetType;
  const stepField: "reps" | "duration" = plan.kind;
  const stepDelta = plan.kind === "duration" ? 5 : 1;
  const done = state === "done";

  return (
    <View style={[styles.card, done && styles.cardDone, !collapsed && styles.cardFocused]}>
      <TouchableOpacity style={styles.cardHeaderRow} activeOpacity={0.7} onPress={onToggle}>
        {/* Durum işareti chevron'un yerini aldı: hareketin bitip bitmediği
            kartı açmadan görünüyor, açık olan zaten tek. */}
        <View
          style={[styles.stateDot, done && styles.stateDotDone, state === "current" && styles.stateDotCurrent]}
        >
          {done && <Feather name="check" size={12} color={COLORS.onAccent} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{movement.name}</Text>
          {movement.groupName && <Text style={styles.cardCategory}>{movement.groupName}</Text>}
        </View>
        {collapsed && (
          <Text style={[styles.collapsedSummary, done && styles.collapsedSummaryDone]}>
            {requiredSets != null
              ? `${qualifiedSets}/${requiredSets} set`
              : movement.sets.length > 0
                ? `${movement.sets.length} set`
                : "Henüz set yok"}
          </Text>
        )}
        <TouchableOpacity hitSlop={10} style={{ marginLeft: 12 }} onPress={onRemove}>
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
              <Feather name={plan.targetComplete ? "check-circle" : "target"} size={12} color={COLORS.accent} />
              <Text style={styles.planHint}>{plan.hint ?? `Hedef: ${targetText}`}</Text>
            </View>
          )}

          {previous && (
            <View style={styles.previousRow}>
              <Feather name="rotate-ccw" size={12} color={COLORS.graphite} />
              <Text style={styles.previousText}>Geçen sefer: {previous.summary}</Text>
            </View>
          )}

          {/* Setler yatay şeritte: 11 setlik bir hareket ekranı aşağı
              doğru şişirmiyor, son setler de göz hizasında kalıyor. */}
          {movement.sets.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setStrip}>
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
                    met={setMeetsOwnTarget(s, movement.targetType, movement.targetReps, movement.targetDurationSeconds)}
                    isRecord={recordHolderIds.has(s.id)}
                    onDelete={() => onRemoveSet(s.id, i + 1)}
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
              onPress={() => onBump(stepField, -stepDelta)}
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
                value={input[stepField] ?? ""}
                onChangeText={(v) => onChangeInput(stepField, v)}
              />
              <Text style={styles.stepUnit}>{plan.kind === "duration" ? "saniye" : "tekrar"}</Text>
            </View>

            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => onBump(stepField, stepDelta)}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={20} color={COLORS.ink} />
            </TouchableOpacity>

            {/* Değer girilmişse düğme onu gösteriyor: alan kapalıyken de
                "ek ağırlık var" bilgisi kaybolmuyor. */}
            <TouchableOpacity
              style={[styles.kgButton, !!input.weight && styles.kgButtonActive]}
              onPress={onToggleWeight}
              activeOpacity={0.7}
            >
              <Text style={[styles.kgText, !!input.weight && styles.kgTextActive]} numberOfLines={1}>
                {input.weight ? `+${input.weight}` : "KG"}
              </Text>
            </TouchableOpacity>
          </View>

          {(weightOpen || showLooseDuration) && (
            <View style={styles.extraRow}>
              {showLooseDuration && (
                <TextInput
                  style={styles.smallInput}
                  placeholder="Süre (sn)"
                  placeholderTextColor={COLORS.graphite}
                  keyboardType="number-pad"
                  value={input.duration ?? ""}
                  onChangeText={(v) => onChangeInput("duration", v)}
                />
              )}
              {weightOpen && (
                <TextInput
                  style={styles.smallInput}
                  placeholder="Ek ağırlık (kg)"
                  placeholderTextColor={COLORS.graphite}
                  keyboardType="decimal-pad"
                  autoFocus
                  value={input.weight ?? ""}
                  onChangeText={(v) => onChangeInput("weight", v)}
                />
              )}
            </View>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>{plan.setNumber}. SETİ KAYDET</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
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
    // Açık kart hafifçe öne çıkıyor, biten kart soluyor: göz hangi harekette
    // olduğunu listeyi okumadan buluyor.
    cardFocused: { borderWidth: 1, borderColor: COLORS.accent },
    cardDone: { opacity: 0.72 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center" },
    stateDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: COLORS.line,
    },
    stateDotCurrent: { borderColor: COLORS.accent, backgroundColor: `${COLORS.accent}22` },
    stateDotDone: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
    cardTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.ink },
    cardCategory: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 1 },
    collapsedSummary: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.graphite },
    collapsedSummaryDone: { color: COLORS.accent },
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
  })
);
