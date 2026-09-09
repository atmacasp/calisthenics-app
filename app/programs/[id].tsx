import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useCallback, useState } from "react";
import { useLocalSearchParams, Stack, useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { programsService } from "../../src/services/programs.service";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import {
  computeProgramAdditions,
  computeProgramUpgrades,
  type ProgramAddition,
  type ProgramUpgrade,
} from "../../src/utils/programUpgrades";
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../src/types/movements";
import type { ProgramMovementWithName, ProgramWithDays, UserProgramRow } from "../../src/types/programs";
import { COLORS } from "../../src/constants/theme";

const DANGER = "#dc2626";
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
  const [movements, setMovements] = useState<MovementWithGroupAndPrerequisites[]>([]);
  const [setLogMap, setSetLogMap] = useState<MovementSetLogMap>({});
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  // Bu haftanin tamamlanan program gunleri: { gun: sessionId }
  const [weekDone, setWeekDone] = useState<Record<number, string>>({});

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [detail, active, allMovements, logs, week] = await Promise.all([
        programsService.getProgramWithDays(id),
        userId ? programsService.getActiveUserProgram(userId) : Promise.resolve(null),
        movementsService.getAllMovementsWithPrerequisites(),
        userId ? progressService.getMovementSetLogs(userId) : Promise.resolve({} as MovementSetLogMap),
        userId ? programsService.getWeekCompletionsForProgram(userId, id) : Promise.resolve({}),
      ]);
      setProgram(detail);
      setActiveProgram(active);
      setMovements(allMovements);
      setSetLogMap(logs);
      setWeekDone(week);
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
  const isMine = !!(program && userId && program.user_id === userId);

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

  const handleDuplicate = async () => {
    if (!userId || !program || updating) return;
    setUpdating(true);
    try {
      const copy = await programsService.duplicateProgram(userId, program.id);
      router.replace(`/programs/${copy.id}`);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Program kopyalanamadı");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpgrade = (upgrade: ProgramUpgrade) => {
    Alert.alert(
      "Basamağı Yükselt",
      `"${upgrade.currentName}" yerine "${upgrade.nextMovement.name}" gelecek. Gün, sıra ve dinlenme süresi aynı kalır.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Yükselt",
          onPress: async () => {
            setUpgradingId(upgrade.programMovementId);
            try {
              await programsService.upgradeProgramMovement(upgrade.programMovementId, {
                id: upgrade.nextMovement.id,
                target_sets: upgrade.nextMovement.target_sets,
                target_reps: upgrade.nextMovement.target_reps,
                target_duration_seconds: upgrade.nextMovement.target_duration_seconds,
              });
              await loadData();
            } catch (error: any) {
              Alert.alert("Hata", error.message ?? "Basamak yükseltilemedi");
            } finally {
              setUpgradingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!program || !userId) return;
    Alert.alert(
      "Programı Sil",
      `"${program.name}" kalıcı olarak silinecek. Bu programdan yaptığın antrenmanlar silinmez, sadece programla bağları kopar.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            setUpdating(true);
            try {
              await programsService.deleteProgram(program.id, userId);
              router.replace("/programs");
            } catch (error: any) {
              Alert.alert("Hata", error.message ?? "Program silinemedi");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
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

  // JS: 0=Pazar..6=Cumartesi -> semamiz: 1=Pazartesi..7=Pazar
  const jsDay = new Date().getDay();
  const todayDayOfWeek = jsDay === 0 ? 7 : jsDay;

  const days = Object.keys(program.daysMap)
    .map(Number)
    .sort((a, b) => a - b);

  // Hedefini tamamladığın hareketler için bir üst basamak önerisi. Hazır
  // programlarda da hesaplanır - orada aksiyon "kopyala", "yükselt" değil.
  const upgrades = movements.length ? computeProgramUpgrades(program.daysMap, movements, setLogMap) : [];
  const additions = movements.length ? computeProgramAdditions(program.daysMap, movements, setLogMap) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: program.name }} />

      <Text style={styles.title}>{program.name}</Text>
      <View style={styles.badgeRow}>
        {program.level && <Text style={styles.levelBadge}>{LEVEL_LABELS[program.level] ?? program.level}</Text>}
        {isMine && (
          <View style={styles.mineChip}>
            <Ionicons name="person-outline" size={11} color={COLORS.accent} />
            <Text style={styles.mineChipText}>Senin programın</Text>
          </View>
        )}
      </View>
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
            {isActive ? "Takip Ediliyor · Bırak" : "Bu Programı Takip Et"}
          </Text>
        )}
      </TouchableOpacity>

      {isMine ? (
        <View style={styles.ownerRow}>
          <TouchableOpacity
            style={styles.ownerButton}
            onPress={() => router.push(`/programs/builder?id=${program.id}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.ink} />
            <Text style={styles.ownerButtonText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ownerButton} onPress={handleDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={16} color={DANGER} />
            <Text style={[styles.ownerButtonText, { color: DANGER }]}>Sil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.ownerRow}>
          <TouchableOpacity style={styles.ownerButton} onPress={handleDuplicate} activeOpacity={0.8} disabled={updating}>
            <Ionicons name="copy-outline" size={16} color={COLORS.ink} />
            <Text style={styles.ownerButtonText}>Kopyala ve Düzenle</Text>
          </TouchableOpacity>
        </View>
      )}

      {upgrades.length > 0 && (
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeHeaderRow}>
            <Ionicons name="trending-up-outline" size={15} color={COLORS.accent} />
            <Text style={styles.upgradeTitle}>Basamak Terfisi</Text>
          </View>
          <Text style={styles.upgradeSubtitle}>
            {isMine
              ? "Bu hareketlerin hedefini tamamladın, bir üst basamağa geçebilirsin."
              : "Bu hareketlerin hedefini tamamladın. Programı kopyalarsan basamakları yükseltebilirsin."}
          </Text>

          {upgrades.map((u) => (
            <View key={u.programMovementId} style={styles.upgradeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeDay}>{DAY_NAMES[u.dayOfWeek]}</Text>
                <Text style={styles.upgradeMovement}>
                  {u.currentName} <Text style={styles.upgradeArrow}>→</Text> {u.nextMovement.name}
                </Text>
                {u.nextTargetLabel && <Text style={styles.upgradeTarget}>{u.nextTargetLabel}</Text>}
              </View>
              {isMine &&
                (upgradingId === u.programMovementId ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    activeOpacity={0.8}
                    disabled={!!upgradingId}
                    onPress={() => handleUpgrade(u)}
                  >
                    <Text style={styles.upgradeButtonText}>Yükselt</Text>
                  </TouchableOpacity>
                ))}
            </View>
          ))}
        </View>
      )}

      {days.length === 0 ? (
        <Text style={styles.emptyText}>Bu programda henüz hareket yok.</Text>
      ) : (
        days.map((day) => (
          <View key={day} style={[styles.dayCard, isActive && weekDone[day] ? styles.dayCardDone : null]}>
            <View style={styles.dayHeaderRow}>
              <Text style={styles.dayTitle}>{DAY_NAMES[day]}</Text>
              {isActive && weekDone[day] ? (
                <TouchableOpacity
                  style={styles.dayDoneChip}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/workout/history/${weekDone[day]}`)}
                >
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.accent} />
                  <Text style={styles.dayDoneChipText}>Tamamlandı</Text>
                </TouchableOpacity>
              ) : isActive && day === todayDayOfWeek ? (
                <Text style={styles.dayTodayChip}>Bugün</Text>
              ) : null}
            </View>
            {program.daysMap[day].map((pm) => (
              <View key={pm.id} style={styles.movementRow}>
                <Text style={styles.movementName}>{pm.movementName}</Text>
                <Text style={styles.movementTarget}>{formatProgramTarget(pm)}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  content: { padding: 22, paddingBottom: 50 },
  emptyText: { fontFamily: "Inter_400Regular", color: COLORS.graphite },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.ink },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  levelBadge: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.graphite },
  mineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mineChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.accent },
  description: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.ink, marginTop: 10, lineHeight: 20 },
  followButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  followButtonActive: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  followButtonText: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.white },
  followButtonTextActive: { color: COLORS.graphite },
  ownerRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  ownerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  ownerButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink },
  upgradeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  upgradeHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  upgradeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  upgradeSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.graphite,
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 19,
  },
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    marginTop: 10,
  },
  upgradeDay: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: COLORS.graphite,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  upgradeMovement: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink, marginTop: 2 },
  upgradeArrow: { color: COLORS.accent },
  upgradeTarget: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2 },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  upgradeButtonText: { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.white },
  dayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  dayTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayCardDone: { borderWidth: 1, borderColor: "rgba(34,197,94,0.35)" },
  dayDoneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dayDoneChipText: { fontFamily: "Inter_700Bold", fontSize: 11, color: COLORS.accent },
  dayTodayChip: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: COLORS.graphite,
    backgroundColor: COLORS.paper,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  movementRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  movementName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink, flex: 1, marginRight: 8 },
  movementTarget: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
});
