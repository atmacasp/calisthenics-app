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
import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { registerSchema, RegisterFormData } from "../../src/validation/auth.schema";
import { authService } from "../../src/services/auth.service";
import { COLORS, themedStyles, useColors, type ThemeColors } from "../../src/constants/theme";

const passwordRequirements = [
  { label: "En az 8 karakter", test: (pw: string) => pw.length >= 8 },
  { label: "Bir büyük harf (A-Z)", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "Bir küçük harf (a-z)", test: (pw: string) => /[a-z]/.test(pw) },
  { label: "Bir rakam (0-9)", test: (pw: string) => /[0-9]/.test(pw) },
  { label: "Bir sembol (!@#$% vb.)", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

export default function RegisterScreen() {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  /**
   * Karşılanmayan koşullar kullanıcı yazarken kırmızı gösterilmiyor - o aşamada
   * "hata" değil "henüz yapılmadı" durumundalar. Alandan çıkınca ya da eksik
   * şifreyle kaydolmayı deneyince kırmızıya dönüyorlar.
   */
  const [showUnmet, setShowUnmet] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const checklistY = useRef(0);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password") || "";
  const metCount = passwordRequirements.filter((r) => r.test(passwordValue)).length;

  /** Klavye açılınca koşul listesi klavyenin arkasında kalmasın. */
  const revealChecklist = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, checklistY.current - 120), animated: true });
    }, 250);
  };

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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandMark}>
          <MaterialCommunityIcons name="dumbbell" size={26} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>Hesap oluştur</Text>
        <Text style={styles.subtitle}>İlk progression'ına bugün başla.</Text>

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

        <Text style={styles.label}>Şifre</Text>
        <View style={styles.inputRow}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.inputInner}
                placeholder="••••••••"
                placeholderTextColor={COLORS.graphite}
                secureTextEntry={!showPassword}
                value={value}
                onChangeText={onChange}
                onFocus={revealChecklist}
                onBlur={() => {
                  if (value && value.length > 0) setShowUnmet(true);
                }}
              />
            )}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.graphite} />
          </TouchableOpacity>
        </View>

        <View
          style={styles.requirementsBox}
          onLayout={(e) => {
            checklistY.current = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.strengthTrack}>
            <View
              style={[styles.strengthFill, { width: `${(metCount / passwordRequirements.length) * 100}%` }]}
            />
          </View>
          {passwordRequirements.map((req) => {
            const met = req.test(passwordValue);
            const failed = !met && showUnmet;
            return (
              <View key={req.label} style={styles.requirementRow}>
                <Ionicons
                  name={met ? "checkmark-circle" : failed ? "close-circle" : "ellipse-outline"}
                  size={14}
                  color={met ? COLORS.accent : failed ? COLORS.warn : COLORS.graphite}
                />
                <Text
                  style={[
                    styles.requirementText,
                    met && styles.requirementTextMet,
                    failed && styles.requirementTextFailed,
                  ]}
                >
                  {req.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.label}>Şifre (Tekrar)</Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.graphite}
              secureTextEntry={!showPassword}
              value={value}
              onChangeText={onChange}
              onFocus={revealChecklist}
            />
          )}
        />
        {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit(onSubmit, () => setShowUnmet(true))}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.linkMuted}>
            Zaten hesabın var mı? <Text style={styles.linkAccent}>Giriş Yap</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.paper },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 40, paddingBottom: 260 },
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
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.graphite, marginTop: 4, marginBottom: 20 },
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.ink,
  },
  inputError: { borderColor: COLORS.warn },
  error: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.warn, marginTop: 6 },
  requirementsBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 6,
  },
  strengthTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.line, overflow: "hidden", marginBottom: 6 },
  strengthFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
  requirementRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  requirementText: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.ink },
  requirementTextMet: { fontFamily: "Inter_600SemiBold", color: COLORS.ink },
  requirementTextFailed: { fontFamily: "Inter_500Medium", color: COLORS.warn },
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
