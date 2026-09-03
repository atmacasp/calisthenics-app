import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { registerSchema, RegisterFormData } from "../../src/validation/auth.schema";
import { authService } from "../../src/services/auth.service";

const passwordRequirements = [
  { label: "En az 8 karakter", test: (pw: string) => pw.length >= 8 },
  { label: "Bir büyük harf (A-Z)", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "Bir küçük harf (a-z)", test: (pw: string) => /[a-z]/.test(pw) },
  { label: "Bir rakam (0-9)", test: (pw: string) => /[0-9]/.test(pw) },
  { label: "Bir sembol (!@#$% vb.)", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password") || "";

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      await authService.signUp(data.email, data.password);
      Alert.alert("Kayıt Başarılı", "E-postanızı kontrol edip hesabınızı onaylayın.");
      router.replace("/(auth)/login");
    } catch (error: any) {
      Alert.alert("Kayıt Hatası", error.message ?? "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kayıt Ol</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="Şifre" secureTextEntry value={value} onChangeText={onChange} />
        )}
      />

      <View style={styles.requirementsBox}>
        {passwordRequirements.map((req) => {
          const met = req.test(passwordValue);
          return (
            <View key={req.label} style={styles.requirementRow}>
              <View style={[styles.dot, { backgroundColor: met ? "#22c55e" : "#d1d5db" }]} />
              <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
                {req.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="Şifre (Tekrar)" secureTextEntry value={value} onChangeText={onChange} />
        )}
      />
      {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Kayıt olunuyor..." : "Kayıt Ol"}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" style={styles.link}><Text>Zaten hesabın var mı? Giriş Yap</Text></Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 8 },
  error: { color: "red", marginBottom: 8, fontSize: 12 },
  button: { backgroundColor: "#22c55e", padding: 16, borderRadius: 8, marginTop: 16 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
  link: { marginTop: 16, alignItems: "center" },
  requirementsBox: { marginBottom: 12, paddingLeft: 4 },
  requirementRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  requirementText: { fontSize: 12, color: "#6b7280" },
  requirementTextMet: { color: "#16a34a", fontWeight: "500" },
});
