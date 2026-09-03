import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { forgotPasswordSchema, ForgotPasswordFormData } from "../../src/validation/auth.schema";
import { authService } from "../../src/services/auth.service";

export default function ForgotPasswordScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Şifremi Unuttum</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" style={styles.link}><Text>Girişe Dön</Text></Link>
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
});
