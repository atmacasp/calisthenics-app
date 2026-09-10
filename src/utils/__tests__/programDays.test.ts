/// <reference types="jest" />
import { buildDayRemap, describeRemap, getTrainingDays, isNoopRemap } from "../programDays";

describe("getTrainingDays", () => {
  it("hareketi olan günleri sıralı döner", () => {
    expect(getTrainingDays({ 5: [{}], 1: [{}, {}], 3: [{}] })).toEqual([1, 3, 5]);
  });

  it("boş günleri (dinlenme) saymaz", () => {
    expect(getTrainingDays({ 1: [{}], 2: [], 4: [{}] })).toEqual([1, 4]);
  });

  it("hiç hareketi olmayan programda boş dizi döner", () => {
    expect(getTrainingDays({})).toEqual([]);
  });
});

describe("buildDayRemap", () => {
  it("günleri sıra koruyarak eşler", () => {
    expect(buildDayRemap([1, 3, 5], [2, 4, 6])).toEqual({ 1: 2, 3: 4, 5: 6 });
  });

  it("seçim sırası önemsizdir, her iki liste de sıralanır", () => {
    expect(buildDayRemap([5, 1, 3], [6, 2, 4])).toEqual({ 1: 2, 3: 4, 5: 6 });
  });

  it("günler kesişse bile doğru eşler (kaydırma zincirleme değil)", () => {
    // Pzt/Çrş/Cuma -> Çrş/Cuma/Cmt: 3 ve 5 hem kaynakta hem hedefte var.
    expect(buildDayRemap([1, 3, 5], [3, 5, 6])).toEqual({ 1: 3, 3: 5, 5: 6 });
  });

  it("gün sayısı farklıysa reddeder", () => {
    expect(() => buildDayRemap([1, 3, 5], [2, 4])).toThrow("3 gün seçmelisin.");
  });

  it("aynı gün iki kez seçilirse reddeder", () => {
    expect(() => buildDayRemap([1, 3], [2, 2])).toThrow("Aynı gün iki kez seçilemez.");
  });

  it("1-7 dışındaki günü reddeder", () => {
    expect(() => buildDayRemap([1, 3], [0, 4])).toThrow("Gün 1-7 aralığında olmalı.");
    expect(() => buildDayRemap([1, 3], [2, 8])).toThrow("Gün 1-7 aralığında olmalı.");
  });

  it("antrenman günü olmayan programı reddeder", () => {
    expect(() => buildDayRemap([], [])).toThrow("Programda antrenman günü yok.");
  });
});

describe("isNoopRemap", () => {
  it("hiçbir gün değişmiyorsa true", () => {
    expect(isNoopRemap({ 1: 1, 3: 3, 5: 5 })).toBe(true);
  });

  it("tek gün bile değişse false", () => {
    expect(isNoopRemap({ 1: 1, 3: 3, 5: 6 })).toBe(false);
  });
});

describe("describeRemap", () => {
  it("sadece değişen günleri okunur biçimde listeler", () => {
    expect(describeRemap({ 1: 2, 3: 3, 5: 6 })).toEqual(["Pazartesi → Salı", "Cuma → Cumartesi"]);
  });

  it("değişiklik yoksa boş dizi", () => {
    expect(describeRemap({ 1: 1 })).toEqual([]);
  });
});
