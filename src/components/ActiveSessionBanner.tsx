import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useActiveSession } from "../hooks/useActiveSession";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../constants/theme";

function elapsedLabel(startedAt: string) {
  const minutes = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (minutes < 1) return "az önce başladı";
  if (minutes < 60) return `${minutes} dk önce başladı`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce başladı`;
  return `${Math.floor(hours / 24)} gün önce başladı`;
}

/**
 * Bitirilmemiş bir antrenman varsa gösterilir, yoksa hiçbir şey çizmez.
 * Varsayılan kenar boşlukları Ana Sayfa'nın (yatay padding'i olmayan) düzenine
 * göre; farklı padding'i olan ekranlar style ile ezer.
 */
export function ActiveSessionBanner({
  userId,
  style,
}: {
  userId?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const { pending, busy, reload, resume, discard } = useActiveSession(userId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!pending) return null;

  // Bant yalnızca seti olan oturumlar için çıkıyor (useActiveSession).
  const detail = `${pending.movementCount} hareket · ${pending.setCount} set`;

  return (
    <View style={[styles.banner, style]}>
      <View style={styles.headerRow}>
        <View style={styles.pulseDot} />
        <Text style={styles.title}>Devam eden antrenman</Text>
        <TouchableOpacity onPress={discard} disabled={busy} style={styles.discardButton}>
          <Ionicons name="trash-outline" size={16} color="rgba(250,249,246,0.55)" />
        </TouchableOpacity>
      </View>

      <Text style={styles.detail}>{detail}</Text>
      <Text style={styles.meta}>
        {pending.programName ? `${pending.programName} · ` : ""}
        {elapsedLabel(pending.startedAt)}
      </Text>

      <TouchableOpacity style={styles.resumeButton} onPress={resume} disabled={busy} activeOpacity={0.85}>
        {busy ? (
          <ActivityIndicator size="small" color={COLORS.ink} />
        ) : (
          <>
            <Text style={styles.resumeText}>Kaldığın Yerden Devam Et</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.ink} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
  banner: {
    backgroundColor: COLORS.inverse,
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  discardButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  detail: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.onInverse, marginTop: 8 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(250,249,246,0.55)", marginTop: 2 },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  resumeText: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.ink },
  })
);
