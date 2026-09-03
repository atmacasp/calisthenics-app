import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function WorkoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Antrenman</Text>
      <Text style={styles.subtitle}>Hazır olduğunda antrenmanına başla.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/workout/start")}>
        <Text style={styles.buttonText}>Antrenman Başlat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 32, textAlign: "center" },
  button: { backgroundColor: "#22c55e", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
});
