/// <reference types="jest" />
import { toLocalDateKey, todayLocalKey } from "../date";

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
