import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  bg: "#0B0F0E",
  accent: "#22c55e",
  inactive: "rgba(245,247,246,0.4)",
  border: "rgba(245,247,246,0.08)",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.inactive,
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
