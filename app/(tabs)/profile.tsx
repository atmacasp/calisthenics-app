import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { useThemeStore } from "../../src/store/themeStore";
import { profileService, type ProfileUpdate } from "../../src/services/profile.service";
import { authService } from "../../src/services/auth.service";
import { notificationsService, describeReminders } from "../../src/services/notifications.service";
import { COLORS } from "../../src/constants/theme";

const DANGER = "#dc2626";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Başlangıç",
  intermediate: "Orta Seviye",
  advanced: "İleri Seviye",
};

const REMINDER_HOURS = [6, 7, 8, 9, 12, 17, 18, 19, 20, 21, 22];

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [notifications, setNotifications] = useState(true);
  const [reminderHour, setReminderHour] = useState(18);
  const [reminderStatus, setReminderStatus] = useState<string>("");
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    profileService
      .getProfile(session.user.id)
      .then((data) => {
        setProfile(data);
        setUnit(data.unit_preference ?? "metric");
        setNotifications(data.notifications_enabled ?? true);
        setReminderHour(data.reminder_hour ?? 18);
        setLanguage((data.language as "tr" | "en") ?? "tr");
      })
      .catch((error: any) => Alert.alert("Hata", error.message ?? "Profil yüklenemedi"))
      .finally(() => setLoading(false));
  }, [session]);

  const persist = async (updates: ProfileUpdate) => {
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

  /**
   * Hatırlatıcılar tamamen cihazda zamanlanıyor. Tercih değiştiğinde önce
   * DB'ye yazıp sonra zamanlamayı baştan kuruyoruz - servis her seferinde
   * mevcut bildirimleri silip yeniden planlıyor.
   */
  const applyReminders = async (enabled: boolean, hour: number) => {
    if (!session) return;
    setSaving(true);
    try {
      const result = await notificationsService.syncReminders(session.user.id, { enabled, hour, requestPermission: true });
      setReminderStatus(enabled ? describeReminders(result, hour) : "");
      if (result.permissionDenied) {
        setNotifications(false);
        await profileService.updateProfile(session.user.id, { notifications_enabled: false });
        Alert.alert(
          "Bildirim izni yok",
          "Hatırlatıcı kurabilmem için telefon ayarlarından bu uygulamaya bildirim izni vermen gerekiyor."
        );
      }
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Hatırlatıcı kurulamadı");
    } finally {
      setSaving(false);
    }
  };

  const handleUnitChange = (value: "metric" | "imperial") => {
    setUnit(value);
    persist({ unit_preference: value });
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setNotifications(value);
    await persist({ notifications_enabled: value });
    await applyReminders(value, reminderHour);
  };

  const handleReminderHourChange = async (hour: number) => {
    setReminderHour(hour);
    await persist({ reminder_hour: hour });
    if (notifications) await applyReminders(true, hour);
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
      await notificationsService.cancelAll();
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
              await notificationsService.cancelAll();
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
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Profil</Text>
        {saving && <ActivityIndicator size="small" color={COLORS.accent} />}
      </View>

      <View style={styles.identityCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{(profile?.full_name?.[0] ?? "?").toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.identityName} numberOfLines={1}>
            {profile?.full_name ?? "İsimsiz"}
          </Text>
          <Text style={styles.identityEmail} numberOfLines={1}>
            {session?.user.email}
          </Text>
          <View style={styles.levelChip}>
            <Ionicons name="ribbon-outline" size={12} color={COLORS.accent} />
            <Text style={styles.levelChipText}>{LEVEL_LABELS[profile?.level] ?? "Seviye yok"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.miniStatsRow}>
        <View style={styles.miniStatBox}>
          <Text style={styles.miniStatNumber}>{profile?.current_streak ?? 0}</Text>
          <Text style={styles.miniStatLabel}>güncel seri</Text>
        </View>
        <View style={styles.miniStatBox}>
          <Text style={styles.miniStatNumber}>{profile?.longest_streak ?? 0}</Text>
          <Text style={styles.miniStatLabel}>en uzun seri</Text>
        </View>
        <View style={styles.miniStatBox}>
          <Text style={styles.miniStatNumber}>{profile?.height_cm ?? "-"}</Text>
          <Text style={styles.miniStatLabel}>boy (cm)</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Birim</Text>
      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.optionButton, unit === "metric" && styles.optionActive]}
          onPress={() => handleUnitChange("metric")}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, unit === "metric" && styles.optionTextActive]}>Metrik (kg)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, unit === "imperial" && styles.optionActive]}
          onPress={() => handleUnitChange("imperial")}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, unit === "imperial" && styles.optionTextActive]}>İmperial (lb)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Antrenman Hatırlatıcısı</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchIconBox}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.accent} />
        </View>
        <Text style={styles.switchLabel}>Hatırlatıcıyı Aç</Text>
        <Switch
          value={notifications}
          onValueChange={handleNotificationsToggle}
          trackColor={{ true: COLORS.accent, false: COLORS.line }}
          thumbColor={COLORS.white}
        />
      </View>

      {notifications && (
        <>
          <Text style={[styles.helperText, { marginTop: 12, marginBottom: 8 }]}>Hangi saatte hatırlatılsın?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {REMINDER_HOURS.map((hour) => (
              <TouchableOpacity
                key={hour}
                style={[styles.optionButtonSmall, { marginRight: 8, minWidth: 68, flex: 0 }, reminderHour === hour && styles.optionActive]}
                onPress={() => handleReminderHourChange(hour)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionTextSmall, reminderHour === hour && styles.optionTextActive]}>
                  {String(hour).padStart(2, "0")}:00
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.helperText}>
            {reminderStatus ||
              "Takip ettiğin program varsa yalnızca antrenman günlerinde, yoksa her gün hatırlatılır."}
          </Text>
        </>
      )}

      <Text style={styles.sectionTitle}>Tema</Text>
      <View style={styles.rowButtons}>
        {(["system", "light", "dark"] as const).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.optionButtonSmall, themePreference === option && styles.optionActive]}
            onPress={() => handleThemeChange(option)}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionTextSmall, themePreference === option && styles.optionTextActive]}>
              {option === "system" ? "Sistem" : option === "light" ? "Açık" : "Koyu"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.helperText}>Koyu tema hazırlanıyor — şu an tüm ekranlar açık temada.</Text>

      <Text style={styles.sectionTitle}>Dil</Text>
      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.optionButton, language === "tr" && styles.optionActive]}
          onPress={() => handleLanguageChange("tr")}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, language === "tr" && styles.optionTextActive]}>Türkçe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, language === "en" && styles.optionActive]}
          onPress={() => handleLanguageChange("en")}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, language === "en" && styles.optionTextActive]}>English</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.ink} />
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.8}>
        <Text style={styles.deleteText}>Hesabı Sil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  header: { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.ink },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  avatarLetter: { fontFamily: "Inter_700Bold", fontSize: 22, color: COLORS.accent },
  identityName: { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.ink },
  identityEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2 },
  levelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  levelChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.accent },
  miniStatsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  miniStatBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  miniStatNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: COLORS.ink },
  miniStatLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.graphite, marginTop: 2, textAlign: "center" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.ink, marginTop: 26, marginBottom: 10 },
  rowButtons: { flexDirection: "row", gap: 8 },
  optionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  optionButtonSmall: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  optionActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  optionText: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.ink },
  optionTextSmall: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.ink },
  optionTextActive: { color: COLORS.white, fontFamily: "Inter_700Bold" },
  helperText: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 8 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  switchIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  switchLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.ink },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 36,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.ink },
  deleteButton: { marginTop: 10, paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  deleteText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: DANGER },
});
