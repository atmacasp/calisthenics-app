import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Tab bar'ın içerik yüksekliği (güvenli alan hariç).
 * (tabs)/_layout.tsx bunu güvenli alanla toplayıp bar yüksekliği olarak kullanıyor.
 */
export const TAB_BAR_HEIGHT = 62;

/**
 * Sekme ekranlarının kaydırma içeriğine verilmesi gereken alt boşluk.
 *
 * Tab bar artık `position: absolute` - içerik altından geçsin ki blur'un
 * bulanıklaştıracak bir şeyi olsun. Bunun bedeli, her sekme ekranının son
 * satırının bar arkasında kalmaması için kendi alt boşluğunu ayırması.
 * Tek yerden hesaplanıyor ki cihazdan cihaza değişen jest çubuğu payı
 * beş ekranda ayrı ayrı elle yazılmasın.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + 16;
}
