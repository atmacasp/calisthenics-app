import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GroupCard } from "../../src/components/GroupCard";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import { areAllPrerequisitesMet, isTargetMet } from "../../src/utils/targetProgress";
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../src/types/movements";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../src/constants/theme";

interface GroupProgress {
  completed: number;
  total: number;
  /** Sıradaki basamak - zincirdeki hedefi henüz karşılanmamış ilk hareket */
  nextName: string | null;
  nextLocked: boolean;
}

export default function LibraryScreen() {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
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
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="arm-flex" size={22} color={COLORS.accent} />
          <Text style={styles.headerTitle}>Hareket Kütüphanesi</Text>
        </View>
        <Text style={styles.headerSubtitle}>Her kategoride nerede olduğunu gör, sıradaki basamağa geç</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const p = progressByGroup[item.id] ?? { completed: 0, total: 0, nextName: null, nextLocked: false };

          return (
            <GroupCard
              name={item.name}
              slug={item.slug}
              imageUrl={item.image_url}
              completed={p.completed}
              total={p.total}
              nextName={p.nextName}
              nextLocked={p.nextLocked}
              onPress={() => router.push(`/movement-group/${item.id}?name=${encodeURIComponent(item.name)}`)}
            />
          );
        }}
      />
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  headerContainer: {
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: COLORS.ink,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 90, // Tab bar arkasında kalmaması için geniş alt alan
    paddingTop: 8,
  },
  row: { gap: 12, marginBottom: 12 },
  })
);
