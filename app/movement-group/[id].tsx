import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
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
        <ActivityIndicator color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: name ?? "Progression" }} />
      <FlatList
        data={movements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item, index }) => {
          const unlocked = areAllPrerequisitesMet(item.prerequisites ?? [], setLogMap);
          return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/movement/${item.id}`)}>
              <View style={[styles.stepCircle, !unlocked && styles.stepCircleLocked]}>
                {unlocked ? (
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                ) : (
                  <Feather name="lock" size={14} color="white" />
                )}
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowDifficulty}>Zorluk: {item.difficulty_level}/10</Text>
              </View>
              {!unlocked && <Text style={styles.lockedHint}>Ön koşul gerekiyor</Text>}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.connector} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", padding: 16, borderRadius: 12 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center", marginRight: 12 },
  stepCircleLocked: { backgroundColor: "#9ca3af" },
  stepNumber: { color: "white", fontWeight: "700" },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowDifficulty: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  lockedHint: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" },
  connector: { width: 2, height: 16, backgroundColor: "#d1d5db", marginLeft: 31 },
});
