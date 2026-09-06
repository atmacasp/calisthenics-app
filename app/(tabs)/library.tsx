
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { movementsService } from "../../src/services/movements.service";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../../src/constants/theme";

export default function LibraryScreen() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    movementsService.getGroups().then(setGroups).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Hareket Kütüphanesi</Text>
        <Text style={styles.headerSubtitle}>Kategorileri ve progression adımlarını incele</Text>
      </View>
      
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/movement-group/${item.id}?name=${encodeURIComponent(item.name)}`)}
          >
            <View style={styles.cardLeft}>
              <View style={styles.cardAccent} />
              <Text style={styles.cardTitle}>{item.name}</Text>
            </View>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={20} color={COLORS.graphite} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.paper 
  },
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: COLORS.paper 
  },
  headerContainer: {
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: COLORS.ink,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 90, // Tab bar arkasında kalmaması için geniş alt alan
    paddingTop: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 20,
  },
  cardAccent: {
    width: 4,
    height: 24,
    backgroundColor: COLORS.accent,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginRight: 16,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: COLORS.ink,
  },
  iconContainer: {
    paddingRight: 20,
  },
});
