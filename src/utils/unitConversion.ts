// Kullanıcı imperial seçerse: boy = inç, kilo = lb olarak girilir, cm/kg'a çevrilir.
export function toMetricHeight(value: number, unit: "metric" | "imperial") {
  return unit === "imperial" ? Math.round(value * 2.54 * 10) / 10 : value;
}

export function toMetricWeight(value: number, unit: "metric" | "imperial") {
  return unit === "imperial" ? Math.round(value * 0.453592 * 10) / 10 : value;
}
