import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import { areAllPrerequisitesMet, isTargetMet } from "../../src/utils/targetProgress";
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../src/types/movements";
import { COLORS } from "../../src/constants/theme";

interface GroupProgress {
  completed: number;
  total: number;
  /** Sıradaki basamak - zincirdeki hedefi henüz karşılanmamış ilk hareket */
  nextName: string | null;
  nextLocked: boolean;
}

export default function LibraryScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [groups, setGroups] = useState<any[]>([]);
  const [movements, setMovements] = useState<MovementWithGroupAndPrerequisites[]>([]);
  const [setLogMap, setSetLogMap] = useState<MovementSetLogMap>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    Promise.all([
      movementsService.getGroups(),
      movementsService.getAllMovementsWithPrerequisites(),
      userId ? progressService.getMovementSetLogs(userId) : Promise.resolve({} as MovementSetLogMap),
    ])
      .then(([g, m, logs]) => {
        setGroups(g);
        setMovements(m);
        setSetLogMap(logs);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Sekmeye her dönüşte tazelenir: antrenman sonrası ilerleme burada da güncel kalsın.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const progressByGroup = useMemo(() => {
    const map: Record<string, GroupProgress> = {};
    groups.forEach((g) => {
      const chain = movements.filter((m) => m.group_id === g.id);
      const next = chain.find((m) => !isTargetMet(m, setLogMap[m.id]));
      map[g.id] = {
        completed: chain.filter((m) => isTargetMet(m, setLogMap[m.id])).length,
        total: chain.length,
        nextName: next?.name ?? null,
        nextLocked: next ? !areAllPrerequisitesMet(next.prerequisites ?? [], setLogMap) : false,
      };
    });
    return map;
  }, [groups, movements, setLogMap]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Hareket Kütüphanesi</Text>
        <Text style={styles.headerSubtitle}>Her kategoride nerede olduğunu gör, sıradaki basamağa geç</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const p = progressByGroup[item.id] ?? { completed: 0, total: 0, nextName: null, nextLocked: false };
          const ratio = p.total > 0 ? p.completed / p.total : 0;
          const finished = p.total > 0 && p.completed === p.total;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/movement-group/${item.id}?name=${encodeURIComponent(item.name)}`)}
            >
              <View style={styles.cardAccent} />

              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {finished && <Feather name="award" size={16} color={COLORS.accent} />}
                </View>

                <Text style={[styles.nextText, finished && styles.nextTextDone]} numberOfLines={1}>
                  {finished
                    ? "Tüm basamaklar tamamlandı"
                    : p.nextName
                    ? `${p.nextLocked ? "Kilitli" : "Sırada"}: ${p.nextName}`
                    : "Bu kategoride hareket yok"}
                </Text>

                {p.total > 0 && (
                  <>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
                    </View>
                    <Text style={styles.countText}>
                      {p.completed} / {p.total} basamak
                    </Text>
                  </>
                )}
              </View>

              <Feather name="chevron-right" size={20} color={COLORS.graphite} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  headerContainer: {
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: COLORS.ink,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 90, // Tab bar arkasında kalmaması için geniş alt alan
    paddingTop: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 14,
    paddingVertical: 16,
    paddingRight: 16,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    height: 40,
    backgroundColor: COLORS.accent,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginRight: 16,
  },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: COLORS.ink,
  },
  nextText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.graphite,
    marginTop: 3,
  },
  nextTextDone: { fontFamily: "Inter_600SemiBold", color: COLORS.accent },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.line,
    overflow: "hidden",
    marginTop: 10,
  },
  barFill: { height: 5, borderRadius: 3, backgroundColor: COLORS.accent },
  countText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: COLORS.graphite,
    marginTop: 5,
  },
});
