import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../src/constants/theme";
import type { MovementListItem, MovementSetLogMap } from "../../src/types/movements";
import { areAllPrerequisitesMet, computeTargetProgress } from "../../src/utils/targetProgress";

export default function MovementGroupScreen() {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [movements, setMovements] = useState<MovementListItem[]>([]);
  const [setLogMap, setSetLogMap] = useState<MovementSetLogMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      movementsService.getMovementsByGroup(id),
      userId ? progressService.getMovementSetLogs(userId) : Promise.resolve({} as MovementSetLogMap),
    ])
      .then(([m, logs]) => {
        setMovements(m);
        setSetLogMap(logs);
      })
      .finally(() => setLoading(false));
  }, [id, userId]);

  const completedCount = useMemo(
    () => movements.filter((m) => computeTargetProgress(m, setLogMap[m.id])?.met).length,
    [movements, setLogMap]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: name ?? "Progression" }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: name ?? "Progression" }} />
      <View style={styles.headerContainer}>
        <Text style={styles.headerSubtitle}>Basamakları sırayla tamamlayarak ilerle</Text>
        {movements.length > 0 && (
          <Text style={styles.headerCount}>
            {completedCount} / {movements.length} basamak tamamlandı
          </Text>
        )}
      </View>
      <FlatList
        data={movements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const unlocked = areAllPrerequisitesMet(item.prerequisites ?? [], setLogMap);
          const progress = computeTargetProgress(item, setLogMap[item.id]);
          const done = progress?.met ?? false;
          const isLast = index === movements.length - 1;

          // Kilitli basamakta ilerleme çubuğu göstermiyoruz: henüz o basamağa
          // çalışılmıyor, boş bir çubuk sadece gürültü olurdu.
          const showBar = unlocked && !done && !!progress;

          return (
            <View>
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => router.push(`/movement/${item.id}`)}
              >
                <View
                  style={[
                    styles.stepCircle,
                    !unlocked && styles.stepCircleLocked,
                    done && styles.stepCircleDone,
                  ]}
                >
                  {done ? (
                    <Feather name="check" size={16} color={COLORS.onAccent} />
                  ) : unlocked ? (
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  ) : (
                    <Feather name="lock" size={14} color={COLORS.onAccent} />
                  )}
                </View>

                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={[styles.rowMeta, done && styles.rowMetaDone]}>
                    {done
                      ? "Tamamlandı"
                      : !unlocked
                      ? "Ön koşul gerekiyor"
                      : progress?.label ?? `Zorluk: ${item.difficulty_level}/10`}
                  </Text>

                  {showBar && (
                    <>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.round(progress!.ratio * 100)}%` }]} />
                      </View>
                      {progress!.detail && <Text style={styles.barDetail}>{progress!.detail}</Text>}
                    </>
                  )}
                </View>

                <Feather name="chevron-right" size={20} color={COLORS.graphite} />
              </TouchableOpacity>
              {!isLast && <View style={[styles.connector, done && styles.connectorDone]} />}
            </View>
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
  },
  headerCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.accent,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  stepCircleLocked: { backgroundColor: COLORS.graphite },
  stepCircleDone: { backgroundColor: COLORS.inverse },
  stepNumber: { color: COLORS.onAccent, fontFamily: "Inter_700Bold", fontSize: 14 },
  rowContent: { flex: 1 },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: COLORS.ink },
  rowMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2 },
  rowMetaDone: { fontFamily: "Inter_600SemiBold", color: COLORS.accent },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.line,
    overflow: "hidden",
    marginTop: 8,
    marginRight: 8,
  },
  barFill: { height: 5, borderRadius: 3, backgroundColor: COLORS.accent },
  barDetail: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 4 },
  connector: { width: 2, height: 14, backgroundColor: COLORS.line, marginLeft: 32 },
  connectorDone: { backgroundColor: COLORS.accent },
  })
);
