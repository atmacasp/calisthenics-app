import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { groupVisual } from "../constants/groupVisuals";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";

export interface MovementMediaProps {
  /** Duran kare (movements.image_url) - zincir kartındaki fotoğrafın aynısı. */
  imageUrl?: string | null;
  /** Hareketin animasyonu (movements.gif_url). Doluysa oynat düğmesi çıkar. */
  gifUrl?: string | null;
  /** Fotoğraf yoksa kategorinin renk/ikon kimliğine düşmek için. */
  groupSlug?: string | null;
}

/**
 * Hareket detayındaki görsel önizleme çerçevesi.
 *
 * Yazılı talimatın üstünde tek bir görsel çapa: kullanıcı "nasıl yapılır"ı
 * okumadan önce hareketin neye benzediğini görüyor.
 *
 * Çerçeve fotoğraf olmasa da çiziliyor - GroupCard ve StepCard'daki kural
 * burada da geçerli: kimliği önce RENK taşıyor, fotoğraf geldiğinde kod
 * değişmeden yerine geçiyor. Böylece fotoğrafı olan ve olmayan hareketlerin
 * ekranı aynı iskelete sahip; eksik fotoğraf ekranı değiştirmiyor, sadece
 * daha sade bırakıyor.
 *
 * Oynat düğmesi SADECE gerçekten oynatacak bir şey varken (gif_url dolu)
 * çıkıyor - basınca hiçbir şey olmayan bir düğme, düğme olmamasından kötü.
 */
export function MovementMedia({ imageUrl, gifUrl, groupSlug }: MovementMediaProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);
  const visual = groupVisual(groupSlug);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const poster = imageUrl ?? gifUrl ?? null;

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
  }, [poster, gifUrl]);

  const showImage = !!poster && !failed;
  // Oynatacak bir şey yoksa düğme de yok; görsel yüklenemediyse zaten
  // gradyan zemin var, onun üstünde oynat düğmesi yanıltıcı olurdu.
  const canPlay = !!gifUrl && !failed;
  const uri = playing && gifUrl ? gifUrl : poster;

  return (
    <View style={styles.frame}>
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <LinearGradient colors={visual.colors} style={styles.fallback}>
          <MaterialCommunityIcons name={visual.icon} size={56} color="rgba(255,255,255,0.16)" />
        </LinearGradient>
      )}

      {canPlay && (
        <TouchableOpacity
          style={styles.tapLayer}
          activeOpacity={0.9}
          onPress={() => setPlaying((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Animasyonu durdur" : "Hareketi oynat"}
        >
          <View style={styles.playCircle}>
            <Feather
              name={playing ? "pause" : "play"}
              size={22}
              color={COLORS.white}
              // Üçgen ikonu optik olarak sola kaçık duruyor, dairenin ortasına
              // oturması için 2px sağa itiliyor.
              style={playing ? undefined : styles.playIcon}
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    frame: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.line,
      // Altındaki ilk bölümün kendi marginTop'u (24) var; buradan 4 eklenince
      // görsel ile 'Nasıl Yapılır' arasında rahat ama abartısız bir boşluk kalıyor.
      marginBottom: 4,
    },
    fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
    // StyleSheet.absoluteFill YAYILAMAZ (RN 0.86 tiplerinde absoluteFillObject
    // yok, absoluteFill de kayıtlı bir stil kimliği); dört kenar elle yazılıyor.
    tapLayer: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    playCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.7)",
      alignItems: "center",
      justifyContent: "center",
    },
    playIcon: { marginLeft: 3 },
  })
);
