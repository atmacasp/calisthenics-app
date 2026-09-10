import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "../../src/constants/layout";
import { useColors, useResolvedScheme } from "../../src/constants/theme";

/**
 * Tab bar'ın zemini.
 *
 * iOS'ta BlurView doğrudan arkasındaki içeriği bulanıklaştırır. Android'de SDK
 * 55'ten beri "doğru" yol içeriği BlurTargetView ile sarmak, ama tab navigator'ın
 * içeriği bizim elimizde olmadığı için (bar kendi kendini bulanıklaştırırdı)
 * eski dimezis yöntemini kullanıyoruz - Android 12+ gerektiriyor.
 *
 * Blur tutmazsa Android sessizce "yarı saydam zemin"e düşüyor - ilk denemede
 * olan buydu, arkadaki kart yazıları bar'ın içinden okunuyordu. Bu yüzden
 * üstteki ton katının opaklığı platforma göre ayrı: iOS'ta blur garanti
 * olduğu için hafif (%45) kalıp buzlu cam etkisini bozmuyor; Android'de
 * garanti olmadığı için kalın (%92) - blur çalışırsa arkadaki renkler
 * yumuşakça sızar, çalışmazsa yazı geçirmeyen mat bir panel kalır.
 * İki durumda da kasıtlı görünüyor, hiçbir durumda içerik okunmuyor.
 */
const TINT_ALPHA = Platform.OS === "ios" ? "73" : "EB"; // %45 / %92

function TabBarBackground() {
  const COLORS = useColors();
  const scheme = useResolvedScheme();

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === "ios" ? 60 : 100}
        tint={scheme === "dark" ? "dark" : "light"}
        // Android'e özel; iOS'ta yok sayılıyor. SDK 31+ varyantı bazı
        // cihazlarda hiç devreye girmiyordu, klasik dimezis daha güvenli.
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `${COLORS.paper}${TINT_ALPHA}` }]} />
      <View style={[styles.hairline, { backgroundColor: COLORS.line }]} />
    </View>
  );
}

export default function TabsLayout() {
  const COLORS = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          // Mutlak konum şart: içerik bar'ın ALTINDAN geçmezse blur'un
          // bulanıklaştıracak bir şeyi olmaz, bar da düz bir blok gibi durur.
          position: "absolute",
          backgroundColor: "transparent",
          // Çizgiyi zeminin kendisi çiziyor; buradaki kenarlık blur'un üstünde
          // kalıp keskin bir bant bırakıyordu.
          borderTopWidth: 0,
          elevation: 0,
          // Bar jest çubuğunun ALTINA kadar iniyor. Eskiden sabit 64 yükseklik
          // vardı ve güvenli alan bar'ın dışında ayrı bir şerit olarak kalıyordu -
          // koyu temada o şerit göze batıyordu.
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.graphite,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Hareketler",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Antrenman",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "İlerleme",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  hairline: { position: "absolute", top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
});
