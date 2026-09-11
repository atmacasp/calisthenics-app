import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Vibration } from "react-native";
import { useEffect, useRef, useState } from "react";
import { themedStyles, useColors, type ThemeColors } from "../constants/theme";

export interface RestRequest {
  /**
   * Her yeni set için artan sayaç.
   *
   * Süre tek başına yetmiyor: arka arkaya iki set aynı 60 saniyeyi isteyince
   * prop değişmediği için bant yeniden düşmezdi. Bandı tetikleyen bu sayaç.
   */
  token: number;
  seconds: number;
  /** "Şınav · 3. set" - dinlenme bitince ne yapılacağı. */
  upNext: string | null;
  /** Süre neden standart değil; standartsa null. */
  note: string | null;
}

interface RestBannerProps {
  request: RestRequest | null;
  /** Bandın ekran dışından düşebilmesi için üstündeki başlığın yüksekliği. */
  headerHeight: number;
}

/**
 * Setler arası dinlenme bandı.
 *
 * Sayaç, titreşim ve düşme animasyonu bir arada, çünkü üçü de aynı olayın
 * parçası. Aktif antrenman ekranında bunlar dağınık haldeydi: yedi ayrı state,
 * üç useEffect ve 60 satır interpolasyon ekranın en üstünü tutuyordu.
 *
 * Süreyi bu bileşen HESAPLAMIYOR - sadece gösteriyor. "Kaç saniye ve sırada ne
 * var" kararı sessionFlow.restPlanFor'da, testli.
 */
export function RestBanner({ request, headerHeight }: RestBannerProps) {
  const COLORS = useColors();
  const styles = getStyles(COLORS);

  const [left, setLeft] = useState(0);
  // Kalan süre çubuğunun paydası: dinlenme kaç saniyeyle başladı.
  const [total, setTotal] = useState(1);
  // Bant, süre sıfırlanınca hemen kaldırılmıyor; kapanış animasyonu bitince kalkıyor.
  const [visible, setVisible] = useState(false);
  // scaleY merkezden büyür; üst kenarı sabit tutmak için bandın yüksekliği ölçülüyor.
  const [height, setHeight] = useState(64);
  const [copy, setCopy] = useState<{ upNext: string | null; note: string | null }>({ upNext: null, note: null });

  const anim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<any>(null);
  // Sayaç kendiliğinden mi bitti, kullanıcı mı atladı - titreşim için ayırt ediliyor.
  const wasRunning = useRef(false);

  // Yeni bir dinlenme isteği geldiğinde sayacı baştan kur. Metni burada
  // kopyalıyoruz: bant kapanırken request değişse bile yazı zıplamasın.
  useEffect(() => {
    if (!request || request.seconds <= 0) return;
    setTotal(request.seconds);
    setLeft(request.seconds);
    setCopy({ upNext: request.upNext, note: request.note });
  }, [request?.token]);

  useEffect(() => {
    if (left <= 0) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [left > 0]);

  // Dinlenme dolduğunda titret: telefon yerdeyken sessiz bir sayacın faydası yok.
  // "Atla" ile kesildiğinde titretmiyoruz - kullanıcı zaten kasten bitirdi.
  useEffect(() => {
    if (left > 0) {
      wasRunning.current = true;
      return;
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      Vibration.vibrate([0, 300, 150, 300]);
    }
  }, [left]);

  // Bildirim ekranın üstünden küçük başlar, aşağı inerken büyür, yere değince
  // balon gibi ezilip toparlanır. Tek sürücü (anim) var; "damla" hissi ayrı
  // yaylardan değil, aşağıdaki ölçek eğrisinin tepe/çukur noktalarından geliyor -
  // yayla yapılamazdı, çünkü yay ölçeği 1'in altına indirip geri getiremez.
  useEffect(() => {
    if (left > 0) {
      setVisible(true);
      anim.setValue(0);
      Animated.sequence([
        // 1) HIZLI FAZ: tepeden dar bir damla olarak düşerken kendi pencere
        //    boyutuna kadar büyür. Kasten çok kısa; hızlanan easing ile bitiyor.
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // 2) AĞIR ÇEKİM: boyut tamamlandığı anda hız düşer. Kalan iniş, çarpma
        //    ve sekme bu fazda. Doğrusal - hızın sabit kalması, birinci fazla
        //    arasındaki kırılmayı belirginleştiriyor.
        Animated.timing(anim, {
          toValue: 1,
          duration: 760,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [left > 0]);

  if (!visible) return null;

  const skip = () => {
    wasRunning.current = false;
    setLeft(0);
  };

  const addTime = () => {
    setTotal((t) => t + 30);
    setLeft((s) => s + 30);
  };

  // Bant kendi yüksekliği + başlık + çentik kadar yukarıdan, yani ekran dışından düşer.
  const dropFrom = -(headerHeight + height + 24);

  return (
    <Animated.View
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={[
        styles.banner,
        { top: headerHeight + 8 },
        {
          opacity: anim.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] }),
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 0.15, 0.3, 0.52, 0.62, 0.78, 0.9, 1],
                outputRange: [dropFrom, dropFrom * 0.55, dropFrom * 0.18, 12, 6, -10, 3, 0],
              }),
            },
            {
              scaleY: anim.interpolate({
                inputRange: [0, 0.15, 0.3, 0.52, 0.62, 0.78, 0.9, 1],
                outputRange: [0.5, 0.72, 1, 1.02, 0.82, 1.08, 0.97, 1],
              }),
            },
            {
              scaleX: anim.interpolate({
                inputRange: [0, 0.15, 0.3, 0.52, 0.62, 0.78, 0.9, 1],
                outputRange: [0.12, 0.55, 1, 1, 1.14, 0.95, 1.02, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, (left / Math.max(1, total)) * 100))}%` }]} />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.time}>Dinlenme: {left}s</Text>
          {copy.upNext && (
            <Text style={styles.upNext} numberOfLines={1}>
              SIRADA · {copy.upNext}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={addTime} hitSlop={8}>
            <Text style={styles.action}>+30 sn</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={skip} hitSlop={8}>
            <Text style={styles.action}>Atla</Text>
          </TouchableOpacity>
        </View>
      </View>

      {copy.note && <Text style={styles.note}>{copy.note}</Text>}
    </Animated.View>
  );
}

const getStyles = themedStyles((COLORS: ThemeColors) =>
  StyleSheet.create({
    banner: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 20,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
      backgroundColor: COLORS.inverse,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    time: { color: COLORS.onAccent, fontFamily: "Inter_700Bold", fontSize: 14 },
    upNext: {
      color: COLORS.onAccent,
      opacity: 0.7,
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      letterSpacing: 0.6,
      marginTop: 2,
    },
    actions: { flexDirection: "row", alignItems: "center", gap: 18 },
    action: { color: COLORS.accent, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    note: {
      color: COLORS.accent,
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      marginTop: 8,
    },
    track: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(250,249,246,0.15)" },
    fill: { height: 3, backgroundColor: COLORS.accent },
  })
);
