import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";

export interface SetChipProps {
  /** 0 tabanlı; etikette 1 tabanlı yazılıyor. */
  index: number;
  /** Setin değeri: tekrar ya da saniye. */
  value: number | null;
  /** "tekrar" / "sn" - tek kelime, çipe sığması için kısa. */
  unit: string;
  addedWeightKg?: number | null;
  /** Setin hedefe oranı (0-1). Hedefi olmayan harekette null - çubuk çizilmez. */
  ratio?: number | null;
  /** Set hedefi tuttu mu (hedefin tanımıyla aynı kural). */
  met: boolean;
  /** Bu set kişisel rekor mu. */
  isRecord: boolean;
  onDelete: () => void;
}

/**
 * Kaydedilmiş tek bir setin kartı. Aktif antrenman ekranında setler dikey bir
 * metin listesi yerine yatay şerit halinde duruyor: 11 setlik bir hareket
 * ekranı aşağı doğru şişirmiyor, gözün gördüğü şey "kaç set, hangisi tuttu".
 *
 * Çubuk setin hedefe oranını gösteriyor - 8 tekrarlık hedefte 6'lık set yarıdan
 * fazla dolu ama TUTMUYOR; bu ayrım kasıtlı: tutan setin çerçevesi vurgulu ve
 * tik alıyor, tutmayan set sönük kalıyor. (Referans tasarımda 8 hedefli sette
 * 7 ve 1 tekrara da yeşil tik veriliyordu - hedefin anlamını siliyor.)
 */
export function SetChip({ index, value, unit, addedWeightKg, ratio, met, isRecord, onDelete }: SetChipProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const fill = ratio == null ? null : Math.max(0, Math.min(1, ratio));

  return (
    <View style={[styles.chip, met && styles.chipMet, isRecord && styles.chipRecord]}>
      <View style={styles.topRow}>
        <Text style={styles.label}>SET {index + 1}</Text>
        {met && <Feather name="check" size={12} color={COLORS.accent} />}
        <View style={{ flex: 1 }} />
        <TouchableOpacity hitSlop={8} onPress={onDelete}>
          <Feather name="x" size={13} color={COLORS.graphite} />
        </TouchableOpacity>
      </View>

      <View style={styles.valueRow}>
        {isRecord && <Text style={styles.trophy}>🏆</Text>}
        <Text style={[styles.value, met && styles.valueMet]}>{value ?? "-"}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      {addedWeightKg ? <Text style={styles.weight}>+{addedWeightKg} kg</Text> : null}

      {fill != null && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(fill * 100)}%` }, met && styles.barFillMet]} />
        </View>
      )}
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    chip: {
      width: 108,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.line,
      backgroundColor: COLORS.paper,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 2,
    },
    chipMet: { borderColor: COLORS.accent },
    // Rekor çipi vurgulu ama palet dışına çıkmıyor; "altın" hissini kupa veriyor.
    chipRecord: { borderColor: COLORS.accent, backgroundColor: "rgba(34,197,94,0.08)" },
    topRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    label: {
      fontFamily: "Inter_700Bold",
      fontSize: 10,
      letterSpacing: 0.6,
      color: COLORS.graphite,
    },
    valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    trophy: { fontSize: 13 },
    value: {
      fontFamily: "BebasNeue_400Regular",
      fontSize: 26,
      lineHeight: 30,
      color: COLORS.graphite,
    },
    valueMet: { color: COLORS.ink },
    unit: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite },
    weight: { fontFamily: "Inter_500Medium", fontSize: 10, color: COLORS.graphite },
    barTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: COLORS.line,
      overflow: "hidden",
      marginTop: 6,
    },
    barFill: { height: 3, borderRadius: 2, backgroundColor: COLORS.graphite },
    barFillMet: { backgroundColor: COLORS.accent },
  })
);
