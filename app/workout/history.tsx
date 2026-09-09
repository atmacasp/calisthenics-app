import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { workoutsService } from "../../src/services/workouts.service";
import type { WorkoutSessionSummary } from "../../src/types/workouts";
import { COLORS } from "../../src/constants/theme";

const MAX_VISIBLE_MOVEMENTS = 2;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return null;
  const minutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

/** "Şınav · Tuck L-Sit +2" - antrenmanı ayırt eden asıl satır. */
function formatMovements(names: string[]) {
  if (names.length === 0) return "Set kaydı yok";
  const visible = names.slice(0, MAX_VISIBLE_MOVEMENTS).join(" · ");
  const rest = names.length - MAX_VISIBLE_MOVEMENTS;
  return rest > 0 ? `${visible} +${rest}` : visible;
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
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {formatMovements(item.movementNames)}
                  </Text>

                  <Text style={styles.cardDate}>
                    {formatDate(item.startedAt)} · {formatTime(item.startedAt)}
                  </Text>

                  <View style={styles.metaRow}>
                    {duration && <Text style={styles.metaText}>{duration}</Text>}
                    <Text style={styles.metaText}>
                      {item.movementCount} hareket · {item.setCount} set
                    </Text>
                  </View>

                  {item.programName && (
                    <View style={styles.programChip}>
                      <Feather name="calendar" size={11} color={COLORS.accent} />
                      <Text style={styles.programChipText} numberOfLines={1}>
                        {item.programName}
                      </Text>
                    </View>
                  )}

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
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.ink },
  cardDate: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite, marginTop: 3 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
  programChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
    maxWidth: "100%",
  },
  programChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.accent, flexShrink: 1 },
  notePreview: {
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    fontSize: 12,
    color: COLORS.graphite,
    marginTop: 6,
  },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", color: COLORS.graphite, textAlign: "center" },
});
