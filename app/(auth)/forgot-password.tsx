import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { forgotPasswordSchema, ForgotPasswordFormData } from "../../src/validation/auth.schema";
import { authService } from "../../src/services/auth.service";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../src/constants/theme";

export default function ForgotPasswordScreen() {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      await authService.resetPassword(data.email);
      Alert.alert("E-posta Gönderildi", "Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
      router.replace("/(auth)/login");
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Ionicons name="key-outline" size={24} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>Şifreni sıfırla</Text>
        <Text style={styles.subtitle}>
          E-posta adresini gir, sıfırlama bağlantısını gönderelim.
        </Text>

        <Text style={styles.label}>E-posta</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="ornek@eposta.com"
              placeholderTextColor={COLORS.graphite}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Sıfırlama Bağlantısı Gönder</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.linkMuted}>
            <Text style={styles.linkAccent}>Girişe dön</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.paper },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.inverse,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: COLORS.ink },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.graphite,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.ink, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.ink,
  },
  inputError: { borderColor: COLORS.warn },
  error: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.warn, marginTop: 6 },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.onAccent },
  linkRow: { alignItems: "center", marginTop: 18 },
  linkMuted: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.graphite },
  linkAccent: { fontFamily: "Inter_700Bold", color: COLORS.accent },
  })
);
