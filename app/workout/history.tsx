
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { workoutsService } from "../../src/services/workouts.service";
import type { WorkoutSessionSummary } from "../../src/types/workouts";
import { COLORS } from "../../src/constants/theme";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return null;
  const minutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export default function WorkoutHistoryScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    workoutsService
      .listSessions(userId)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Geçmiş Antrenmanlar" }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const duration = formatDuration(item.startedAt, item.endedAt);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/workout/history/${item.id}`)}
              >
                <View style={styles.cardAccent} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardDate}>{formatDate(item.startedAt)}</Text>
                  <View style={styles.metaRow}>
                    {duration && <Text style={styles.metaText}>{duration}</Text>}
                    <Text style={styles.metaText}>
                      {item.movementCount} hareket · {item.setCount} set
                    </Text>
                  </View>
                  {item.notes ? (
                    <Text style={styles.notePreview} numberOfLines={1}>
                      "{item.notes}"
                    </Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.graphite} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="clock" size={28} color={COLORS.line} />
              <Text style={styles.emptyText}>Henüz tamamlanmış bir antrenmanın yok.</Text>
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
    height: 32,
    backgroundColor: COLORS.accent,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardDate: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.ink },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
  notePreview: {
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    fontSize: 12,
    color: COLORS.graphite,
    marginTop: 4,
  },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", color: COLORS.graphite, textAlign: "center" },
});
