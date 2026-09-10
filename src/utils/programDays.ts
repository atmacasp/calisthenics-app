/**
 * Program günlerini kaydırma kuralları.
 *
 * Kullanıcı hazır bir programı kopyaladığında genelde şablonu bozmak istemez,
 * sadece haftanın hangi günlerine denk geleceğini seçmek ister. Buradaki
 * fonksiyonlar "kaç gün seçilebilir", "hangi gün nereye gider" sorularını
 * saf olarak cevaplar; veritabanına yazma işi programs.service'te.
 */

export const DAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;

export const DAY_SHORT = ["", "Pzt", "Sal", "Çrş", "Per", "Cum", "Cmt", "Paz"] as const;

/** Eski gün -> yeni gün. */
export type DayRemap = Record<number, number>;

/**
 * Programın antrenman günleri: hareketi olan günler, küçükten büyüğe.
 * Boş günler (dinlenme) hesaba katılmaz - onların taşınacak içeriği yok.
 */
export function getTrainingDays(daysMap: Record<number, unknown[]>): number[] {
  return Object.entries(daysMap)
    .filter(([, list]) => Array.isArray(list) && list.length > 0)
    .map(([day]) => Number(day))
    .filter((day) => day >= 1 && day <= 7)
    .sort((a, b) => a - b);
}

/**
 * Eski günleri yeni günlere eşler.
 *
 * Sıra korunur: iki liste de küçükten büyüğe sıralanıp yan yana konur. Yani
 * Pzt/Çrş/Cuma programında Sal/Per/Cmt seçilirse Pazartesi'nin içeriği Salı'ya,
 * Çarşamba'nınki Perşembe'ye gider. Kullanıcının seçim sırası önemsiz - hangi
 * sırayla dokunduğunu hatırlamak zorunda kalmasın.
 */
export function buildDayRemap(currentDays: number[], nextDays: number[]): DayRemap {
  if (currentDays.length === 0) {
    throw new Error("Programda antrenman günü yok.");
  }
  if (currentDays.length !== nextDays.length) {
    throw new Error(`${currentDays.length} gün seçmelisin.`);
  }
  if (new Set(nextDays).size !== nextDays.length) {
    throw new Error("Aynı gün iki kez seçilemez.");
  }
  if (nextDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new Error("Gün 1-7 aralığında olmalı.");
  }

  const from = [...currentDays].sort((a, b) => a - b);
  const to = [...nextDays].sort((a, b) => a - b);

  const remap: DayRemap = {};
  from.forEach((day, index) => {
    remap[day] = to[index];
  });
  return remap;
}

/** Hiçbir gün değişmiyorsa true - "Kaydet" butonunu pasif tutmak için. */
export function isNoopRemap(remap: DayRemap): boolean {
  return Object.entries(remap).every(([from, to]) => Number(from) === to);
}

/** Kullanıcıya gösterilecek "Pazartesi → Salı" satırları; değişmeyen günler atlanır. */
export function describeRemap(remap: DayRemap): string[] {
  return Object.entries(remap)
    .map(([from, to]) => ({ from: Number(from), to }))
    .filter((row) => row.from !== row.to)
    .sort((a, b) => a.from - b.from)
    .map((row) => `${DAY_NAMES[row.from]} → ${DAY_NAMES[row.to]}`);
}
