import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { programsService } from "../../src/services/programs.service";
import { movementsService } from "../../src/services/movements.service";
import type { MovementWithGroupAndPrerequisites } from "../../src/types/movements";
import type { ProgramDraft, ProgramDraftMovement, ProgramLevel } from "../../src/types/programs";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../src/constants/theme";
import { DAY_NAMES, DAY_SHORT } from "../../src/utils/programDays";
import { todayDayOfWeek } from "../../src/utils/date";
import { inferProgramTargetKind } from "../../src/utils/programTargets";

const MIN_QUERY_LENGTH = 2;

// Gün isimleri programDays'ten türetiliyor - burada üçüncü bir kopya vardı
// ve Perşembe'yi başka türlü kısaltıyordu.
const DAYS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ n, short: DAY_SHORT[n], name: DAY_NAMES[n] }));

const LEVELS: { value: ProgramLevel; label: string }[] = [
  { value: "beginner", label: "Başlangıç" },
  { value: "intermediate", label: "Orta" },
  { value: "advanced", label: "İleri" },
];

/** Ekran içi taslak satırı - sayısal alanlar düzenleme kolaylığı için string tutulur */
type DraftItem = {
  key: string;
  movementId: string;
  movementName: string;
  groupName: string;
  targetType: "reps_sets" | "duration" | null;
  sets: string;
  reps: string;
  duration: string;
  rest: string;
};

type DaysState = Record<number, DraftItem[]>;

const emptyDays = (): DaysState => ({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] });

function toNum(value: string): number | null {
  const parsed = Number(value);
  if (!value.trim() || Number.isNaN(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

export default function ProgramBuilderScreen() {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const params = useLocalSearchParams<{ id?: string }>();
  const programId = params.id ?? null;
  const isEditing = !!programId;
  const userId = useAuthStore((s) => s.session?.user.id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<ProgramLevel | null>(null);
  const [days, setDays] = useState<DaysState>(emptyDays);
  const [selectedDay, setSelectedDay] = useState<number>(todayDayOfWeek());

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [movements, setMovements] = useState<MovementWithGroupAndPrerequisites[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  // Düzenleme modunda mevcut programı taslağa çevir
  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    programsService
      .getProgramWithDays(programId)
      .then((program) => {
        if (cancelled || !program) return;
        setName(program.name);
        setDescription(program.description ?? "");
        setLevel((program.level as ProgramLevel) ?? null);
        const next = emptyDays();
        Object.entries(program.daysMap).forEach(([day, items]) => {
          const dayNumber = Number(day);
          if (dayNumber < 1 || dayNumber > 7) return;
          next[dayNumber] = items.map((item, index) => ({
            key: `${item.id}-${index}`,
            movementId: item.movementId ?? "",
            movementName: item.movementName,
            groupName: "",
            targetType: inferProgramTargetKind(item),
            sets: item.targetSets ? String(item.targetSets) : "",
            reps: item.targetReps ? String(item.targetReps) : "",
            duration: item.targetDurationSeconds ? String(item.targetDurationSeconds) : "",
            rest: item.restSeconds ? String(item.restSeconds) : "60",
          }));
        });
        setDays(next);
      })
      .catch((error: any) => Alert.alert("Hata", error.message ?? "Program yüklenemedi"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setQuery("");
    if (movements.length > 0) return;
    setMovementsLoading(true);
    try {
      const data = await movementsService.getAllMovementsWithPrerequisites();
      setMovements(data);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Hareketler yüklenemedi");
    } finally {
      setMovementsLoading(false);
    }
  }, [movements.length]);

  const filteredMovements = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (q.length < MIN_QUERY_LENGTH) return movements;
    return movements.filter((m) => {
      const inName = m.name.toLocaleLowerCase("tr").includes(q);
      const inGroup = (m.movement_groups?.name ?? "").toLocaleLowerCase("tr").includes(q);
      return inName || inGroup;
    });
  }, [movements, query]);

  const addMovement = (movement: MovementWithGroupAndPrerequisites) => {
    const item: DraftItem = {
      key: `${movement.id}-${Date.now()}`,
      movementId: movement.id,
      movementName: movement.name,
      groupName: movement.movement_groups?.name ?? "",
      targetType: (movement.target_type as "reps_sets" | "duration" | null) ?? "reps_sets",
      sets: movement.target_sets ? String(movement.target_sets) : "3",
      reps: movement.target_reps ? String(movement.target_reps) : "",
      duration: movement.target_duration_seconds ? String(movement.target_duration_seconds) : "",
      rest: "60",
    };
    setDays((prev) => ({ ...prev, [selectedDay]: [...prev[selectedDay], item] }));
    setPickerOpen(false);
  };

  const patchItem = (key: string, patch: Partial<DraftItem>) => {
    setDays((prev) => ({
      ...prev,
      [selectedDay]: prev[selectedDay].map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (key: string) => {
    setDays((prev) => ({ ...prev, [selectedDay]: prev[selectedDay].filter((item) => item.key !== key) }));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setDays((prev) => {
      const list = [...prev[selectedDay]];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, [selectedDay]: list };
    });
  };

  const totalMovements = useMemo(
    () => Object.values(days).reduce((sum, list) => sum + list.length, 0),
    [days]
  );
  const trainingDayCount = useMemo(
    () => Object.values(days).filter((list) => list.length > 0).length,
    [days]
  );

  const handleSave = async () => {
    if (!userId || saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Eksik bilgi", "Programa bir isim ver.");
      return;
    }
    if (totalMovements === 0) {
      Alert.alert("Eksik bilgi", "En az bir güne hareket ekle. Boş bıraktığın günler dinlenme günü olur.");
      return;
    }

    setSaving(true);
    try {
      const draftDays: Record<number, ProgramDraftMovement[]> = {};
      Object.entries(days).forEach(([day, list]) => {
        if (list.length === 0) return;
        draftDays[Number(day)] = list.map((item) => {
          const isDuration = item.targetType === "duration";
          return {
            movementId: item.movementId,
            targetSets: toNum(item.sets),
            targetReps: isDuration ? null : toNum(item.reps),
            targetDurationSeconds: isDuration ? toNum(item.duration) : null,
            restSeconds: toNum(item.rest) ?? 60,
          };
        });
      });

      const draft: ProgramDraft = {
        name: trimmedName,
        description: description.trim() || null,
        level,
        days: draftDays,
      };

      const saved = await programsService.saveProgram(userId, draft, programId);
      router.replace(`/programs/${saved.id}`);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Program kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Program" }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const dayItems = days[selectedDay] ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: true, title: isEditing ? "Programı Düzenle" : "Yeni Program" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Program adı</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn. Push / Pull / Legs"
          placeholderTextColor={COLORS.graphite}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Açıklama (opsiyonel)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Bu program neye odaklanıyor?"
          placeholderTextColor={COLORS.graphite}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Seviye</Text>
        <View style={styles.levelRow}>
          {LEVELS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.levelButton, level === option.value && styles.levelButtonActive]}
              onPress={() => setLevel(level === option.value ? null : option.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.levelText, level === option.value && styles.levelTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
          <Text style={styles.summaryText}>
            {trainingDayCount > 0
              ? `Haftada ${trainingDayCount} antrenman günü · ${totalMovements} hareket`
              : "Henüz hiçbir güne hareket eklenmedi"}
          </Text>
        </View>

        <Text style={styles.label}>Günler</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {DAYS.map((day) => {
            const count = days[day.n].length;
            const active = selectedDay === day.n;
            return (
              <TouchableOpacity
                key={day.n}
                style={[styles.dayPill, active && styles.dayPillActive]}
                onPress={() => setSelectedDay(day.n)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{day.short}</Text>
                <View style={[styles.dayCountDot, count > 0 && styles.dayCountDotFilled, active && styles.dayCountDotOnActive]}>
                  <Text style={[styles.dayCountText, count > 0 && styles.dayCountTextFilled]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.dayHeading}>{DAYS.find((d) => d.n === selectedDay)?.name}</Text>

        {dayItems.length === 0 ? (
          <View style={styles.restBox}>
            <Text style={styles.restText}>Bu gün şu an dinlenme günü 🌿</Text>
            <Text style={styles.restHint}>Hareket eklersen antrenman günü olur.</Text>
          </View>
        ) : (
          dayItems.map((item, index) => {
            const isDuration = item.targetType === "duration";
            return (
              <View key={item.key} style={styles.movementCard}>
                <View style={styles.movementHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.movementName}>{item.movementName}</Text>
                    {!!item.groupName && <Text style={styles.movementGroup}>{item.groupName}</Text>}
                  </View>
                  <TouchableOpacity style={styles.iconButton} onPress={() => moveItem(index, -1)} disabled={index === 0}>
                    <Ionicons name="arrow-up" size={16} color={index === 0 ? COLORS.line : COLORS.graphite} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => moveItem(index, 1)}
                    disabled={index === dayItems.length - 1}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={index === dayItems.length - 1 ? COLORS.line : COLORS.graphite}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => removeItem(item.key)}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.warn} />
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Set</Text>
                    <TextInput
                      style={styles.fieldInput}
                      keyboardType="number-pad"
                      value={item.sets}
                      onChangeText={(v) => patchItem(item.key, { sets: v })}
                      placeholder="3"
                      placeholderTextColor={COLORS.line}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>{isDuration ? "Süre (sn)" : "Tekrar"}</Text>
                    <TextInput
                      style={styles.fieldInput}
                      keyboardType="number-pad"
                      value={isDuration ? item.duration : item.reps}
                      onChangeText={(v) => patchItem(item.key, isDuration ? { duration: v } : { reps: v })}
                      placeholder={isDuration ? "30" : "8"}
                      placeholderTextColor={COLORS.line}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Dinlenme</Text>
                    <TextInput
                      style={styles.fieldInput}
                      keyboardType="number-pad"
                      value={item.rest}
                      onChangeText={(v) => patchItem(item.key, { rest: v })}
                      placeholder="60"
                      placeholderTextColor={COLORS.line}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.addButton} onPress={openPicker} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={COLORS.accent} />
          <Text style={styles.addButtonText}>Bu Güne Hareket Ekle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.onAccent} />
          ) : (
            <Text style={styles.saveButtonText}>{isEditing ? "Değişiklikleri Kaydet" : "Programı Oluştur"}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hareket Seç</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={COLORS.graphite} />
            <TextInput
              style={styles.searchInput}
              placeholder="Hareket veya kategori ara"
              placeholderTextColor={COLORS.graphite}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color={COLORS.graphite} />
              </TouchableOpacity>
            )}
          </View>

          {movementsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredMovements}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => addMovement(item)} activeOpacity={0.7}>
                  <View style={styles.pickerAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{item.name}</Text>
                    <Text style={styles.pickerGroup}>{item.movement_groups?.name ?? ""}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Eşleşen hareket yok.</Text>}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  content: { padding: 20, paddingBottom: 48 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.ink, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.ink,
  },
  inputMultiline: { minHeight: 76, textAlignVertical: "top" },
  levelRow: { flexDirection: "row", gap: 8 },
  levelButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  levelButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  levelText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.ink },
  levelTextActive: { color: COLORS.onAccent, fontFamily: "Inter_700Bold" },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 12,
    padding: 12,
  },
  summaryText: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.ink, flex: 1 },
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginRight: 8,
  },
  dayPillActive: { backgroundColor: COLORS.inverse, borderColor: COLORS.inverse },
  dayPillText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.ink },
  dayPillTextActive: { color: COLORS.onInverse },
  dayCountDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  dayCountDotFilled: { backgroundColor: COLORS.accent },
  dayCountDotOnActive: { opacity: 0.95 },
  dayCountText: { fontFamily: "Inter_700Bold", fontSize: 10, color: COLORS.graphite },
  dayCountTextFilled: { color: COLORS.onAccent },
  dayHeading: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.ink, marginBottom: 12 },
  restBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  restText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink },
  restHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite },
  movementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    marginBottom: 10,
  },
  movementHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  movementName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.ink },
  movementGroup: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 2 },
  iconButton: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fieldRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  field: { flex: 1 },
  fieldLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginBottom: 4 },
  fieldInput: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.ink,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  addButtonText: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.accent },
  saveButton: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
  },
  saveButtonText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.onAccent },
  modalContainer: { flex: 1, backgroundColor: COLORS.paper },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.ink },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.ink },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  pickerAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: COLORS.accent },
  pickerName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink },
  pickerGroup: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 2 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite, textAlign: "center", marginTop: 30 },
  })
);
