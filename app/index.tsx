import { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/authStore";
import { useThemeStore } from "../src/store/themeStore";
import { profileService } from "../src/services/profile.service";
import { useColors } from "../src/constants/theme";
import { notificationsService } from "../src/services/notifications.service";

export default function Index() {
  const COLORS = useColors();
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const checkProfile = useCallback(async () => {
    if (!session) {
      setCheckingProfile(false);
      return;
    }
    setCheckingProfile(true);
    setLoadError(null);
    try {
      const profile = await profileService.getProfile(session.user.id);
      setOnboardingCompleted(!!profile?.onboarding_completed);
      if (profile?.theme) setThemePreference(profile.theme);

      // Hatırlatıcılar cihazda yaşıyor; program veya saat değişmiş olabileceği
      // için her açılışta profildeki tercihe göre yeniden kuruluyor.
      // Başarısız olması açılışı engellememeli.
      notificationsService
        .syncReminders(session.user.id, {
          enabled: profile?.notifications_enabled ?? true,
          hour: profile?.reminder_hour ?? 18,
        })
        .catch(() => {});
    } catch (error: any) {
      setLoadError(error.message ?? "Profil yüklenemedi");
    } finally {
      setCheckingProfile(false);
    }
  }, [session]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  if (isLoading || (session && checkingProfile)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper }}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (session && loadError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: COLORS.paper }}>
        <Text style={{ textAlign: "center", marginBottom: 16, color: "#374151" }}>
          Profil yüklenirken bir sorun oluştu.{"\n"}Telefonunun tarih/saat ayarının "otomatik" olduğundan emin ol.
        </Text>
        <TouchableOpacity
          onPress={checkProfile}
          style={{ backgroundColor: COLORS.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  if (!onboardingCompleted) return <Redirect href="/(onboarding)/info" />;
  return <Redirect href="/(tabs)" />;
}
