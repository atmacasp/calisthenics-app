import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { onboardingInfoSchema, OnboardingInfoData } from "../../src/validation/onboarding.schema";
import { toMetricHeight, toMetricWeight } from "../../src/utils/unitConversion";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { COLORS } from "../../src/constants/theme";

const DANGER = "#dc2626";

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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.stepRow}>
          <View style={styles.stepDotActive} />
          <View style={styles.stepDot} />
          <Text style={styles.stepText}>Adım 1 / 2</Text>
        </View>

        <Text style={styles.title}>Seni tanıyalım</Text>
        <Text style={styles.subtitle}>
          Bu bilgiler ilerlemeni ölçmek ve sana uygun programı önermek için.
        </Text>

        <Text style={styles.label}>İsim</Text>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.full_name && styles.inputError]}
              placeholder="Adın"
              placeholderTextColor={COLORS.graphite}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.full_name && <Text style={styles.error}>{errors.full_name.message}</Text>}

        <Text style={styles.label}>Birim</Text>
        <View style={styles.unitRow}>
          <TouchableOpacity
            style={[styles.unitButton, unit === "metric" && styles.unitButtonActive]}
            onPress={() => setUnit("metric")}
            activeOpacity={0.8}
          >
            <Text style={[styles.unitText, unit === "metric" && styles.unitTextActive]}>Metrik (cm/kg)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, unit === "imperial" && styles.unitButtonActive]}
            onPress={() => setUnit("imperial")}
            activeOpacity={0.8}
          >
            <Text style={[styles.unitText, unit === "imperial" && styles.unitTextActive]}>İmperial (inç/lb)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.measureRow}>
          <View style={styles.measureCol}>
            <Text style={styles.label}>{unit === "metric" ? "Boy (cm)" : "Boy (inç)"}</Text>
            <Controller
              control={control}
              name="height"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.height && styles.inputError]}
                  placeholder={unit === "metric" ? "178" : "70"}
                  placeholderTextColor={COLORS.graphite}
                  keyboardType="numeric"
                  value={value?.toString() ?? ""}
                  onChangeText={onChange}
                />
              )}
            />
          </View>
          <View style={styles.measureCol}>
            <Text style={styles.label}>{unit === "metric" ? "Kilo (kg)" : "Kilo (lb)"}</Text>
            <Controller
              control={control}
              name="weight"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.weight && styles.inputError]}
                  placeholder={unit === "metric" ? "72" : "158"}
                  placeholderTextColor={COLORS.graphite}
                  keyboardType="numeric"
                  value={value?.toString() ?? ""}
                  onChangeText={onChange}
                />
              )}
            />
          </View>
        </View>
        {errors.height && <Text style={styles.error}>{errors.height.message}</Text>}
        {errors.weight && <Text style={styles.error}>{errors.weight.message}</Text>}

        <Text style={styles.hint}>
          Girdiğin kilo ilk vücut ağırlığı kaydın olur; İlerleme sekmesinden takip edebilirsin.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Devam Et</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.paper },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 40 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  stepDot: { width: 18, height: 4, borderRadius: 2, backgroundColor: COLORS.line },
  stepDotActive: { width: 18, height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
  stepText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.graphite, marginLeft: 6 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: COLORS.ink },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.ink, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.ink,
  },
  inputError: { borderColor: DANGER },
  error: { fontFamily: "Inter_400Regular", fontSize: 12, color: DANGER, marginTop: 6 },
  unitRow: { flexDirection: "row", gap: 8 },
  unitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  unitButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  unitText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.ink },
  unitTextActive: { color: COLORS.white, fontFamily: "Inter_700Bold" },
  measureRow: { flexDirection: "row", gap: 12 },
  measureCol: { flex: 1 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 14, lineHeight: 18 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 28,
  },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.white },
});
