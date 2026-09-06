
import { View, Text, SectionList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { movementsService } from "../../src/services/movements.service";
import { progressService } from "../../src/services/progress.service";
import { useAuthStore } from "../../src/store/authStore";
import { useWorkoutStore } from "../../src/store/workoutStore";
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../src/types/movements";
import { areAllPrerequisitesMet } from "../../src/utils/targetProgress";
import { COLORS } from "../../src/constants/theme";

interface Section {
  title: string;
  data: MovementWithGroupAndPrerequisites[];
}

function normalize(text: string) {
  return text.toLocaleLowerCase("tr-TR").trim();
}

// Tek harfle arama neredeyse her hareket adında bir eşleşme bulup listeyi
// anlamsızca kalabalıklaştırıyordu (ör. "p" -> Pike, Pozisyonu, Kick-up...).
// En az 2 karakter yazılana kadar filtre uygulanmaz, tüm liste gösterilir.
const MIN_QUERY_LENGTH = 2;

export default function PickMovementScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [movements, setMovements] = useState<MovementWithGroupAndPrerequisites[]>([]);
  const [setLogMap, setSetLogMap] = useState<MovementSetLogMap>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const addMovement = useWorkoutStore((s) => s.addMovement);
  const sessionMovements = useWorkoutStore((s) => s.sessionMovements);
  const addedIds = useMemo(() => new Set(sessionMovements.map((m) => m.movementId)), [sessionMovements]);

  const loadData = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([movementsService.getAllMovementsWithPrerequisites(), progressService.getMovementSetLogs(userId)])
      .then(([m, logs]) => {
        setMovements(m);
        setSetLogMap(logs);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Bir önceki antrenmanda bir hedef yeni karşılanmış olabilir - ekrana her
  // dönüşte kilit durumları güncel kalsın diye yeniden çekiliyor.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // movements zaten servis katmanında (kategori order_index -> basamak order_index)
  // sırayla geliyor; burada sadece arama filtresi uygulanıp kategoriye göre gruplanıyor.
  const sections = useMemo<Section[]>(() => {
    const q = normalize(query);
    const filtered = q.length >= MIN_QUERY_LENGTH ? movements.filter((m) => normalize(m.name).includes(q)) : movements;

    const grouped: Record<string, MovementWithGroupAndPrerequisites[]> = {};
    filtered.forEach((m) => {
      const groupName = m.movement_groups?.name ?? "Diğer";
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(m);
    });
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [movements, query]);

  const handleSelect = (movement: MovementWithGroupAndPrerequisites, unlocked: boolean, alreadyAdded: boolean) => {
    if (!unlocked) {
      router.push(`/movement/${movement.id}`);
      return;
    }
    if (!alreadyAdded) {
      addMovement({
        id: movement.id,
        name: movement.name,
        groupName: movement.movement_groups?.name,
        targetType: movement.target_type,
        targetSets: movement.target_sets,
        targetReps: movement.target_reps,
        targetDurationSeconds: movement.target_duration_seconds,
      });
    }
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
        renderItem={({ item }) => {
          const unlocked = areAllPrerequisitesMet(item.prerequisites ?? [], setLogMap);
          const alreadyAdded = addedIds.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.row, !unlocked && styles.rowLocked]}
              activeOpacity={0.7}
              onPress={() => handleSelect(item, unlocked, alreadyAdded)}
            >
              <View style={[styles.rowAccent, { backgroundColor: unlocked ? COLORS.accent : COLORS.line }]} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={[styles.rowDifficulty, alreadyAdded && styles.rowAddedText]}>
                  {!unlocked
                    ? "Ön koşul gerekiyor"
                    : alreadyAdded
                    ? "✓ Antrenmana eklendi"
                    : `Zorluk: ${item.difficulty_level}/10`}
                </Text>
              </View>
              <Feather
                name={!unlocked ? "lock" : alreadyAdded ? "check-circle" : "plus-circle"}
                size={!unlocked ? 18 : 22}
                color={!unlocked ? COLORS.graphite : COLORS.accent}
              />
            </TouchableOpacity>
          );
        }}
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
  rowLocked: { opacity: 0.6 },
  rowAccent: {
    width: 4,
    height: 24,
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
  rowAddedText: {
    color: COLORS.accent,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.graphite,
    fontFamily: "Inter_400Regular",
    marginTop: 40,
  },
});
