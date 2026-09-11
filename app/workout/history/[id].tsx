
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useCallback, useState } from "react";
import { router, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { workoutsService } from "../../../src/services/workouts.service";
import { useSetRemoval } from "../../../src/hooks/useSetRemoval";
import type { WorkoutSessionDetail } from "../../../src/types/workouts";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../../src/constants/theme";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return null;
  const minutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} dakika`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} sa ${rest} dk` : `${hours} saat`;
}

export default function WorkoutHistoryDetailScreen() {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  /**
   * Geçmişteki yanlış bir seti silmek. Set kaydı rekorlara, hedef ilerlemesine
   * ve kilit durumuna girdiği için düzeltmenin tek yolu kaydı kaldırmak.
   * Aktif antrenman ekranıyla aynı hook: onay metni ve hata davranışı tek yerde.
   */
  const { confirmRemoveSet } = useSetRemoval();

  const loadData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    workoutsService
      .getSessionDetail(id)
      .then((detail) => {
        setSession(detail);
        setNotes(detail?.notes ?? "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const notesChanged = session !== null && notes.trim() !== (session.notes ?? "");

  const saveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    try {
      await workoutsService.updateSessionNotes(id, notes.trim());
      setSession((prev) => (prev ? { ...prev, notes: notes.trim() } : prev));
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Not kaydedilemedi");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert("Antrenmanı Sil", "Bu antrenmanı ve içindeki tüm setleri kalıcı olarak silmek istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await workoutsService.deleteSession(id);
            router.back();
          } catch (error: any) {
            Alert.alert("Hata", error.message ?? "Antrenman silinemedi");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Antrenman" }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Antrenman" }} />
        <Text style={styles.emptyText}>Antrenman bulunamadı.</Text>
      </View>
    );
  }

  const duration = formatDuration(session.startedAt, session.endedAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: formatDate(session.startedAt) }} />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateText}>{formatDate(session.startedAt)}</Text>
          <Text style={styles.durationText}>
            {formatTime(session.startedAt)}
            {duration ? ` · ${duration}` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} hitSlop={10}>
          <Feather name="trash-2" size={20} color={COLORS.graphite} />
        </TouchableOpacity>
      </View>

      {session.movements.map((m) => (
        <View key={m.movementId} style={styles.card}>
          <Text style={styles.cardTitle}>{m.movementName}</Text>
          {m.groupName && <Text style={styles.cardCategory}>{m.groupName}</Text>}
          {m.sets.map((s) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={styles.setLine}>
              Set {s.setNumber}: {s.reps ? `${s.reps} tekrar` : ""} {s.durationSeconds ? `${s.durationSeconds} sn` : ""} {s.addedWeightKg ? `+${s.addedWeightKg}kg` : ""}
              </Text>
              <TouchableOpacity onPress={() => confirmRemoveSet({ setId: s.id, setNumber: s.setNumber, onRemoved: loadData })} hitSlop={8}>
                <Feather name="x" size={14} color={COLORS.graphite} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.notesLabel}>Antrenman Notu</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Bu antrenmanla ilgili bir not ekle..."
        placeholderTextColor={COLORS.graphite}
        multiline
        value={notes}
        onChangeText={setNotes}
      />
      {notesChanged && (
        <TouchableOpacity style={styles.saveNotesButton} onPress={saveNotes} disabled={savingNotes}>
          {savingNotes ? (
            <ActivityIndicator size="small" color={COLORS.onAccent} />
          ) : (
            <Text style={styles.saveNotesText}>Notu Kaydet</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  content: { padding: 22, paddingBottom: 60 },
  emptyText: { fontFamily: "Inter_400Regular", color: COLORS.graphite },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  dateText: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.ink },
  durationText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.graphite, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink },
  cardCategory: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginBottom: 8 },
  setLine: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite, marginTop: 2 },
  notesLabel: { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.ink, marginTop: 12, marginBottom: 8 },
  notesInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.ink,
    textAlignVertical: "top",
  },
  saveNotesButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveNotesText: { color: COLORS.onAccent, fontFamily: "Inter_700Bold", fontSize: 14 },
  })
);
