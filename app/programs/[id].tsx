
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useCallback, useState } from "react";
import { useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { programsService } from "../../src/services/programs.service";
import type { ProgramMovementWithName, ProgramWithDays, UserProgramRow } from "../../src/types/programs";
import { COLORS } from "../../src/constants/theme";

const DAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Başlangıç",
  intermediate: "Orta Seviye",
  advanced: "İleri Seviye",
};

// program_movements tablosunda target_type kolonu yok (movements'tan farklı
// olarak) - hangi tür hedef olduğunu target_duration_seconds/target_reps
// dolu mu diye bakarak çıkarıyoruz.
function formatProgramTarget(pm: ProgramMovementWithName): string {
  if (pm.targetDurationSeconds) return `${pm.targetSets ?? 1} set x ${pm.targetDurationSeconds} sn`;
  if (pm.targetReps) return `${pm.targetSets ?? 1} set x ${pm.targetReps} tekrar`;
  return `${pm.targetSets ?? 1} set`;
}

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [program, setProgram] = useState<ProgramWithDays | null>(null);
  const [activeProgram, setActiveProgram] = useState<UserProgramRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, active] = await Promise.all([
        programsService.getProgramWithDays(id),
        userId ? programsService.getActiveUserProgram(userId) : Promise.resolve(null),
      ]);
      setProgram(detail);
      setActiveProgram(active);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const isActive = !!(program && activeProgram?.program_id === program.id);

  const handleFollow = async () => {
    if (!userId || !program || updating) return;
    setUpdating(true);
    try {
      const row = await programsService.startProgram(userId, program.id);
      setActiveProgram(row);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Programa başlanamadı");
    } finally {
      setUpdating(false);
    }
  };

  const handleUnfollow = async () => {
    if (!activeProgram || updating) return;
    setUpdating(true);
    try {
      await programsService.stopProgram(activeProgram.id);
      setActiveProgram(null);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Takip bırakılamadı");
    } finally {
      setUpdating(false);
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

  if (!program) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Program" }} />
        <Text style={styles.emptyText}>Program bulunamadı.</Text>
      </View>
    );
  }

  const days = Object.keys(program.daysMap)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: program.name }} />

      <Text style={styles.title}>{program.name}</Text>
      {program.level && <Text style={styles.levelBadge}>{LEVEL_LABELS[program.level] ?? program.level}</Text>}
      {program.description && <Text style={styles.description}>{program.description}</Text>}

      <TouchableOpacity
        style={[styles.followButton, isActive && styles.followButtonActive]}
        activeOpacity={0.85}
        disabled={updating}
        onPress={isActive ? handleUnfollow : handleFollow}
      >
        {updating ? (
          <ActivityIndicator size="small" color={isActive ? COLORS.graphite : COLORS.white} />
        ) : (
          <Text style={[styles.followButtonText, isActive && styles.followButtonTextActive]}>
            {isActive ? "✓ Takip Ediliyor · Bırak" : "Bu Programı Takip Et"}
          </Text>
        )}
      </TouchableOpacity>

      {days.map((day) => (
        <View key={day} style={styles.dayCard}>
          <Text style={styles.dayTitle}>{DAY_NAMES[day]}</Text>
          {program.daysMap[day].map((pm) => (
            <View key={pm.id} style={styles.movementRow}>
              <Text style={styles.movementName}>{pm.movementName}</Text>
              <Text style={styles.movementTarget}>{formatProgramTarget(pm)}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  content: { padding: 22, paddingBottom: 50 },
  emptyText: { fontFamily: "Inter_400Regular", color: COLORS.graphite },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.ink },
  levelBadge: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.graphite, marginTop: 4 },
  description: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.ink, marginTop: 10, lineHeight: 20 },
  followButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
    marginBottom: 24,
  },
  followButtonActive: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  followButtonText: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.white },
  followButtonTextActive: { color: COLORS.graphite },
  dayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dayTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  movementRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  movementName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink, flex: 1, marginRight: 8 },
  movementTarget: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
});
