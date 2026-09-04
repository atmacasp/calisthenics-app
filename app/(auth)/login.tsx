import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { loginSchema, LoginFormData } from "../../src/validation/auth.schema";
import { authService } from "../../src/services/auth.service";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await authService.signIn(data.email, data.password);
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Giriş Hatası", error.message ?? "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giriş Yap</Text>

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
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Giriş yapılıyor..." : "Giriş Yap"}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/forgot-password" style={styles.link}><Text>Şifremi Unuttum</Text></Link>
      <Link href="/(auth)/register" style={styles.link}><Text>Hesabın yok mu? Kayıt Ol</Text></Link>
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
