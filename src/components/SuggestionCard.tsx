import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";

export interface SuggestionItem {
  id: string;
  /** Üst satır: "Pazartesi" ya da "Temel Güç · Pazartesi". */
  context: string;
  name: string;
  /** Doluysa satır "Şınav → Arşer Şınav" olarak çiziliyor (terfi önerisi). */
  nextName?: string | null;
  targetLabel?: string | null;
}

interface SuggestionCardProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  items: SuggestionItem[];
  /** Aksiyon düğmesinin yazısı; verilmezse öneri yalnızca bilgi olarak duruyor. */
  actionLabel?: string | null;
  /** İşlemi sürmekte olan öğe - onun yerinde düğme yerine sayaç dönüyor. */
  busyId?: string | null;
  onAction?: (id: string) => void;
}

/**
 * Program detayındaki öneri kartı: "Basamak Terfisi" ve "Programına Ekle".
 *
 * İkisi ekranda 37'şer satırlık BİREBİR AYNI blok olarak iki kez yazılmıştı;
 * tek fark başlık, ikon ve düğme yazısıydı. Kopyanın maliyeti görünürdü:
 * satır düzenine dokunan her değişiklik iki yerde yapılmak zorundaydı.
 *
 * Aksiyon düğmesi opsiyonel çünkü hazır (başkasının) programında öneri
 * gösteriliyor ama uygulanamıyor - orada yapılacak şey programı kopyalamak.
 */
export function SuggestionCard({
  icon,
  title,
  subtitle,
  items,
  actionLabel,
  busyId,
  onAction,
}: SuggestionCardProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);

  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={15} color={COLORS.accent} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.context}>{item.context}</Text>
            <Text style={styles.movement}>
              {item.name}
              {item.nextName ? (
                <>
                  {" "}
                  <Text style={styles.arrow}>→</Text> {item.nextName}
                </>
              ) : null}
            </Text>
            {item.targetLabel && <Text style={styles.target}>{item.targetLabel}</Text>}
          </View>

          {actionLabel &&
            (busyId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.8}
                disabled={!!busyId}
                onPress={() => onAction?.(item.id)}
              >
                <Text style={styles.buttonText}>{actionLabel}</Text>
              </TouchableOpacity>
            ))}
        </View>
      ))}
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      padding: 16,
      marginTop: 18,
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.25)",
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      color: COLORS.accent,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: COLORS.graphite,
      marginTop: 6,
      marginBottom: 12,
      lineHeight: 19,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.line,
      marginTop: 10,
    },
    context: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: COLORS.graphite,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    movement: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink, marginTop: 2 },
    arrow: { color: COLORS.accent },
    target: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2 },
    button: {
      backgroundColor: COLORS.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    buttonText: { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.onAccent },
  })
);
