
import { useEffect } from "react";
import { useColorScheme } from "react-native";
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
import { useThemeStore } from "../src/store/themeStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const effectiveScheme = preference === "system" ? systemScheme : preference;

  return (
    <SafeAreaProvider>
      <StatusBar style={effectiveScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: effectiveScheme === "dark" ? "#000000" : "#ffffff",
          },
        }}
      />
    </SafeAreaProvider>
  );
}

