/// <reference types="jest" />
import { DROP_RATIO, MIN_SETS_FOR_TREND, SPIKE_RATIO, summarizeVolume, type WeekVolume } from "../volumeLoad";

/** Tamamlanmış hafta. */
const w = (totalSets: number, weekLabel = `h${totalSets}`): WeekVolume => ({ weekLabel, totalSets });

/** İçinde bulunulan (yarım) hafta. */
const now = (totalSets: number): WeekVolume => ({ weekLabel: "bu", totalSets, isCurrent: true });

describe("summarizeVolume", () => {
  it("hiç set yoksa karar vermez", () => {
    const v = summarizeVolume([w(0), w(0), now(0)]);
    expect(v.state).toBe("no-data");
    expect(v.completedWeeks).toBe(0);
    expect(v.averageSets).toBe(0);
    expect(v.advice).toBeNull();
  });

  it("liste boşsa çökmeden boş özet döner", () => {
    expect(summarizeVolume([]).state).toBe("no-data");
  });

  it("tek tamamlanmış haftada karşılaştıracak bir şey yok", () => {
    const v = summarizeVolume([w(12), now(3)]);
    expect(v.state).toBe("no-data");
    expect(v.completedWeeks).toBe(1);
    expect(v.averageSets).toBe(12);
    expect(v.headline).toContain("bir hafta daha");
  });

  it("başlamadan önceki boş haftalar ortalamayı düşürmez", () => {
    // Kullanıcı iki hafta önce başladı; ondan önceki sıfırlar onun değil.
    const v = summarizeVolume([w(0), w(0), w(10), w(14), now(2)]);
    expect(v.completedWeeks).toBe(2);
    expect(v.averageSets).toBe(12);
  });

  it("aradaki boş hafta ortalamaya girer", () => {
    // Başladıktan SONRAKİ boş hafta gerçek bir bilgi: o hafta çalışmamış.
    const v = summarizeVolume([w(12), w(0), w(12), now(0)]);
    expect(v.completedWeeks).toBe(3);
    expect(v.averageSets).toBe(8);
  });

  it("devam eden hafta trende girmez", () => {
    // Bildirilen hata: pazartesi sabahı bu hafta 0 set olduğu için ekran
    // her pazartesi büyük bir eksi trend gösteriyordu.
    const v = summarizeVolume([w(20), w(22), now(0)]);
    expect(v.trend).toBe(2);
    expect(v.state).toBe("building");
    expect(v.currentWeekSets).toBe(0);
  });

  it("devam eden hafta ortalamaya da girmez", () => {
    const v = summarizeVolume([w(20), w(20), now(1)]);
    expect(v.averageSets).toBe(20);
    expect(v.completedWeeks).toBe(2);
  });

  it("devam eden hafta yoksa currentWeekSets null", () => {
    expect(summarizeVolume([w(10), w(12)]).currentWeekSets).toBeNull();
  });

  it("en iyi haftayı etiketiyle bulur", () => {
    const v = summarizeVolume([w(10, "1/9"), w(26, "8/9"), w(18, "15/9")]);
    expect(v.bestSets).toBe(26);
    expect(v.bestWeekLabel).toBe("8/9");
  });

  it("sert artışı sıçrama sayar ve uyarır", () => {
    const v = summarizeVolume([w(10), w(20)]);
    expect(v.state).toBe("spike");
    expect(v.headline).toBe("Hacmin geçen haftaya göre %100 arttı");
    expect(v.advice).toContain("%10-20");
  });

  it("sıçrama eşiği sınırda tetiklenir", () => {
    const previous = 10;
    const v = summarizeVolume([w(previous), w(previous * SPIKE_RATIO)]);
    expect(v.state).toBe("spike");
  });

  it("ölçülü artış sıçrama değil", () => {
    const v = summarizeVolume([w(20), w(23)]);
    expect(v.state).toBe("building");
    expect(v.headline).toBe("Hacmin artıyor · geçen haftaya göre +3 set");
    expect(v.advice).toBeNull();
  });

  it("sert düşüşü işaretler ve dönüşü önerir", () => {
    const v = summarizeVolume([w(20), w(8)]);
    expect(v.state).toBe("dropping");
    expect(v.headline).toBe("Hacmin geçen haftaya göre %60 düştü");
    expect(v.advice).toContain("biraz altından başla");
  });

  it("düşüş eşiği sınırda tetiklenir", () => {
    const previous = 20;
    const v = summarizeVolume([w(previous), w(previous * DROP_RATIO)]);
    expect(v.state).toBe("dropping");
  });

  it("ölçülü düşüşe sabit demez", () => {
    const v = summarizeVolume([w(20), w(17)]);
    expect(v.state).toBe("easing");
    expect(v.headline).toBe("Hacmin azalıyor · geçen haftaya göre -3 set");
    expect(v.advice).toBeNull();
  });

  it("aynı hacim sabittir", () => {
    const v = summarizeVolume([w(15), w(15)]);
    expect(v.state).toBe("steady");
    expect(v.trend).toBe(0);
    expect(v.headline).toBe("Hacmin geçen haftayla aynı");
  });

  it("küçük sayılarda oran yanıltmaz", () => {
    // 1 -> 3 yüzde olarak %200 ama "sıçrama" demek anlamsız.
    const v = summarizeVolume([w(1), w(3)]);
    expect(v.state).toBe("building");
  });

  it("eşiğin üstündeki küçük sayılarda sıçrama yine de görülür", () => {
    const v = summarizeVolume([w(2), w(MIN_SETS_FOR_TREND)]);
    expect(v.state).toBe("spike");
  });

  it("sıfırdan çıkan hafta sıçrama sayılmaz, artış sayılır", () => {
    // Oran hesaplanamaz (sıfıra bölme); ekranda "%Infinity arttı" çıkmamalı.
    const v = summarizeVolume([w(12), w(0), w(9)]);
    expect(v.state).toBe("building");
    expect(v.trend).toBe(9);
  });

  it("sıfıra düşen hafta düşüş sayılır", () => {
    const v = summarizeVolume([w(20), w(0)]);
    expect(v.state).toBe("dropping");
    expect(v.headline).toBe("Hacmin geçen haftaya göre %100 düştü");
  });
});
