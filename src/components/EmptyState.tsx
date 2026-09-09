import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Veri yokken "0" ve boş grafik göstermek yerine ne olacağını anlatan kart.
 *
 * Yeni kullanıcı uygulamanın bozuk olduğunu değil, henüz sırasının gelmediğini
 * görmeli; bu yüzden her boş durum bir sonraki adımı da öneriyor.
 */
export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);

  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color={COLORS.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.line,
      paddingVertical: 28,
      paddingHorizontal: 22,
      alignItems: "center",
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(34,197,94,0.12)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
      color: COLORS.ink,
      marginTop: 14,
      textAlign: "center",
    },
    description: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.graphite,
      marginTop: 6,
      textAlign: "center",
    },
    button: {
      marginTop: 18,
      backgroundColor: COLORS.accent,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    buttonText: {
      fontFamily: "Inter_700Bold",
      fontSize: 13,
      color: COLORS.onAccent,
    },
  })
);
