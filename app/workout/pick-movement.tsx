
import { View, Text, SectionList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { router, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { useWorkoutStore } from "../../src/store/workoutStore";
import type { MovementFlatItem } from "../../src/types/movements";
import { COLORS } from "../../src/constants/theme";

interface Section {
  title: string;
  data: MovementFlatItem[];
}

function normalize(text: string) {
  return text.toLocaleLowerCase("tr-TR").trim();
}

// Tek harfle arama neredeyse her hareket adında bir eşleşme bulup listeyi
// anlamsızca kalabalıklaştırıyordu (ör. "p" -> Pike, Pozisyonu, Kick-up...).
// En az 2 karakter yazılana kadar filtre uygulanmaz, tüm liste gösterilir.
const MIN_QUERY_LENGTH = 2;

export default function PickMovementScreen() {
  const [movements, setMovements] = useState<MovementFlatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const addMovement = useWorkoutStore((s) => s.addMovement);

  useEffect(() => {
    movementsService
      .getAllMovementsFlat()
      .then(setMovements)
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo<Section[]>(() => {
    const q = normalize(query);
    const filtered = q.length >= MIN_QUERY_LENGTH ? movements.filter((m) => normalize(m.name).includes(q)) : movements;

    const grouped: Record<string, MovementFlatItem[]> = {};
    filtered.forEach((m) => {
      const groupName = m.movement_groups?.name ?? "Diğer";
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(m);
    });
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [movements, query]);

  const handleSelect = (movement: MovementFlatItem) => {
    addMovement({ id: movement.id, name: movement.name });
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Hareket Seç" }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Hareket Seç" }} />

      <View style={styles.headerContainer}>
        <Text style={styles.headerSubtitle}>Antrenmana eklemek istediğin hareketi seç</Text>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={COLORS.graphite} />
          <TextInput
            style={styles.searchInput}
            placeholder="Hareket ara..."
            placeholderTextColor={COLORS.graphite}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x-circle" size={18} color={COLORS.graphite} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => handleSelect(item)}>
            <View style={styles.rowAccent} />
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.difficulty_level != null && (
                <Text style={styles.rowDifficulty}>Zorluk: {item.difficulty_level}/10</Text>
              )}
            </View>
            <Feather name="plus-circle" size={22} color={COLORS.accent} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {normalize(query).length >= MIN_QUERY_LENGTH
              ? `"${query}" için sonuç bulunamadı`
              : "Hareket bulunamadı"}
          </Text>
        }
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
    paddingBottom: 12,
    backgroundColor: COLORS.paper,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.ink,
    height: "100%",
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  sectionHeaderWrap: {
    backgroundColor: COLORS.paper,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rowAccent: {
    width: 4,
    height: 24,
    backgroundColor: COLORS.accent,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginRight: 14,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: COLORS.ink,
  },
  rowDifficulty: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.graphite,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.graphite,
    fontFamily: "Inter_400Regular",
    marginTop: 40,
  },
});
