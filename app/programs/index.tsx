import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
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

  // programs.user_id null -> hazır program, dolu -> kullanıcının kendi programı
  const sections = useMemo(() => {
    const mine = programs.filter((p) => p.user_id === userId);
    const system = programs.filter((p) => !p.user_id);
    const result: { title: string; emptyText: string; data: ProgramRow[] }[] = [];
    result.push({ title: "Benim Programlarım", emptyText: "Henüz kendi programını oluşturmadın.", data: mine });
    result.push({ title: "Hazır Programlar", emptyText: "Hazır program bulunamadı.", data: system });
    return result;
  }, [programs, userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Programlar" }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Programlar" }} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            <Text style={styles.subtitle}>
              Haftalık bir plan seç ya da kendi programını kur; hangi gün ne çalışacağını takip et.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push("/programs/builder")}
              activeOpacity={0.85}
            >
              <View style={styles.createIconCircle}>
                <Ionicons name="add" size={20} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createTitle}>Kendi Programını Oluştur</Text>
                <Text style={styles.createSubtitle}>Günleri ve hedefleri sen belirle</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </>
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? <Text style={styles.sectionEmpty}>{section.emptyText}</Text> : null
        }
        renderItem={({ item }) => {
          const isActive = activeProgram?.program_id === item.id;
          const isMine = item.user_id === userId;
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => router.push(`/programs/${item.id}`)}>
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
                  {isMine && <Text style={styles.mineBadge}>Senin programın</Text>}
                  {isActive && <Text style={styles.activeBadge}>✓ Takip ediliyor</Text>}
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={COLORS.graphite} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  listContent: { padding: 22, paddingBottom: 40 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.graphite, marginBottom: 16 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.ink,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  createIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  createTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.paper },
  createSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(250,249,246,0.6)", marginTop: 2 },
  sectionHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.graphite,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionEmpty: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
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
  cardAccent: { width: 4, height: 36, borderTopRightRadius: 4, borderBottomRightRadius: 4, marginRight: 14 },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink },
  cardDescription: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite, marginTop: 3 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  levelBadge: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.graphite },
  mineBadge: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.ink },
  activeBadge: { fontFamily: "Inter_700Bold", fontSize: 12, color: COLORS.accent },
});
