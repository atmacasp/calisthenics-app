import { View, Text, Image, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useColors } from "../constants/theme";

type Props = {
  uri?: string | null;
  name?: string | null;
  size: number;
};

/**
 * Profil fotoğrafı; yoksa (ya da görsel yüklenemezse) ismin baş harfi.
 *
 * Stiller burada themedStyles ile değil doğrudan üretiliyor: boyut prop'tan
 * geldiği için palet başına tek bir stil sayfası önbelleklenemiyor, ve bileşen
 * zaten sadece birkaç kutudan ibaret.
 */
export function Avatar({ uri, name, size }: Props) {
  const COLORS = useColors();
  const [failed, setFailed] = useState(false);

  // URL değişince (yeni fotoğraf yüklendi) hata durumu sıfırlanmalı, yoksa bir
  // kez patlayan görselden sonra harf sonsuza kadar kalır.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  };

  if (uri && !failed) {
    return <Image source={{ uri }} style={circle} onError={() => setFailed(true)} resizeMode="cover" />;
  }

  return (
    <View style={[circle, styles.center]}>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: Math.round(size * 0.4),
          color: COLORS.accent,
        }}
      >
        {(name?.trim()?.[0] ?? "?").toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
