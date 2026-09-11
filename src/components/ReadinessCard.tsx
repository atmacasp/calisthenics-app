import { View, Text, StyleSheet } from "react-native";
import type { ComponentProps } from "react";
import { Feather } from "@expo/vector-icons";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";
import type { ReadinessVerdict } from "../utils/readiness";

interface ReadinessCardProps {
  verdict: ReadinessVerdict;
}

/**
 * "Neden ilerlemiyorum" kartı.
 *
 * Kararı vermiyor, readiness motorunun verdiği kararı çiziyor. Sessiz kalması
 * gereken durumlar burada eleniyor: hiç çalışılmamış hareket (söylenecek bir
 * şey yok) ve hedefi zaten tutmuş hareket (hedef kartı bunu söylüyor, iki kez
 * söylemek gürültü).
 */
export function ReadinessCard({ verdict }: ReadinessCardProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);

  if (verdict.state === "target-met") return null;
  if (verdict.state === "insufficient-data" && verdict.sessionsUsed === 0) return null;

  // Saplanma bir HATA değil, normal bir durum - kırmızı bağırmak yanlış olurdu.
  // Kırmızı yalnızca gerçekten düşüş varken. Kartın işi uyarmak değil, yol göstermek.
  const tone =
    verdict.state === "progressing"
      ? COLORS.accent
      : verdict.state === "regressing"
        ? COLORS.warn
        : verdict.state === "stalled"
          ? COLORS.ink
          : COLORS.graphite;

  const icon: ComponentProps<typeof Feather>["name"] =
    verdict.state === "progressing"
      ? "trending-up"
      : verdict.state === "regressing"
        ? "trending-down"
        : verdict.state === "stalled"
          ? "minus-circle"
          : "clock";

  return (
    <View style={[styles.card, { borderLeftColor: tone }]}>
      <View style={styles.headRow}>
        <Feather name={icon} size={15} color={tone} />
        <Text style={[styles.headline, { color: tone }]}>{verdict.headline}</Text>
      </View>

      {verdict.detail && <Text style={styles.detail}>{verdict.detail}</Text>}

      {verdict.advice && (
        <View style={styles.adviceRow}>
          <Feather name="zap" size={13} color={COLORS.graphite} />
          <Text style={styles.advice}>{verdict.advice}</Text>
        </View>
      )}
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderLeftWidth: 3,
      padding: 14,
      marginTop: 12,
    },
    headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    headline: { fontFamily: "Inter_700Bold", fontSize: 14, flex: 1 },
    detail: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.ink,
      marginTop: 6,
    },
    adviceRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.line,
    },
    advice: {
      flex: 1,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.graphite,
    },
  })
);
