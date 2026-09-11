/// <reference types="jest" />
import {
  buildSetPlan,
  countQualifyingSets,
  lastSetFeedback,
  setKindOf,
  setValueRatio,
  type CoachMovement,
} from "../setCoach";

const repsMovement = (sets: CoachMovement["sets"], over: Partial<CoachMovement> = {}): CoachMovement => ({
  targetType: "reps_sets",
  targetSets: 3,
  targetReps: 15,
  targetDurationSeconds: null,
  sets,
  ...over,
});

const durationMovement = (sets: CoachMovement["sets"], over: Partial<CoachMovement> = {}): CoachMovement => ({
  targetType: "duration",
  targetSets: null,
  targetReps: null,
  targetDurationSeconds: 45,
  sets,
  ...over,
});

const reps = (...values: number[]) => values.map((reps) => ({ reps }));
const holds = (...values: number[]) => values.map((duration_seconds) => ({ duration_seconds }));

describe("setKindOf", () => {
  it("duration hedefini süre olarak tanır", () => {
    expect(setKindOf(durationMovement([]))).toBe("duration");
  });

  it("hedefi olmayan hareket tekrar sayılır", () => {
    expect(setKindOf({ sets: [] })).toBe("reps");
  });
});

describe("countQualifyingSets", () => {
  // Hedefin tanımı: her biri hedef tekrara ULAŞAN set sayısı. Toplam tekrar değil.
  it("hedefin altındaki setleri saymaz", () => {
    expect(countQualifyingSets(repsMovement(reps(15, 12, 15)))).toBe(2);
  });

  it("hedefi geçen set de sayılır", () => {
    expect(countQualifyingSets(repsMovement(reps(18, 15)))).toBe(2);
  });

  it("toplam tekrar yeterli olsa bile tutmayan setler sayılmaz", () => {
    // 8+7+9 = 24 ama hiçbiri 15 değil; eski motor bunu "3 set oldu" sanıyordu.
    expect(countQualifyingSets(repsMovement(reps(8, 7, 9)))).toBe(0);
  });

  it("hedefi olmayan harekette 0", () => {
    expect(countQualifyingSets({ sets: reps(10, 10) })).toBe(0);
  });

  it("tutuşta hedefe ulaşan setleri sayar", () => {
    expect(countQualifyingSets(durationMovement(holds(30, 45, 50)))).toBe(2);
  });
});

describe("buildSetPlan", () => {
  it("ilk sette hedefi önerir ve tanımı yazar", () => {
    const plan = buildSetPlan(repsMovement([]));
    expect(plan.setNumber).toBe(1);
    expect(plan.requiredSets).toBe(3);
    expect(plan.qualifiedSets).toBe(0);
    expect(plan.headline).toBe("1. set");
    expect(plan.prefill).toBe("15");
    expect(plan.hint).toBe("Hedef: her set 15 tekrar");
    expect(plan.targetComplete).toBe(false);
  });

  it("tutan set sayısını ilerletir, tutmayanı ilerletmez", () => {
    const plan = buildSetPlan(repsMovement(reps(15, 12)));
    expect(plan.setNumber).toBe(3);
    expect(plan.qualifiedSets).toBe(1);
    expect(plan.hint).toBe("Hedef: her set 15 tekrar");
    expect(plan.targetComplete).toBe(false);
  });

  it("set sayısı dolsa da hedef tutmadıysa TAMAMLANDI demez", () => {
    // Bildirilen hata: 8, 7, 1, 3, 4 girildiğinde "hedefi tamamladın" yazıyordu.
    const plan = buildSetPlan(repsMovement(reps(15, 7, 1, 3, 4)));
    expect(plan.setNumber).toBe(6);
    expect(plan.qualifiedSets).toBe(1);
    expect(plan.targetComplete).toBe(false);
    expect(plan.isExtraSet).toBe(false);
    expect(plan.hint).toBe("Hedef: her set 15 tekrar");
  });

  it("üç tutan set gelince hedef tamamlanır", () => {
    const plan = buildSetPlan(repsMovement(reps(15, 15, 15)));
    expect(plan.targetComplete).toBe(true);
    expect(plan.isExtraSet).toBe(true);
    expect(plan.hint).toBe("Hedefi tamamladın, bu ekstra set");
    expect(plan.headline).toBe("4. set");
  });

  it("araya tutmayan set girse de üç tutan set hedefi tamamlar", () => {
    const plan = buildSetPlan(repsMovement(reps(15, 9, 15, 15)));
    expect(plan.qualifiedSets).toBe(3);
    expect(plan.targetComplete).toBe(true);
  });

  it("tek setlik hedefte sayaç yazılmaz", () => {
    const plan = buildSetPlan(repsMovement([], { targetSets: 1 }));
    expect(plan.requiredSets).toBe(1);
    expect(plan.hint).toBe("Hedef: 15 tekrar");
  });

  it("tutuşta tek set yeter", () => {
    const plan = buildSetPlan(durationMovement([]));
    expect(plan.requiredSets).toBe(1);
    expect(plan.hint).toBe("Hedef: tek sette 45 saniye");
    expect(plan.prefill).toBe("45");
  });

  it("yeterli tutuştan sonrası ekstra", () => {
    const plan = buildSetPlan(durationMovement(holds(45)));
    expect(plan.targetComplete).toBe(true);
    expect(plan.hint).toBe("Hedefi tamamladın, bu ekstra set");
  });

  it("kısa tutuş hedefi tamamlamaz", () => {
    const plan = buildSetPlan(durationMovement(holds(30, 40)));
    expect(plan.qualifiedSets).toBe(0);
    expect(plan.targetComplete).toBe(false);
  });

  it("hedefi olmayan harekette son seti önerir", () => {
    const plan = buildSetPlan({ sets: reps(12) });
    expect(plan.requiredSets).toBeNull();
    expect(plan.prefill).toBe("12");
    expect(plan.hint).toBeNull();
    expect(plan.headline).toBe("2. set");
  });

  it("hedefi de geçmişi de olmayan harekette öneri boş", () => {
    const plan = buildSetPlan({ sets: [] });
    expect(plan.prefill).toBe("");
  });

  it("sıfır tekrarlı set öneri kaynağı olmaz", () => {
    const plan = buildSetPlan({ sets: [{ reps: 0 }] });
    expect(plan.prefill).toBe("");
  });
});

describe("lastSetFeedback", () => {
  it("set yoksa sessiz", () => {
    expect(lastSetFeedback(repsMovement([]))).toBeNull();
  });

  it("hedefin altındaki sette mesafeyi BU SET için söyler", () => {
    expect(lastSetFeedback(repsMovement(reps(15, 12)))).toBe("Bu sette hedefe 3 tekrar kaldı");
  });

  it("tutan sette kalan tam set sayısını söyler", () => {
    expect(lastSetFeedback(repsMovement(reps(15)))).toBe("Hedef tuttu · 2 tam set kaldı");
  });

  it("tutmayan setler kalan sayısını değiştirmez", () => {
    // 15, 5, 15 -> iki tutan set var, bir tane daha gerekiyor.
    expect(lastSetFeedback(repsMovement(reps(15, 5, 15)))).toBe("Hedef tuttu · 1 tam set kaldı");
  });

  it("hedef tamamlanınca kutlar", () => {
    expect(lastSetFeedback(repsMovement(reps(15, 15, 15)))).toBe("Hedefi tamamladın 🎯");
  });

  it("ekstra tutan set de kutlamayı sürdürür", () => {
    expect(lastSetFeedback(repsMovement(reps(15, 15, 15, 16)))).toBe("Hedefi tamamladın 🎯");
  });

  it("tutuşta tek yeterli set kutlanır", () => {
    expect(lastSetFeedback(durationMovement(holds(45)))).toBe("Hedefi tamamladın 🎯");
  });

  it("kısa tutuşta kalan süreyi söyler", () => {
    expect(lastSetFeedback(durationMovement(holds(30)))).toBe("Bu sette hedefe 15 saniye kaldı");
  });

  it("hedefsiz harekette önceki setle kıyaslar", () => {
    expect(lastSetFeedback({ sets: reps(10, 12) })).toBe("Bir önceki setten 2 tekrar fazla");
    expect(lastSetFeedback({ sets: reps(10, 10) })).toBe("Bir önceki setle aynı");
    expect(lastSetFeedback({ sets: reps(12, 9) })).toBe("Bir önceki setten 3 tekrar az");
  });

  it("hedefsiz harekette tek set varsa kıyas yok", () => {
    expect(lastSetFeedback({ sets: reps(10) })).toBeNull();
  });

  it("değeri olmayan son set sessiz kalır", () => {
    expect(lastSetFeedback(repsMovement([{ reps: null }]))).toBeNull();
  });
});

describe("setValueRatio", () => {
  it("hedefin yarısı 0.5", () => {
    expect(setValueRatio(4, 8)).toBe(0.5);
  });

  it("hedefi geçen set 1'de durur", () => {
    expect(setValueRatio(24, 8)).toBe(1);
  });

  it("hedef yoksa çubuk çizilmez", () => {
    expect(setValueRatio(10, null)).toBeNull();
  });

  it("değeri olmayan set boş çubuk", () => {
    expect(setValueRatio(null, 8)).toBe(0);
  });
});
