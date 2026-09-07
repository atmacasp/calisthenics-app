
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { programsService } from "../../src/services/programs.service";
import type { ProgramRow, UserProgramRow } from "../../src/types/programs";
import { COLORS } from "../../src/constants/theme";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Başlangıç",
  intermediate: "Orta Seviye",
  advanced: "İleri Seviye",
};

export default function ProgramsListScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [activeProgram, setActiveProgram] = useState<UserProgramRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, active] = await Promise.all([
        programsService.listPrograms(),
        userId ? programsService.getActiveUserProgram(userId) : Promise.resolve(null),
      ]);
      setPrograms(list);
      setActiveProgram(active);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Programlar" }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.subtitle}>Haftalık bir plan seç, hangi gün ne çalışacağını takip et.</Text>
          }
          renderItem={({ item }) => {
            const isActive = activeProgram?.program_id === item.id;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/programs/${item.id}`)}
              >
                <View style={[styles.cardAccent, { backgroundColor: isActive ? COLORS.accent : COLORS.line }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.metaRow}>
                    {item.level && <Text style={styles.levelBadge}>{LEVEL_LABELS[item.level] ?? item.level}</Text>}
                    {isActive && <Text style={styles.activeBadge}>✓ Takip ediliyor</Text>}
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.graphite} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="calendar" size={28} color={COLORS.line} />
              <Text style={styles.emptyText}>Henüz bir program eklenmedi.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 22, paddingBottom: 40 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.graphite, marginBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    height: 36,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink },
  cardDescription: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite, marginTop: 3 },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  levelBadge: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.graphite },
  activeBadge: { fontFamily: "Inter_700Bold", fontSize: 12, color: COLORS.accent },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", color: COLORS.graphite, textAlign: "center" },
});
