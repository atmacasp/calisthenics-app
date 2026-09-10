/// <reference types="jest" />
import { buildSetPlan, lastSetFeedback, setKindOf, type CoachMovement } from "../setCoach";

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
  targetSets: 3,
  targetReps: null,
  targetDurationSeconds: 45,
  sets,
  ...over,
});

describe("setKindOf", () => {
  it("duration hedefini süre olarak tanır", () => {
    expect(setKindOf(durationMovement([]))).toBe("duration");
  });

  it("hedefi olmayan hareket tekrar sayılır", () => {
    expect(setKindOf({ sets: [] })).toBe("reps");
  });
});

describe("buildSetPlan", () => {
  it("ilk sette hedefi önerir", () => {
    const plan = buildSetPlan(repsMovement([]));
    expect(plan.setNumber).toBe(1);
    expect(plan.totalSets).toBe(3);
    expect(plan.headline).toBe("Set 1 / 3");
    expect(plan.prefill).toBe("15");
    expect(plan.hint).toBe("Hedef 15 tekrar");
    expect(plan.isExtraSet).toBe(false);
  });

  it("set numarası kaydedilen set sayısına göre ilerler", () => {
    const plan = buildSetPlan(repsMovement([{ reps: 15 }, { reps: 14 }]));
    expect(plan.setNumber).toBe(3);
    expect(plan.headline).toBe("Set 3 / 3");
  });

  it("hedefteki set sayısı aşılınca ekstra sete geçer", () => {
    const plan = buildSetPlan(repsMovement([{ reps: 15 }, { reps: 15 }, { reps: 15 }]));
    expect(plan.setNumber).toBe(4);
    expect(plan.isExtraSet).toBe(true);
    expect(plan.headline).toBe("Set 4");
    expect(plan.hint).toBe("Hedefi tamamladın, bu ekstra");
  });

  it("süre hedefinde saniye önerir", () => {
    const plan = buildSetPlan(durationMovement([]));
    expect(plan.kind).toBe("duration");
    expect(plan.prefill).toBe("45");
    expect(plan.hint).toBe("Hedef 45 saniye");
  });

  it("hedefi olmayan harekette son seti tekrar önerir", () => {
    const plan = buildSetPlan({ sets: [{ reps: 8 }] });
    expect(plan.prefill).toBe("8");
    expect(plan.headline).toBe("Set 2");
    expect(plan.hint).toBeNull();
  });

  it("hedef de geçmiş set de yoksa öneri boş kalır", () => {
    const plan = buildSetPlan({ sets: [] });
    expect(plan.prefill).toBe("");
  });
});

describe("lastSetFeedback", () => {
  it("set yoksa sessiz kalır", () => {
    expect(lastSetFeedback(repsMovement([]))).toBeNull();
  });

  it("hedefin altında kalınca farkı söyler", () => {
    expect(lastSetFeedback(repsMovement([{ reps: 12 }]))).toBe("Hedefe 3 tekrar kaldı");
  });

  it("hedef tutunca kaç set kaldığını söyler", () => {
    expect(lastSetFeedback(repsMovement([{ reps: 15 }]))).toBe("Hedef tuttu · 2 set kaldı");
  });

  it("hedefe ulaşmayan setler kalan sete sayılmaz", () => {
    // 15 - 12 - 15: iki set hedefi tuttu, bir set kaldı.
    expect(lastSetFeedback(repsMovement([{ reps: 15 }, { reps: 12 }, { reps: 15 }]))).toBe("Hedef tuttu · 1 set kaldı");
  });

  it("tüm setler tutunca hedefi tamamladığını söyler", () => {
    expect(lastSetFeedback(repsMovement([{ reps: 15 }, { reps: 15 }, { reps: 16 }]))).toBe("Hedefi tamamladın 🎯");
  });

  it("süre hedefinde saniye birimini kullanır", () => {
    expect(lastSetFeedback(durationMovement([{ duration_seconds: 30 }]))).toBe("Hedefe 15 saniye kaldı");
  });

  it("hedefi olmayan harekette önceki setle karşılaştırır", () => {
    const movement: CoachMovement = { sets: [{ reps: 10 }, { reps: 12 }] };
    expect(lastSetFeedback(movement)).toBe("Bir önceki setten 2 tekrar fazla");
    expect(lastSetFeedback({ sets: [{ reps: 10 }, { reps: 10 }] })).toBe("Bir önceki setle aynı");
    expect(lastSetFeedback({ sets: [{ reps: 12 }, { reps: 9 }] })).toBe("Bir önceki setten 3 tekrar az");
  });

  it("hedefi ve karşılaştıracak seti olmayan tek sette sessiz kalır", () => {
    expect(lastSetFeedback({ sets: [{ reps: 10 }] })).toBeNull();
  });

  it("sadece ek ağırlık girilmiş set için yorum yapmaz", () => {
    expect(lastSetFeedback(repsMovement([{ added_weight_kg: 10 }]))).toBeNull();
  });
});
