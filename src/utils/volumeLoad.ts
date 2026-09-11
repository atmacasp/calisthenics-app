/**
 * Haftalık hacmin yorumu.
 *
 * İlerleme sekmesi haftalık set sayılarını çubuk olarak çiziyordu; ortalama,
 * en iyi hafta ve "trend" hesapları ekranın içinde, testsiz duruyordu. Bu modül
 * o hesapları devralıp üstüne bir şey ekliyor: sayının ne ANLAMA geldiği.
 *
 * DEVAM EDEN HAFTA AYRI TUTULUYOR - bu bir düzeltme, tercih değil.
 * Ekran trendi son iki haftanın farkı olarak hesaplıyordu ve son hafta İÇİNDE
 * BULUNULAN haftaydı. Pazartesi sabahı o hafta 0 set olduğu için trend her
 * pazartesi büyük bir eksi gösteriyordu; kullanıcı düzenli çalışsa bile.
 * Ortalama da aynı şekilde yarım haftayla aşağı çekiliyordu.
 *
 * Eşikler (sıçrama/düşüş oranları) sezgisel ve isimli; "haftada %10-20 artış"
 * yaygın bir antrenman kuralıdır, burada da tavsiye o yönde.
 */

/** Bu oranın üstündeki haftalık artış "sıçrama" sayılıyor. */
export const SPIKE_RATIO = 1.5;

/** Bu oranın altına düşen hafta "düşüş" sayılıyor. */
export const DROP_RATIO = 0.6;

/** Sıçrama/düşüş kararı için haftanın en az bu kadar seti olmalı - 1 setten 3 sete çıkmak "sıçrama" değil. */
export const MIN_SETS_FOR_TREND = 4;

export interface WeekVolume {
  weekLabel: string;
  totalSets: number;
  /** İçinde bulunulan hafta - yarım olduğu için karara girmiyor. */
  isCurrent?: boolean;
}

export type VolumeState =
  /** Karar verecek kadar tamamlanmış hafta yok. */
  | "no-data"
  /** Hacim ölçülü artıyor. */
  | "building"
  /** Hacim kayda değer değişmiyor. */
  | "steady"
  /** Hacim ölçülü azalıyor - sorun değil, bilgi. */
  | "easing"
  /** Hacim bir haftada sert arttı. */
  | "spike"
  /** Hacim belirgin düştü. */
  | "dropping";

export interface VolumeSummary {
  /** Karara giren TAMAMLANMIŞ hafta sayısı. */
  completedWeeks: number;
  /** Tamamlanmış haftaların ortalaması (yuvarlanmış). */
  averageSets: number;
  bestSets: number;
  bestWeekLabel: string | null;
  /** Son iki TAMAMLANMIŞ hafta arasındaki fark; hesaplanamıyorsa 0. */
  trend: number;
  /** İçinde bulunulan haftada şimdiye kadar girilen set; hafta yoksa null. */
  currentWeekSets: number | null;
  state: VolumeState;
  headline: string;
  /** Durum bir şey öneriyorsa; yoksa null. */
  advice: string | null;
}

function roundPercent(from: number, to: number): number {
  if (from <= 0) return 0;
  return Math.round(((to - from) / from) * 100);
}

/**
 * Haftalık set serisini özetler ve yorumlar.
 *
 * Seri ESKİDEN YENİYE sıralı beklenir (getWeeklyVolume böyle döndürüyor).
 * Serinin başındaki, kullanıcının henüz çalışmadığı sıfır haftalar ortalamayı
 * haksız yere düşürmesin diye İLK setten öncesi atılıyor.
 */
export function summarizeVolume(weeks: WeekVolume[]): VolumeSummary {
  const completed = weeks.filter((w) => !w.isCurrent);
  const current = weeks.find((w) => w.isCurrent);
  const currentWeekSets = current ? current.totalSets : null;

  // Kullanıcı üç hafta önce başladıysa ondan önceki boş haftalar onun değil.
  const firstActive = completed.findIndex((w) => w.totalSets > 0);
  const active = firstActive === -1 ? [] : completed.slice(firstActive);

  const empty: VolumeSummary = {
    completedWeeks: 0,
    averageSets: 0,
    bestSets: 0,
    bestWeekLabel: null,
    trend: 0,
    currentWeekSets,
    state: "no-data",
    headline: "Hacmini ölçmek için birkaç hafta gerek",
    advice: null,
  };

  if (active.length === 0) return empty;

  const totals = active.map((w) => w.totalSets);
  const bestSets = Math.max(...totals);
  const best = active.find((w) => w.totalSets === bestSets) ?? null;
  const averageSets = Math.round(totals.reduce((sum, n) => sum + n, 0) / active.length);

  const base: VolumeSummary = {
    completedWeeks: active.length,
    averageSets,
    bestSets,
    bestWeekLabel: best ? best.weekLabel : null,
    trend: 0,
    currentWeekSets,
    state: "no-data",
    headline: "Hacmini ölçmek için birkaç hafta gerek",
    advice: null,
  };

  if (active.length < 2) {
    return { ...base, headline: "İlk haftan kayıtta, karşılaştırmak için bir hafta daha gerek" };
  }

  const previous = active[active.length - 2].totalSets;
  const last = active[active.length - 1].totalSets;
  const trend = last - previous;
  const percent = roundPercent(previous, last);

  // Küçük sayılarda oran yanıltıcı: 2 setten 4 sete çıkmak %100 artış ama
  // "sıçrama" demek anlamsız. Eşiğin altında kalan haftalar sade raporlanıyor.
  const bigEnough = Math.max(previous, last) >= MIN_SETS_FOR_TREND;

  if (bigEnough && previous > 0 && last >= previous * SPIKE_RATIO) {
    return {
      ...base,
      trend,
      state: "spike",
      headline: `Hacmin geçen haftaya göre %${percent} arttı`,
      advice: "Sert sıçramalar sakatlık riskini artırır. Artışı haftada %10-20 bandında tutmak daha güvenli.",
    };
  }

  if (bigEnough && previous > 0 && last <= previous * DROP_RATIO) {
    return {
      ...base,
      trend,
      state: "dropping",
      headline: `Hacmin geçen haftaya göre %${Math.abs(percent)} düştü`,
      advice: "Ara vermek normal. Dönerken geçen haftanın biraz altından başla, üstünden değil.",
    };
  }

  if (trend > 0) {
    return {
      ...base,
      trend,
      state: "building",
      headline: `Hacmin artıyor · geçen haftaya göre +${trend} set`,
      advice: null,
    };
  }

  if (trend < 0) {
    // Ölçülü düşüş "sabit" değil; öyle demek ekranı yalancı yapardı.
    return {
      ...base,
      trend,
      state: "easing",
      headline: `Hacmin azalıyor · geçen haftaya göre ${trend} set`,
      advice: null,
    };
  }

  return {
    ...base,
    trend,
    state: "steady",
    headline: "Hacmin geçen haftayla aynı",
    advice: null,
  };
}
