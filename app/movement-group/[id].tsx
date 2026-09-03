import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { movementsService } from "../../src/services/movements.service";

export default function MovementGroupScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      movementsService.getMovementsByGroup(id).then(setMovements).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Yükleniyor...</Text>
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
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/movement/${item.id}`)}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowDifficulty}>Zorluk: {item.difficulty_level}/10</Text>
            </View>
          </TouchableOpacity>
        )}
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
  stepNumber: { color: "white", fontWeight: "700" },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowDifficulty: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  connector: { width: 2, height: 16, backgroundColor: "#d1d5db", marginLeft: 31 },
});
