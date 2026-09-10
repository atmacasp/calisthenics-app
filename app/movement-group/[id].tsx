import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { StepCard } from "../../src/components/StepCard";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import { themedStyles, useColors, type ThemeColors } from "../../src/constants/theme";
import type { MovementListItem, MovementSetLogMap } from "../../src/types/movements";
import { areAllPrerequisitesMet, computeTargetProgress } from "../../src/utils/targetProgress";
import { resolveStepStates } from "../../src/utils/progressionSteps";

export default function MovementGroupScreen() {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const { id, name, slug } = useLocalSearchParams<{ id: string; name: string; slug?: string }>();
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

  /**
   * Zincirin tamamı tek seferde çözülüyor: her basamağın ilerlemesi, kilidi ve
   * görsel durumu. "Sıradaki" basamağı bulmak listenin bütününü görmeyi
   * gerektirdiği için bu iş renderItem'a bırakılmıyor.
   */
  const steps = useMemo(() => {
    const rows = movements.map((m) => {
      const progress = computeTargetProgress(m, setLogMap[m.id]);
      return {
        movement: m,
        progress,
        done: progress?.met ?? false,
        unlocked: areAllPrerequisitesMet(m.prerequisites ?? [], setLogMap),
      };
    });
    const states = resolveStepStates(rows);
    return rows.map((row, i) => ({ ...row, state: states[i] }));
  }, [movements, setLogMap]);

  const completedCount = steps.filter((s) => s.done).length;
  const ratio = steps.length > 0 ? completedCount / steps.length : 0;

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

      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Basamakları sırayla tamamlayarak ilerle</Text>
        {steps.length > 0 && (
          <>
            <View style={styles.headerBarTrack}>
              <View style={[styles.headerBarFill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
            <Text style={styles.headerCount}>
              {completedCount} / {steps.length} basamak tamamlandı
            </Text>
          </>
        )}
      </View>

      <FlatList
        data={steps}
        keyExtractor={(item) => item.movement.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const { movement, progress, state } = item;
          const isLast = index === steps.length - 1;

          // Çubuk yalnızca üzerinde çalışılan basamakta: kilitli ya da bitmiş
          // basamakta boş/dolu bir çubuk sadece gürültü olurdu.
          const showBar = (state === "current" || state === "todo") && !!progress;

          return (
            <View>
              <StepCard
                index={index}
                name={movement.name}
                imageUrl={movement.image_url}
                groupSlug={slug}
                state={state}
                meta={
                  state === "done"
                    ? "Tamamlandı"
                    : state === "locked"
                    ? "Ön koşul gerekiyor"
                    : progress?.label ?? `Zorluk: ${movement.difficulty_level}/10`
                }
                detail={progress?.detail}
                ratio={showBar ? progress!.ratio : null}
                onPress={() => router.push(`/movement/${movement.id}`)}
              />
              {!isLast && <View style={[styles.connector, state === "done" && styles.connectorDone]} />}
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
    header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
    headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.graphite },
    headerBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: COLORS.line,
      overflow: "hidden",
      marginTop: 12,
    },
    headerBarFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
    headerCount: {
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      color: COLORS.accent,
      marginTop: 8,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 44 },
    // Kartların arasındaki dikey bağ: rozetin merkeziyle hizalı (14 + 30/2).
    connector: { width: 2, height: 12, backgroundColor: COLORS.line, marginLeft: 29 },
    connectorDone: { backgroundColor: COLORS.accent },
  })
);
