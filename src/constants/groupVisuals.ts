import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Kategori kartlarının görsel kimliği.
 *
 * Kartın üst yarısı fotoğraf gösterir (movement_groups.image_url). Fotoğraf
 * henüz yoksa - ki şu an hiçbirinde yok - kart boş kutu gibi durmasın diye
 * buradaki renk geçişi ve ikon devreye giriyor. image_url dolduğu anda kod
 * değişmeden fotoğrafa geçiyor; bu tablo o zaman da yedek olarak kalıyor
 * (görsel yüklenemezse geri düşülecek yer).
 *
 * Kimliği asıl taşıyan RENK: ikon seti jenerik, her kategoriye tam oturan bir
 * piktogram yok. Renkler koyu ve mat seçildi çünkü üstlerine beyaz başlık
 * biniyor ve kartın altındaki geçişte zemine erimeleri gerekiyor.
 */
export interface GroupVisual {
  /** Tip, ikon setinin gerçek isim birleşimi - olmayan bir ad yazılırsa typecheck yakalar. */
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Yukarıdan aşağıya renk geçişi. */
  colors: [string, string];
}

const DEFAULT_VISUAL: GroupVisual = { icon: "dumbbell", colors: ["#2F3E4A", "#1B242B"] };

const VISUALS: Record<string, GroupVisual> = {
  foundation: { icon: "arm-flex", colors: ["#1E3A34", "#14262B"] },
  handstand: { icon: "human-handsup", colors: ["#2A2F55", "#171B33"] },
  hspu: { icon: "weight-lifter", colors: ["#3A2A4E", "#20172E"] },
  "l-sit": { icon: "yoga", colors: ["#1E3348", "#132231"] },
  "muscle-up": { icon: "kettlebell", colors: ["#4A2E27", "#2B1A16"] },
  "back-lever": { icon: "human", colors: ["#26402C", "#16261A"] },
  "front-lever": { icon: "rowing", colors: ["#2F3E4A", "#1B242B"] },
  planche: { icon: "karate", colors: ["#4A3A22", "#2B2114"] },
  "pistol-squat": { icon: "run", colors: ["#3F2740", "#251726"] },
  "one-arm-pushup": { icon: "dumbbell", colors: ["#243F45", "#152629"] },
  "one-arm-pullup": { icon: "arm-flex-outline", colors: ["#402A32", "#26181D"] },
};

export function groupVisual(slug?: string | null): GroupVisual {
  return (slug && VISUALS[slug]) || DEFAULT_VISUAL;
}
