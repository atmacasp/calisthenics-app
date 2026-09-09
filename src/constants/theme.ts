import { useColorScheme } from "react-native";
import { useThemeStore } from "../store/themeStore";

/**
 * Renkler ROLE göre isimlendirilir, tona göre değil.
 *
 * Eskiden "ink" hem birincil metin hem de koyu yüzeylerin zeminiydi; "white" ise
 * hem kart zemini hem de yeşil butonun üstündeki yazıydı. Açık temada bu ikisi
 * çakışmıyordu, ama koyu temada yönleri terstir: metin açılmalı, yüzey
 * koyulaşmalı. Tek bir token ikisini birden yapamaz, o yüzden roller ayrıldı.
 */
export interface ThemeColors {
  /** Birincil metin */
  ink: string;
  /** İkincil metin, açıklama, pasif ikon */
  graphite: string;
  /** Sayfa zemini ve kart içindeki girintili alanlar (input, çip) */
  paper: string;
  /** Kart yüzeyi */
  surface: string;
  /** Kenarlık, ayraç, ilerleme çubuğunun boş kısmı */
  line: string;
  /** Marka yeşili - her iki temada aynı */
  accent: string;
  /** accent ya da inverse üstündeki metin ve ikon */
  onAccent: string;
  /** Vurgulu koyu yüzey: seri kartı, özet hero'su, birincil buton, aktif antrenman bandı */
  inverse: string;
  /** inverse üstündeki metin */
  onInverse: string;
  /** Yıkıcı eylem (sil, uyarı) */
  warn: string;
  /** Kart golgesi - koyu temada ink acildigi icin ayri tutuluyor */
  shadow: string;
  /** Her iki temada da saf beyaz - Switch topuzu gibi tema dışı yerler için */
  white: string;
}

export const LIGHT: ThemeColors = {
  ink: "#12171B",
  graphite: "#5B6470",
  paper: "#FAF9F6",
  surface: "#FFFFFF",
  line: "#E5E2DC",
  accent: "#22c55e",
  onAccent: "#FFFFFF",
  inverse: "#12171B",
  onInverse: "#FAF9F6",
  warn: "#dc2626",
  shadow: "#12171B",
  white: "#FFFFFF",
};

/**
 * Koyu palet. inverse açık temada "neredeyse siyah", koyu temada ise sayfadan
 * BİR TON AÇIK bir yüzeydir - iki temada da "zeminden ayrışan vurgulu kart"
 * anlamını korur, sadece hangi yöne ayrıştığı değişir.
 */
export const DARK: ThemeColors = {
  ink: "#ECEFF1",
  graphite: "#99A3AE",
  paper: "#10151A",
  surface: "#191F25",
  line: "#2A323A",
  accent: "#22c55e",
  onAccent: "#FFFFFF",
  inverse: "#262E36",
  onInverse: "#ECEFF1",
  warn: "#f87171",
  shadow: "#000000",
  white: "#FFFFFF",
};

/**
 * Modül seviyesinde (bileşen dışında) renk gerektiren yerler için sabit açık
 * palet. Ekranlar useColors() kullanır; bu export geriye dönük uyumluluk ve
 * hook çağıramayan yardımcılar içindir.
 */
export const COLORS = LIGHT;

/** Kullanıcının tercihi + cihazın sistem ayarından çözülmüş tema. */
export function useResolvedScheme(): "light" | "dark" {
  const preference = useThemeStore((s) => s.preference);
  const system = useColorScheme();
  if (preference === "system") return system === "dark" ? "dark" : "light";
  return preference;
}

/** Ekranların kullandığı canlı palet. */
export function useColors(): ThemeColors {
  return useResolvedScheme() === "dark" ? DARK : LIGHT;
}

/**
 * Stil sayfasını palete göre üretir ve önbelleğe alır.
 *
 * StyleSheet.create modül yüklenirken bir kez çalışır ve renkleri o anda
 * kopyalar; bu yüzden tema değişince eski renkler ekranda kalırdı. Stilleri bir
 * fabrikaya alıp paletle çağırınca sorun biter. Uygulamada yalnızca iki palet
 * nesnesi var (LIGHT ve DARK) ve ikisi de sabit referans, dolayısıyla önbellek
 * en fazla iki giriş tutar ve her render'da yeniden üretim olmaz.
 *
 * Fabrikanın parametresine bilerek COLORS adı veriliyor: stil bloklarındaki
 * yüzlerce COLORS.x referansı olduğu gibi kalıyor, sadece kapsamı değişiyor.
 */
export function themedStyles<T>(factory: (colors: ThemeColors) => T): (colors: ThemeColors) => T {
  const cache = new Map<ThemeColors, T>();
  return (colors) => {
    let value = cache.get(colors);
    if (!value) {
      value = factory(colors);
      cache.set(colors, value);
    }
    return value;
  };
}
