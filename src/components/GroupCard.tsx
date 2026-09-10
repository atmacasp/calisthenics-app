import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { groupVisual } from "../constants/groupVisuals";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";

export interface GroupCardProps {
  name: string;
  slug?: string | null;
  imageUrl?: string | null;
  completed: number;
  total: number;
  nextName: string | null;
  nextLocked: boolean;
  onPress: () => void;
}

/**
 * Hareket Kütüphanesi'nin ızgara kartı.
 *
 * Üst yarı görsel, alt yarı bilgi; ikisinin arasında karta eriyen bir geçiş var.
 * Başlık geçişin üstüne biniyor - fotoğraf gelince de okunur kalsın diye orada
 * karartma katmanı duruyor.
 */
export function GroupCard({
  name,
  slug,
  imageUrl,
  completed,
  total,
  nextName,
  nextLocked,
  onPress,
}: GroupCardProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const visual = groupVisual(slug);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const ratio = total > 0 ? completed / total : 0;
  const finished = total > 0 && completed === total;
  const showImage = !!imageUrl && !imageFailed;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.media}>
        {showImage ? (
          <Image
            source={{ uri: imageUrl! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <LinearGradient colors={visual.colors} style={StyleSheet.absoluteFill}>
            <View style={styles.glyphWrap}>
              <MaterialCommunityIcons name={visual.icon} size={46} color="rgba(255,255,255,0.16)" />
            </View>
          </LinearGradient>
        )}

        {/* Alt kenarda karta eriyen geçiş. Hex8 kullanılıyor: saydam ucu
            "transparent" yapmak Android'de gri bant bırakıyor. */}
        <LinearGradient
          colors={[`${COLORS.surface}00`, `${COLORS.surface}CC`, COLORS.surface]}
          locations={[0, 0.55, 1]}
          style={styles.fade}
        />

        {finished && (
          <View style={styles.awardBadge}>
            <Feather name="award" size={13} color={COLORS.onAccent} />
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name={visual.icon}
            size={13}
            color={nextLocked && !finished ? COLORS.graphite : COLORS.accent}
          />
          <Text style={[styles.statusText, finished && styles.statusTextDone]} numberOfLines={1}>
            {finished
              ? "Tamamlandı"
              : nextName
              ? `${nextLocked ? "Kilitli" : "Sırada"}: ${nextName}`
              : "Hareket yok"}
          </Text>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.countText}>
            {completed} / {total} basamak
          </Text>
          <View style={styles.chevronCircle}>
            <Feather name="chevron-right" size={14} color={COLORS.ink} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.line,
      overflow: "hidden",
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    media: { width: "100%", aspectRatio: 1.35, justifyContent: "flex-end" },
    glyphWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "62%" },
    awardBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: COLORS.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
      color: COLORS.ink,
      paddingHorizontal: 12,
      paddingBottom: 2,
    },
    body: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite },
    statusTextDone: { fontFamily: "Inter_600SemiBold", color: COLORS.accent },
    barTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.line, overflow: "hidden", marginTop: 9 },
    barFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
    footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    countText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.graphite },
    chevronCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: COLORS.paper,
      borderWidth: 1,
      borderColor: COLORS.line,
      alignItems: "center",
      justifyContent: "center",
    },
  })
);
