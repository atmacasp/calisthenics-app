/// <reference types="jest" />
import { toLocalDateKey, todayLocalKey, todayDayOfWeek } from "../date";

/**
 * Bu dosyanın varlık sebebi gerçek bir hata: seri ve aktivite takvimi UTC gününe
 * göre hesaplanıyordu. UTC+3'te gece 01:00'de yapılan antrenman UTC'de bir önceki
 * güne düşüyor, dolayısıyla seri kırılıyordu. Kural: gün her zaman CİHAZIN yerel
 * takvimine göre belirlenir.
 *
 * Testler saat dilimine bağımsız yazıldı: tarih yerel bileşenlerle kuruluyor ve
 * yine yerel bileşenlerle karşılaştırılıyor.
 */
describe("toLocalDateKey", () => {
  it("gece yapılan antrenman yerel güne yazılır", () => {
    const localMidnightish = new Date(2026, 8, 9, 1, 0, 0); // 9 Eylül 2026, 01:00 yerel
    expect(toLocalDateKey(localMidnightish)).toBe("2026-09-09");
  });

  it("gecenin son saati de aynı yerel güne yazılır", () => {
    const lateNight = new Date(2026, 8, 9, 23, 59, 0);
    expect(toLocalDateKey(lateNight)).toBe("2026-09-09");
  });

  it("gün ortası değişmez", () => {
    expect(toLocalDateKey(new Date(2026, 0, 1, 12, 0, 0))).toBe("2026-01-01");
  });

  it("ISO metin girdisi de kabul eder", () => {
    const iso = new Date(2026, 8, 9, 1, 0, 0).toISOString();
    expect(toLocalDateKey(iso)).toBe("2026-09-09");
  });

  it("todayLocalKey bugünün yerel anahtarını verir", () => {
    expect(todayLocalKey()).toBe(toLocalDateKey(new Date()));
  });
});

describe("todayDayOfWeek", () => {
  // JS: 0=Pazar..6=Cumartesi. Şemamız 1=Pazartesi..7=Pazar.
  it("pazartesi 1 döner", () => {
    expect(todayDayOfWeek(new Date(2026, 8, 7))).toBe(1);
  });

  it("cumartesi 6 döner", () => {
    expect(todayDayOfWeek(new Date(2026, 8, 12))).toBe(6);
  });

  it("pazar 0 değil 7 döner", () => {
    // Dört ayrı kopyada tekrarlanan tek kural buydu; kayması yanlış günü açardı.
    expect(todayDayOfWeek(new Date(2026, 8, 13))).toBe(7);
  });

  it("her gün 1-7 aralığında kalır", () => {
    for (let i = 0; i < 14; i++) {
      const day = todayDayOfWeek(new Date(2026, 8, 1 + i));
      expect(day >= 1 && day <= 7).toBe(true);
    }
  });

  it("argümansız çağrı bugünü kullanır", () => {
    expect(todayDayOfWeek()).toBe(todayDayOfWeek(new Date()));
  });
});
