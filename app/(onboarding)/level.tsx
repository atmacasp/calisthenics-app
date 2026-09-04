import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useAuthStore } from "../../src/store/authStore";
import { profileService } from "../../src/services/profile.service";

export default function LevelScreen() {
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(null);
  const [loading, setLoading] = useState(false);
  const onboardingData = useOnboardingStore((s) => s);
  const session = useAuthStore((s) => s.session);

  const onSubmit = async () => {
    if (!level || !session) return;
    setLoading(true);
    try {
      await profileService.updateProfile(session.user.id, {
        full_name: onboardingData.full_name,
        height_cm: onboardingData.height_cm,
        weight_kg: onboardingData.weight_kg,
        unit_preference: onboardingData.unit_preference,
        level,
        onboarding_completed: true,
      });
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seviyeni Seç</Text>
      <Text style={styles.subtitle}>Sana uygun programı önerebilmemiz için.</Text>

      <TouchableOpacity style={[styles.option, level === "beginner" && styles.optionActive]} onPress={() => setLevel("beginner")}>
        <Text style={level === "beginner" ? styles.optionTextActive : styles.optionText}>Başlangıç</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.option, level === "intermediate" && styles.optionActive]} onPress={() => setLevel("intermediate")}>
        <Text style={level === "intermediate" ? styles.optionTextActive : styles.optionText}>Orta Seviye</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.option, level === "advanced" && styles.optionActive]} onPress={() => setLevel("advanced")}>
        <Text style={level === "advanced" ? styles.optionTextActive : styles.optionText}>İleri Seviye</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={!level || loading}>
        <Text style={styles.buttonText}>{loading ? "Kaydediliyor..." : "Tamamla"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 24, textAlign: "center" },
  option: { padding: 16, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 12, alignItems: "center" },
  optionActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  optionText: { color: "#374151", fontWeight: "500" },
  optionTextActive: { color: "white", fontWeight: "700" },
  button: { backgroundColor: "#111827", padding: 16, borderRadius: 8, marginTop: 16 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
});
