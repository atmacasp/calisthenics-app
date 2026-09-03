import { View, Text, SectionList, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { router, Stack } from "expo-router";
import { movementsService } from "../../src/services/movements.service";
import { useWorkoutStore } from "../../src/store/workoutStore";

export default function PickMovementScreen() {
  const [sections, setSections] = useState<any[]>([]);
  const addMovement = useWorkoutStore((s) => s.addMovement);

  useEffect(() => {
    movementsService.getAllMovementsFlat().then((movements) => {
      const grouped: Record<string, any[]> = {};
      movements.forEach((m: any) => {
        const groupName = m.movement_groups?.name ?? "Diğer";
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(m);
      });
      setSections(Object.entries(grouped).map(([title, data]) => ({ title, data })));
    });
  }, []);

  const handleSelect = (movement: any) => {
    addMovement({ id: movement.id, name: movement.name });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Hareket Seç" }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
            <Text style={styles.rowText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#22c55e", marginTop: 16, marginBottom: 8 },
  row: { backgroundColor: "#f3f4f6", padding: 14, borderRadius: 8, marginBottom: 8 },
  rowText: { fontSize: 16 },
});
