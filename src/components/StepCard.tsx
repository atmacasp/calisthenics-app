import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { groupVisual } from "../constants/groupVisuals";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";
import type { StepState } from "../utils/progressionSteps";

export interface StepCardProps {
  /** 0 tabanlı; rozette 1 tabanlı gösteriliyor. */
  index: number;
  name: string;
  imageUrl?: string | null;
  /** Fotoğraf yoksa kategorinin renk/ikon kimliğine düşmek için. */
  groupSlug?: string | null;
  state: StepState;
  meta: string;
  detail?: string | null;
  /** 0-1; yalnızca üzerinde çalışılan basamakta çubuk çiziliyor. */
  ratio?: number | null;
  onPress: () => void;
}

/** Fotoğrafın durumuna göre parlaklığı: göz önce sıradaki basamağa gitsin. */
const MEDIA_OPACITY: Record<StepState, number> = {
  current: 1,
  done: 0.9,
  todo: 0.62,
  locked: 0.3,
};

/**
 * Progression zincirinin satır kartı.
 *
 * Kütüphanedeki GroupCard ile aynı tasarım dili - orada fotoğraf üstte, burada
 * sağda. Fotoğraf soldan sağa açılan bir geçişin altında duruyor: yazının
 * olduğu sol taraf her zaman düz zemin, yani başlık hangi fotoğraf gelirse
 * gelsin okunur kalıyor (referans tasarımda yazı fotoğrafın üstündeydi ve
 * açık renkli karelerde kayboluyordu).
 */
export function StepCard({
  index,
  name,
  imageUrl,
  groupSlug,
  state,
  meta,
  detail,
  ratio,
  onPress,
}: StepCardProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const visual = groupVisual(groupSlug);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = !!imageUrl && !imageFailed;
  const locked = state === "locked";
  const done = state === "done";

  return (
    <TouchableOpacity
      style={[styles.card, state === "current" && styles.cardCurrent]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.media, { opacity: MEDIA_OPACITY[state] }]}>
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
              <MaterialCommunityIcons name={visual.icon} size={38} color="rgba(255,255,255,0.14)" />
            </View>
          </LinearGradient>
        )}

        {/* Soldan sağa açılan geçiş. Hex8 şart: saydam ucu "transparent"
            yapmak Android'de gri bant bırakıyor. */}
        <LinearGradient
          colors={[COLORS.surface, `${COLORS.surface}D9`, `${COLORS.surface}00`]}
          locations={[0, 0.42, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.body}>
        <View style={[styles.badge, locked && styles.badgeLocked, done && styles.badgeDone]}>
          {done ? (
            <Feather name="check" size={15} color={COLORS.onAccent} />
          ) : locked ? (
            <Feather name="lock" size={13} color={COLORS.onAccent} />
          ) : (
            <Text style={styles.badgeText}>{index + 1}</Text>
          )}
        </View>

        <View style={styles.texts}>
          <Text style={[styles.title, locked && styles.titleLocked]} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.metaRow}>
            {state === "current" && (
              <View style={styles.nowBadge}>
                <Text style={styles.nowBadgeText}>SIRADA</Text>
              </View>
            )}
            <Text style={[styles.meta, done && styles.metaDone]} numberOfLines={1}>
              {meta}
            </Text>
          </View>

          {ratio != null && (
            <>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
              {!!detail && <Text style={styles.detail}>{detail}</Text>}
            </>
          )}
        </View>
      </View>

      <View style={styles.chevron}>
        <Feather name="chevron-right" size={15} color={locked ? COLORS.graphite : COLORS.ink} />
      </View>
    </TouchableOpacity>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      minHeight: 92,
      justifyContent: "center",
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.line,
      overflow: "hidden",
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardCurrent: { borderColor: COLORS.accent, borderWidth: 1.5 },
    media: { position: "absolute", top: 0, right: 0, bottom: 0, width: "56%" },
    glyphWrap: { flex: 1, alignItems: "flex-end", justifyContent: "center", paddingRight: 18 },
    body: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingLeft: 14, paddingRight: 44 },
    badge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: COLORS.accent,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    badgeLocked: { backgroundColor: COLORS.graphite },
    badgeDone: { backgroundColor: COLORS.inverse },
    badgeText: { color: COLORS.onAccent, fontFamily: "Inter_700Bold", fontSize: 13 },
    texts: { flex: 1 },
    title: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink, lineHeight: 21 },
    titleLocked: { color: COLORS.graphite },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    meta: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite },
    metaDone: { fontFamily: "Inter_600SemiBold", color: COLORS.accent },
    barTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.line,
      overflow: "hidden",
      marginTop: 8,
      marginRight: 12,
    },
    barFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
    detail: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 4 },
    // Satır içi: mutlak konumdayken iki satırlık başlıkların üstüne biniyordu.
    nowBadge: {
      backgroundColor: COLORS.accent,
      borderRadius: 7,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    nowBadgeText: {
      fontFamily: "Inter_700Bold",
      fontSize: 9,
      letterSpacing: 0.6,
      color: COLORS.onAccent,
    },
    chevron: {
      position: "absolute",
      right: 12,
      bottom: 12,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: `${COLORS.surface}E6`,
      borderWidth: 1,
      borderColor: COLORS.line,
      alignItems: "center",
      justifyContent: "center",
    },
  })
);
