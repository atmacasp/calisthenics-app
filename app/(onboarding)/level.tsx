import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useAuthStore } from "../../src/store/authStore";
import { profileService } from "../../src/services/profile.service";
import { bodyWeightService } from "../../src/services/bodyweight.service";
import { COLORS } from "../../src/constants/theme";

type Level = "beginner" | "intermediate" | "advanced";

const LEVELS: { value: Level; label: string; description: string }[] = [
  {
    value: "beginner",
    label: "Başlangıç",
    description: "Şınav, squat, mekik gibi temel hareketlerde henüz yol alıyorum.",
  },
  {
    value: "intermediate",
    label: "Orta Seviye",
    description: "Temel hareketleri rahat yapıyorum, progression basamaklarına geçiyorum.",
  },
  {
    value: "advanced",
    label: "İleri Seviye",
    description: "Planche, front lever gibi ileri statik hareketlerde çalışıyorum.",
  },
];

export default function LevelScreen() {
  const [level, setLevel] = useState<Level | null>(null);
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
      // Girilen kilo ilk vücut ağırlığı kaydı olsun; aksi halde İlerleme > Vücut
      // sekmesi, uygulama kiloyu bildiği hâlde boş açılıyordu. Başarısız olursa
      // onboarding tamamlanmayı engellemesin.
      if (onboardingData.weight_kg) {
        await bodyWeightService.addLog(session.user.id, onboardingData.weight_kg).catch(() => {});
      }
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.stepRow}>
        <View style={styles.stepDotActive} />
        <View style={styles.stepDotActive} />
        <Text style={styles.stepText}>Adım 2 / 2</Text>
      </View>

      <Text style={styles.title}>Seviyeni seç</Text>
      <Text style={styles.subtitle}>
        Nereden başlayacağını belirler. Sonradan Profil'den değiştirebilirsin.
      </Text>

      {LEVELS.map((option) => {
        const selected = level === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => setLevel(option.value)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{option.label}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <Ionicons
              name={selected ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={selected ? COLORS.accent : COLORS.line}
            />
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.button, !level && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!level || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>Tamamla</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} disabled={loading}>
        <Ionicons name="arrow-back" size={14} color={COLORS.graphite} />
        <Text style={styles.backText}>Geri</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.paper },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 40 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  stepDotActive: { width: 18, height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
  stepText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.graphite, marginLeft: 6 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: COLORS.ink },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
    marginTop: 4,
    marginBottom: 22,
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardSelected: { borderColor: COLORS.accent, backgroundColor: "rgba(34,197,94,0.06)" },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink },
  cardTitleSelected: { color: COLORS.accent },
  cardDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.graphite,
    marginTop: 4,
    lineHeight: 17,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: { backgroundColor: COLORS.line },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.white },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 18 },
  backText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.graphite },
});
