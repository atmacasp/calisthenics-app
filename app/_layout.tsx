import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useAuthStore } from "../src/store/authStore";
import { notificationsService } from "../src/services/notifications.service";
import { useColors, useResolvedScheme } from "../src/constants/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const COLORS = useColors();
  const scheme = useResolvedScheme();
  const initialize = useAuthStore((state) => state.initialize);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initialize();
    // expo-notifications Expo Go/Android'de import edilemiyor; servis modülü
    // tembel yüklediği için burada güvenle çağrılabilir (o ortamda no-op).
    notificationsService.configureHandler();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Status bar ikonları zemine göre ters olmalı: açık temada koyu, koyu temada
  // açık. Eskiden sabitti ve koyu tema seçilince ikonlar okunmuyordu.
  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.paper },
          // Alt ekranlarin basliklari (Stack.Screen ile headerShown: true diyenler)
          // varsayilan acik temada kaliyordu; renkler burada tek yerden veriliyor.
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { color: COLORS.ink },
          headerShadowVisible: false,
        }}
      />
    </SafeAreaProvider>
  );
}
