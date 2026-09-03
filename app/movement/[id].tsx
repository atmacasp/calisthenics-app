import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { movementsService } from "../../src/services/movements.service";

export default function MovementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movement, setMovement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      movementsService.getMovementById(id).then(setMovement).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (!movement) {
    return (
      <View style={styles.center}>
        <Text>Hareket bulunamadı.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: movement.name }} />
      <View style={styles.imagePlaceholder}>
        {movement.gif_url ? (
          <Image source={{ uri: movement.gif_url }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>Görsel/GIF yakında eklenecek</Text>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.category}>{movement.movement_groups?.name}</Text>
        <Text style={styles.title}>{movement.name}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>Zorluk: {movement.difficulty_level}/10</Text>
        </View>
        <Text style={styles.description}>{movement.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  imagePlaceholder: { height: 220, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  placeholderText: { color: "#9ca3af" },
  content: { padding: 20 },
  category: { color: "#22c55e", fontWeight: "600", marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 12 },
  difficultyBadge: { alignSelf: "flex-start", backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  difficultyText: { fontWeight: "600", color: "#374151" },
  description: { fontSize: 16, lineHeight: 24, color: "#374151" },
});
