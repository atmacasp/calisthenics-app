import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";
import { DAY_SHORT } from "../utils/programDays";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

interface DayPickerSheetProps {
  visible: boolean;
  /** Programın kaç antrenman günü var - o kadar gün seçilmesi gerekiyor. */
  requiredCount: number;
  selectedDays: number[];
  /** Seçim tamamlandı mı (requiredCount kadar gün seçildi mi). */
  ready: boolean;
  /** Seçim mevcut günlerin aynısı mı - öyleyse kaydedecek bir şey yok. */
  isNoop: boolean;
  /** "Pazartesi → Salı" önizleme satırları. */
  preview: string[];
  saving: boolean;
  onToggleDay: (day: number) => void;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Program günlerini kaydırma alt sayfası.
 *
 * Ekranın içinde 60 satırlık isimsiz bir blok olarak duruyordu. Kaydırmanın
 * kendisi burada DEĞİL: hangi günün hangi güne gideceğini programDays motoru
 * (buildDayRemap/describeRemap) hesaplıyor, buradaki iş onu çizmek.
 *
 * "Şablona dokunulmaz" vurgusu kasıtlı: kullanıcılar gün değiştirmenin
 * programı bozacağından çekiniyordu.
 */
export function DayPickerSheet({
  visible,
  requiredCount,
  selectedDays,
  ready,
  isNoop,
  preview,
  saving,
  onToggleDay,
  onClose,
  onSave,
}: DayPickerSheetProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Antrenman Günleri</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Şablona dokunulmaz - hareketler, hedefler ve sıra aynı kalır, sadece hangi günlere denk geldiği değişir.
          </Text>

          <View style={styles.chipRow}>
            {ALL_DAYS.map((day) => {
              const picked = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.chip, picked && styles.chipActive]}
                  onPress={() => onToggleDay(day)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, picked && styles.chipTextActive]}>{DAY_SHORT[day]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.counter, ready && { color: COLORS.accent }]}>
            {selectedDays.length}/{requiredCount} gün seçildi
          </Text>

          {preview.length > 0 && (
            <View style={styles.previewBox}>
              {preview.map((line) => (
                <Text key={line} style={styles.previewLine}>
                  {line}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, (!ready || isNoop) && styles.saveButtonDisabled]}
            onPress={onSave}
            activeOpacity={0.85}
            disabled={!ready || isNoop || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.onAccent} />
            ) : (
              <Text style={styles.saveButtonText}>{isNoop && ready ? "Değişiklik yok" : "Günleri Taşı"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: COLORS.paper,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 22,
      paddingBottom: 34,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.ink },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.graphite,
      marginTop: 6,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
    chip: {
      minWidth: 46,
      paddingHorizontal: 10,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.line,
    },
    chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    chipText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.ink },
    chipTextActive: { color: COLORS.onAccent },
    counter: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite, marginTop: 12 },
    previewBox: {
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.line,
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
      gap: 4,
    },
    previewLine: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.ink },
    saveButton: {
      marginTop: 18,
      backgroundColor: COLORS.accent,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
    },
    saveButtonDisabled: { backgroundColor: COLORS.line },
    saveButtonText: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.onAccent },
  })
);
