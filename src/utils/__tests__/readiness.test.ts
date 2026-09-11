/// <reference types="jest" />
import {
  NEAR_TARGET_RATIO,
  STALL_WINDOW,
  analyzeReadiness,
  compareSessions,
  scoreSession,
  type ReadinessInput,
  type ReadinessSession,
} from "../readiness";

let counter = 0;
/** Tekrarlı bir antrenman: verilen tekrarlarla setler. */
const s = (...reps: number[]): ReadinessSession => ({
  sessionId: `s${counter++}`,
  date: "2026-09-01",
  sets: reps.map((r) => ({ reps: r })),
});

/** Tutuşlu antrenman. */
const h = (...seconds: number[]): ReadinessSession => ({
  sessionId: `h${counter++}`,
  date: "2026-09-01",
  sets: seconds.map((d) => ({ duration_seconds: d })),
});

/** 3 set x 10 tekrar hedefi. */
const reps3x10 = (sessions: ReadinessSession[]): ReadinessInput => ({
  targetType: "reps_sets",
  targetSets: 3,
  targetReps: 10,
  targetDurationSeconds: null,
  sessions,
});

/** 60 saniye tutuş hedefi. */
const hold60 = (sessions: ReadinessSession[]): ReadinessInput => ({
  targetType: "duration",
  targetSets: null,
  targetReps: null,
  targetDurationSeconds: 60,
  sessions,
});

/** Hedefi olmayan hareket. */
const noTarget = (sessions: ReadinessSession[]): ReadinessInput => ({ sessions });

describe("scoreSession", () => {
  it("tutan set, en iyi set ve hacmi ayrı ayrı sayar", () => {
    expect(scoreSession(reps3x10([]), s(10, 8, 12))).toEqual({
      qualifiedSets: 2,
      bestValue: 12,
      totalValue: 30,
    });
  });

  it("boş antrenman sıfır", () => {
    expect(scoreSession(reps3x10([]), s())).toEqual({ qualifiedSets: 0, bestValue: 0, totalValue: 0 });
  });

  it("tutuşta saniyeye bakar", () => {
    expect(scoreSession(hold60([]), h(30, 45))).toEqual({ qualifiedSets: 0, bestValue: 45, totalValue: 75 });
  });

  it("hedefi olmayan harekette tutan set sayılmaz ama en iyi set bilinir", () => {
    expect(scoreSession(noTarget([]), s(6, 9))).toEqual({ qualifiedSets: 0, bestValue: 9, totalValue: 15 });
  });
});

describe("compareSessions", () => {
  const score = (qualifiedSets: number, bestValue: number) => ({ qualifiedSets, bestValue, totalValue: 0 });

  it("tutan set sayısı önce gelir", () => {
    // 8/7/6 -> 8/8/7: en iyi set aynı ama hedefe bir set daha yaklaşıldı.
    expect(compareSessions(score(2, 8), score(1, 8))).toBeGreaterThan(0);
  });

  it("tutan set eşitse en iyi sete bakar", () => {
    expect(compareSessions(score(1, 12), score(1, 9))).toBeGreaterThan(0);
  });

  it("daha az tutan set, daha yüksek tek sete rağmen düşüştür", () => {
    expect(compareSessions(score(0, 14), score(2, 10))).toBeLessThan(0);
  });

  it("aynı skorlar eşit", () => {
    expect(compareSessions(score(1, 8), score(1, 8))).toBe(0);
  });
});

describe("analyzeReadiness", () => {
  it("hiç antrenman yoksa sessiz kalır", () => {
    const v = analyzeReadiness(reps3x10([]));
    expect(v.state).toBe("insufficient-data");
    expect(v.headline).toBe("Henüz bu hareketi çalışmadın");
    expect(v.advice).toBeNull();
  });

  it("pencere dolmadan karar vermez ve kaç antrenman gerektiğini söyler", () => {
    const v = analyzeReadiness(reps3x10([s(6, 5), s(7, 5)]));
    expect(v.state).toBe("insufficient-data");
    expect(v.sessionsUsed).toBe(2);
    expect(v.detail).toContain("1 antrenman daha");
  });

  it("hedef bir kez tutmuşsa saplanma aramaz", () => {
    // Kilit motoruyla aynı kural: aynı antrenmanda 3 set x 10.
    const v = analyzeReadiness(reps3x10([s(10, 10, 10), s(9, 9, 9), s(9, 9, 9)]));
    expect(v.state).toBe("target-met");
    expect(v.headline).toBe("Hedefi tamamladın");
    expect(v.advice).toBeNull();
  });

  it("eski bir antrenmanda tutmuş olması da yeter", () => {
    const v = analyzeReadiness(hold60([h(60), h(40), h(35)]));
    expect(v.state).toBe("target-met");
  });

  it("yükselen setlerde ilerleme der", () => {
    const v = analyzeReadiness(reps3x10([s(5, 4), s(6, 5), s(8, 6)]));
    expect(v.state).toBe("progressing");
    expect(v.detail).toBe(`Son ${STALL_WINDOW} antrenmanda 5 → 8 tekrar.`);
    expect(v.advice).toBeNull();
  });

  it("en iyi set değişmese de tutan set artmışsa ilerlemedir", () => {
    // Bildirilen tuzak: "8 → 8 tekrar" yazıp ilerleme demek kendini yalanlardı.
    const v = analyzeReadiness(reps3x10([s(10, 8, 6), s(10, 9, 7), s(10, 10, 7)]));
    expect(v.state).toBe("progressing");
    expect(v.detail).toBe(`Son ${STALL_WINDOW} antrenmanda Hedefi tutan set: 1 → 2.`);
  });

  it("pencere dışındaki eski antrenmanlar kararı değiştirmez", () => {
    // İlk antrenman çok kötü ama pencereye girmiyor; son üçü sabit -> saplanma.
    const v = analyzeReadiness(reps3x10([s(1), s(7, 6), s(7, 6), s(7, 6)]));
    expect(v.state).toBe("stalled");
    expect(v.sessionsUsed).toBe(STALL_WINDOW);
  });

  it("kıpırdamayan setlerde saplanma der ve öneri verir", () => {
    const v = analyzeReadiness(reps3x10([s(7, 6), s(7, 6), s(7, 6)]));
    expect(v.state).toBe("stalled");
    expect(v.headline).toBe(`${STALL_WINDOW} antrenmandır aynı yerdesin`);
    expect(v.detail).toBe("En iyi setin 7 tekrar olarak duruyor.");
    expect(v.advice).toBeTruthy();
  });

  it("hedefe yakın saplanmada dinlenmeyi uzatmayı önerir", () => {
    // 9/10 = 0.9, eşiğin üstünde.
    const v = analyzeReadiness(reps3x10([s(9, 8), s(9, 8), s(9, 8)]));
    expect(v.state).toBe("stalled");
    expect(v.advice).toContain("Setler arası dinlenmeyi uzat");
  });

  it("orta mesafede hacim/tempo önerir", () => {
    // 6/10 = 0.6: yakın değil ama basamak da imkansız değil.
    const v = analyzeReadiness(reps3x10([s(6, 5), s(6, 5), s(6, 5)]));
    expect(v.advice).toContain("hacmi artır");
  });

  it("hedefin çok altında ön koşula dönmeyi önerir", () => {
    // 3/10 = 0.3.
    const v = analyzeReadiness(reps3x10([s(3, 2), s(3, 2), s(3, 2)]));
    expect(v.advice).toContain("Ön koşula");
  });

  it("eşik değeri sınırda yakın sayılır", () => {
    const target = 10;
    const atThreshold = Math.round(target * NEAR_TARGET_RATIO);
    const v = analyzeReadiness(reps3x10([s(atThreshold), s(atThreshold), s(atThreshold)]));
    expect(v.advice).toContain("çok yakınsın");
  });

  it("düşüşte yorgunluğu işaret eder, ön koşula göndermez", () => {
    const v = analyzeReadiness(reps3x10([s(9, 8), s(8, 7), s(6, 5)]));
    expect(v.state).toBe("regressing");
    expect(v.detail).toBe("9 → 6 tekrar.");
    expect(v.advice).toContain("yorgunluk");
  });

  it("tutuşta saplanma da anlaşılır", () => {
    const v = analyzeReadiness(hold60([h(40), h(40), h(40)]));
    expect(v.state).toBe("stalled");
    expect(v.detail).toBe("En iyi setin 40 saniye olarak duruyor.");
  });

  it("hedefi olmayan harekette de saplanma görülür, öneri geneldir", () => {
    const v = analyzeReadiness(noTarget([s(12), s(12), s(12)]));
    expect(v.state).toBe("stalled");
    expect(v.advice).toContain("hacmi artır");
  });

  it("hedefi olmayan harekette ilerleme de görülür", () => {
    const v = analyzeReadiness(noTarget([s(8), s(10), s(13)]));
    expect(v.state).toBe("progressing");
  });
});
