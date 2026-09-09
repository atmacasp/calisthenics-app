/**
 * Bir anı, CİHAZIN YEREL gününe göre YYYY-MM-DD anahtarına çevirir.
 *
 * Neden gerekli: new Date().toISOString() UTC verir. UTC+3'te gece 01:30'da
 * yapılan bir antrenman UTC'de hâlâ bir önceki gündedir; anahtar UTC'den
 * üretilirse seri, haftalık nokta sırası ve ısı haritası bir gün kayar.
 * Takvim kullanıcının yaşadığı gün olmalı, sunucunun değil.
 */
export function toLocalDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

/** Bugünün yerel tarih anahtarı (YYYY-MM-DD). */
export function todayLocalKey(): string {
  return toLocalDateKey(new Date());
}
