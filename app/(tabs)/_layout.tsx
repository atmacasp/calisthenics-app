import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "../../src/constants/layout";
import { useColors, useResolvedScheme } from "../../src/constants/theme";

/** İçeriğin bar'ın altına girerken eridiği geçiş bandının yüksekliği. */
const FADE_HEIGHT = 12;

/**
 * Tab bar'ın zemini.
 *
 * iOS: BlurView arkasındaki içeriği doğrudan bulanıklaştırıyor, gerçek buzlu cam.
 *
 * Android: expo-blur 57'de gerçek blur için bulanıklaştırılacak içeriğin
 * <BlurTargetView> ile sarılıp ref'inin BlurView'a `blurTarget` olarak
 * verilmesi ŞART - BlurView de o ağacın DIŞINDA, kardeşi olarak durmalı.
 * Tab navigator'da bu yapı kurulamıyor: sarmalayıcının içerikle bar'ın arasına
 * girmesi gerekiyor, React Navigation ise böyle bir nokta vermiyor. blurTarget
 * olmadan kütüphane blurMethod'u ne olursa olsun sessizce "none"a düşüyor ve
 * geriye yarı saydam bir zemin kalıyor - arkadaki kart yazıları okunuyordu.
 *
 * Bu yüzden Android'de blur denemesini tamamen bırakıp mat bir panel çiziyoruz.
 * Şeffaflık hissi üstteki gradyanla korunuyor: içerik bar'a girerken keskin
 * kesilmek yerine birkaç piksel boyunca eriyor. Kasıtlı görünüyor, ucuz duruyor.
 */
function TabBarBackground() {
  const COLORS = useColors();
  const scheme = useResolvedScheme();

  if (Platform.OS !== "ios") {
    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Hex8 şart: "transparent" Android'de gri bir bant bırakıyor. */}
        <LinearGradient
          colors={[`${COLORS.paper}00`, COLORS.paper]}
          style={styles.fade}
          pointerEvents="none"
        />
        <View style={[styles.panel, { backgroundColor: COLORS.paper }]} />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={60}
        tint={scheme === "dark" ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `${COLORS.paper}73` }]} />
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
          // İkonlar geçiş bandının altından başlasın; yoksa gradyanın yarı
          // saydam olduğu şeritte ikonun tepesiyle arkadaki içerik çakışıyor.
          paddingTop: FADE_HEIGHT + 2,
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
  fade: { position: "absolute", top: 0, left: 0, right: 0, height: FADE_HEIGHT },
  panel: { position: "absolute", top: FADE_HEIGHT, left: 0, right: 0, bottom: 0 },
});
