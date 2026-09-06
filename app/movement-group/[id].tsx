
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import { COLORS } from "../../src/constants/theme";
import type { MovementListItem, MovementSetLogMap } from "../../src/types/movements";
import { areAllPrerequisitesMet } from "../../src/utils/targetProgress";

export default function MovementGroupScreen() {
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
      </View>
      <FlatList
        data={movements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const unlocked = areAllPrerequisitesMet(item.prerequisites ?? [], setLogMap);
          const isLast = index === movements.length - 1;
          return (
            <View>
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => router.push(`/movement/${item.id}`)}
              >
                <View style={[styles.stepCircle, !unlocked && styles.stepCircleLocked]}>
                  {unlocked ? (
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  ) : (
                    <Feather name="lock" size={14} color={COLORS.white} />
                  )}
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowDifficulty}>
                    {unlocked ? `Zorluk: ${item.difficulty_level}/10` : "Ön koşul gerekiyor"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.graphite} />
              </TouchableOpacity>
              {!isLast && <View style={styles.connector} />}
            </View>
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: COLORS.ink,
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
  stepNumber: { color: COLORS.white, fontFamily: "Inter_700Bold", fontSize: 14 },
  rowContent: { flex: 1 },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: COLORS.ink },
  rowDifficulty: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2 },
  connector: { width: 2, height: 14, backgroundColor: COLORS.line, marginLeft: 32 },
});
