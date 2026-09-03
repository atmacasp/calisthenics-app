import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useAuthStore } from "../../../src/store/authStore";
import { useWorkoutStore } from "../../../src/store/workoutStore";
import { workoutService } from "../../../src/services/workout.service";

const REST_SECONDS = 60;

function sanitizeInteger(text: string) {
  return text.replace(/[^0-9]/g, "");
}

function sanitizeDecimal(text: string) {
  let cleaned = text.replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned;
}

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authSession = useAuthStore((s) => s.session);
  const sessionMovements = useWorkoutStore((s) => s.sessionMovements);
  const addSetToMovement = useWorkoutStore((s) => s.addSetToMovement);
  const reset = useWorkoutStore((s) => s.reset);

  const [inputs, setInputs] = useState<Record<string, { reps: string; duration: string; weight: string }>>({});
  const [restLeft, setRestLeft] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (restLeft <= 0) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setRestLeft((s) => s - 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [restLeft > 0]);

  const updateInput = (movementId: string, field: "reps" | "duration" | "weight", rawValue: string) => {
    const value =
      field === "weight" ? sanitizeDecimal(rawValue) : sanitizeInteger(rawValue);
    setInputs((prev) => ({ ...prev, [movementId]: { ...prev[movementId], [field]: value } }));
  };

  const totalLoggedSets = sessionMovements.reduce((sum, m) => sum + m.sets.length, 0);

  const saveSet = async (movementId: string) => {
    const values = inputs[movementId] || { reps: "", duration: "", weight: "" };
    const movement = sessionMovements.find((m) => m.movementId === movementId);
    if (!movement || !id) return;

    const reps = values.reps ? parseInt(values.reps, 10) : undefined;
    const duration = values.duration ? parseInt(values.duration, 10) : undefined;
    const weight = values.weight ? parseFloat(values.weight) : undefined;

    const hasValidValue =
      (reps !== undefined && reps > 0) ||
      (duration !== undefined && duration > 0) ||
      (weight !== undefined && weight > 0);

    if (!hasValidValue) {
      Alert.alert("Eksik bilgi", "Seti kaydetmeden önce tekrar, süre veya ek ağırlıktan en az birini gir.");
      return;
    }

    try {
      const saved = await workoutService.addSet({
        session_id: id,
        movement_id: movementId,
        set_number: movement.sets.length + 1,
        reps,
        duration_seconds: duration,
        added_weight_kg: weight,
      });
      addSetToMovement(movementId, saved);
      setInputs((prev) => ({ ...prev, [movementId]: { reps: "", duration: "", weight: "" } }));
      setRestLeft(REST_SECONDS);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Set kaydedilemedi");
    }
  };

  const finishWorkout = async () => {
    if (!id || !authSession) return;

    if (totalLoggedSets === 0) {
      Alert.alert(
        "Henüz set kaydedilmedi",
        "Antrenmanı bitirmeden önce en az bir set kaydetmelisin.",
      );
      return;
    }

    try {
      await workoutService.endSession(id, authSession.user.id);
      reset();
      router.replace("/(tabs)/workout");
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Antrenman bitirilemedi");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Aktif Antrenman" }} />

      {restLeft > 0 && (
        <View style={styles.restBanner}>
          <Text style={styles.restText}>Dinlenme: {restLeft}s</Text>
          <TouchableOpacity onPress={() => setRestLeft(0)}>
            <Text style={styles.skipText}>Atla</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {sessionMovements.length === 0 && (
          <Text style={styles.emptyText}>Henüz hareket eklenmedi. Aşağıdan bir hareket ekle.</Text>
        )}

        {sessionMovements.map((movement) => (
          <View key={movement.movementId} style={styles.card}>
            <Text style={styles.cardTitle}>{movement.name}</Text>

            {movement.sets.map((s, i) => (
              <Text key={s.id} style={styles.setLine}>
                Set {i + 1}: {s.reps ? `${s.reps} tekrar` : ""} {s.duration_seconds ? `${s.duration_seconds} sn` : ""} {s.added_weight_kg ? `+${s.added_weight_kg}kg` : ""}
              </Text>
            ))}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.smallInput}
                placeholder="Tekrar"
                keyboardType="number-pad"
                value={inputs[movement.movementId]?.reps ?? ""}
                onChangeText={(v) => updateInput(movement.movementId, "reps", v)}
              />
              <TextInput
                style={styles.smallInput}
                placeholder="Süre (sn)"
                keyboardType="number-pad"
                value={inputs[movement.movementId]?.duration ?? ""}
                onChangeText={(v) => updateInput(movement.movementId, "duration", v)}
              />
              <TextInput
                style={styles.smallInput}
                placeholder="Ek kg"
                keyboardType="decimal-pad"
                value={inputs[movement.movementId]?.weight ?? ""}
                onChangeText={(v) => updateInput(movement.movementId, "weight", v)}
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={() => saveSet(movement.movementId)}>
              <Text style={styles.saveButtonText}>Seti Kaydet</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/workout/pick-movement")}>
          <Text style={styles.addButtonText}>+ Hareket Ekle</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
        <Text style={styles.finishButtonText}>Antrenmanı Bitir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  restBanner: { backgroundColor: "#111827", padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  restText: { color: "white", fontWeight: "700" },
  skipText: { color: "#22c55e", fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 24 },
  card: { backgroundColor: "#f3f4f6", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  setLine: { fontSize: 13, color: "#374151", marginBottom: 2 },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallInput: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 8, backgroundColor: "white" },
  saveButton: { backgroundColor: "#22c55e", padding: 10, borderRadius: 8, marginTop: 10 },
  saveButtonText: { color: "white", textAlign: "center", fontWeight: "600" },
  addButton: { borderWidth: 1, borderColor: "#22c55e", borderStyle: "dashed", padding: 14, borderRadius: 8, alignItems: "center" },
  addButtonText: { color: "#22c55e", fontWeight: "700" },
  finishButton: { backgroundColor: "#111827", padding: 18 },
  finishButtonText: { color: "white", textAlign: "center", fontWeight: "700", fontSize: 16 },
});
