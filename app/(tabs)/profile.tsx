import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, StyleSheet, useColorScheme } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useThemeStore } from "../../src/store/themeStore";
import { profileService } from "../../src/services/profile.service";
import { authService } from "../../src/services/auth.service";

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const systemScheme = useColorScheme();

  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const [saving, setSaving] = useState(false);

  const effectiveScheme = themePreference === "system" ? systemScheme : themePreference;
  const isDark = effectiveScheme === "dark";
  const colors = {
    background: isDark ? "#111827" : "#ffffff",
    card: isDark ? "#1f2937" : "#f3f4f6",
    text: isDark ? "#f9fafb" : "#111827",
    subtext: isDark ? "#9ca3af" : "#6b7280",
    accent: "#22c55e",
  };

  useEffect(() => {
    if (!session) return;
    profileService.getProfile(session.user.id).then((profile) => {
      setUnit(profile.unit_preference ?? "metric");
      setNotifications(profile.notifications_enabled ?? true);
      setLanguage(profile.language ?? "tr");
      setLoading(false);
    });
  }, [session]);

  const persist = async (updates: Record<string, any>) => {
    if (!session) return;
    setSaving(true);
    try {
      await profileService.updateProfile(session.user.id, updates);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleUnitChange = (value: "metric" | "imperial") => {
    setUnit(value);
    persist({ unit_preference: value });
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotifications(value);
    persist({ notifications_enabled: value });
  };

  const handleThemeChange = (value: "system" | "light" | "dark") => {
    setThemePreference(value);
    persist({ theme: value });
  };

  const handleLanguageChange = (value: "tr" | "en") => {
    setLanguage(value);
    persist({ language: value });
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      router.replace("/(auth)/login");
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Çıkış yapılamadı");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Hesabı Sil",
      "Bu işlem geri alınamaz. Tüm verilerin (antrenman geçmişi, ilerleme, profil) kalıcı olarak silinecek. Emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabımı Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await authService.deleteAccount();
              await authService.signOut();
              router.replace("/(auth)/login");
            } catch (error: any) {
              Alert.alert("Hata", error.message ?? "Hesap silinemedi");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.header, { color: colors.text }]}>Profil & Ayarlar</Text>
      <Text style={[styles.email, { color: colors.subtext }]}>{session?.user.email}</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Birim</Text>
      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: colors.card }, unit === "metric" && styles.optionActive]}
          onPress={() => handleUnitChange("metric")}
        >
          <Text style={unit === "metric" ? styles.optionTextActive : { color: colors.text }}>Metrik (kg)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: colors.card }, unit === "imperial" && styles.optionActive]}
          onPress={() => handleUnitChange("imperial")}
        >
          <Text style={unit === "imperial" ? styles.optionTextActive : { color: colors.text }}>İmperial (lb)</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirimler</Text>
      <View style={[styles.switchRow, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text }}>Bildirimleri Etkinleştir</Text>
        <Switch value={notifications} onValueChange={handleNotificationsToggle} trackColor={{ true: colors.accent }} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tema</Text>
      <View style={styles.rowButtons}>
        {(["system", "light", "dark"] as const).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.optionButtonSmall, { backgroundColor: colors.card }, themePreference === option && styles.optionActive]}
            onPress={() => handleThemeChange(option)}
          >
            <Text style={themePreference === option ? styles.optionTextActive : { color: colors.text, fontSize: 13 }}>
              {option === "system" ? "Sistem" : option === "light" ? "Açık" : "Koyu"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Dil</Text>
      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: colors.card }, language === "tr" && styles.optionActive]}
          onPress={() => handleLanguageChange("tr")}
        >
          <Text style={language === "tr" ? styles.optionTextActive : { color: colors.text }}>Türkçe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: colors.card }, language === "en" && styles.optionActive]}
          onPress={() => handleLanguageChange("en")}
        >
          <Text style={language === "en" ? styles.optionTextActive : { color: colors.text }}>English</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>Hesabı Sil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  rowButtons: { flexDirection: "row", gap: 8 },
  optionButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: "center" },
  optionButtonSmall: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
  optionActive: { backgroundColor: "#22c55e" },
  optionTextActive: { color: "white", fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 8 },
  signOutButton: { marginTop: 40, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db" },
  signOutText: { textAlign: "center", fontWeight: "600" },
  deleteButton: { marginTop: 12, padding: 16, borderRadius: 8 },
  deleteText: { textAlign: "center", fontWeight: "700", color: "#ef4444" },
});
