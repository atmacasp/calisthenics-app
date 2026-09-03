import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { onboardingInfoSchema, OnboardingInfoData } from "../../src/validation/onboarding.schema";
import { toMetricHeight, toMetricWeight } from "../../src/utils/unitConversion";
import { useOnboardingStore } from "../../src/store/onboardingStore";

export default function InfoScreen() {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const setInfo = useOnboardingStore((s) => s.setInfo);

  const { control, handleSubmit, formState: { errors } } = useForm<OnboardingInfoData>({
    resolver: zodResolver(onboardingInfoSchema),
    defaultValues: { full_name: "", height: undefined, weight: undefined, unit_preference: "metric" },
  });

  const onSubmit = (data: OnboardingInfoData) => {
    setInfo({
      full_name: data.full_name,
      height_cm: toMetricHeight(data.height, unit),
      weight_kg: toMetricWeight(data.weight, unit),
      unit_preference: unit,
    });
    router.push("/(onboarding)/level");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seni Tanıyalım</Text>

      <Controller
        control={control}
        name="full_name"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="İsim" value={value} onChangeText={onChange} />
        )}
      />
      {errors.full_name && <Text style={styles.error}>{errors.full_name.message}</Text>}

      <View style={styles.unitRow}>
        <TouchableOpacity style={[styles.unitButton, unit === "metric" && styles.unitButtonActive]} onPress={() => setUnit("metric")}>
          <Text style={unit === "metric" ? styles.unitTextActive : styles.unitText}>Metrik (cm/kg)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.unitButton, unit === "imperial" && styles.unitButtonActive]} onPress={() => setUnit("imperial")}>
          <Text style={unit === "imperial" ? styles.unitTextActive : styles.unitText}>İmperial (inç/lb)</Text>
        </TouchableOpacity>
      </View>

      <Controller
        control={control}
        name="height"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={unit === "metric" ? "Boy (cm)" : "Boy (inç)"}
            keyboardType="numeric"
            value={value?.toString() ?? ""}
            onChangeText={onChange}
          />
        )}
      />
      {errors.height && <Text style={styles.error}>{errors.height.message}</Text>}

      <Controller
        control={control}
        name="weight"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={unit === "metric" ? "Kilo (kg)" : "Kilo (lb)"}
            keyboardType="numeric"
            value={value?.toString() ?? ""}
            onChangeText={onChange}
          />
        )}
      />
      {errors.weight && <Text style={styles.error}>{errors.weight.message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)}>
        <Text style={styles.buttonText}>Devam Et</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 8 },
  error: { color: "red", marginBottom: 8, fontSize: 12 },
  unitRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  unitButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, alignItems: "center" },
  unitButtonActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  unitText: { color: "#374151" },
  unitTextActive: { color: "white", fontWeight: "600" },
  button: { backgroundColor: "#22c55e", padding: 16, borderRadius: 8, marginTop: 16 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
});
