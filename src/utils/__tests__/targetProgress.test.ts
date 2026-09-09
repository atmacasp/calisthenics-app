/// <reference types="jest" />
import type { MovementSetLogMap, SetLogEntry, TargetSpec } from "../../types/movements";
import {
  areAllPrerequisitesMet,
  computeTargetProgress,
  formatTarget,
  isTargetMet,
} from "../targetProgress";

/** Testlerde tam movements satırı kurmak gereksiz; hedef için gereken alanlar yeterli. */
const repsTarget: TargetSpec = {
  target_type: "reps_sets",
  target_sets: 3,
  target_reps: 8,
  target_duration_seconds: null,
};

const durationTarget: TargetSpec = {
  target_type: "duration",
  target_sets: null,
  target_reps: null,
  target_duration_seconds: 30,
};

const reps = (...values: number[]): SetLogEntry[] =>
  values.map((r) => ({ reps: r, duration_seconds: null }));

const holds = (...values: number[]): SetLogEntry[] =>
  values.map((d) => ({ reps: null, duration_seconds: d }));

describe("isTargetMet", () => {
  it("reps_sets hedefi TEK antrenmanda karşılanır", () => {
    expect(isTargetMet(repsTarget, { s1: reps(8, 8, 8) })).toBe(true);
  });

  it("hedef tekrar sayısını aşan setler de sayılır", () => {
    expect(isTargetMet(repsTarget, { s1: reps(12, 9, 8) })).toBe(true);
  });

  // Bu kural motorun kalbi: 3 farklı günde birer set atmak "3 set x 8" demek değil.
  it("setler AYRI antrenmanlara dağılmışsa hedef karşılanmaz", () => {
    expect(isTargetMet(repsTarget, { s1: reps(8), s2: reps(8), s3: reps(8) })).toBe(false);
  });

  it("yetersiz tekrarlı setler sayılmaz", () => {
    expect(isTargetMet(repsTarget, { s1: reps(8, 7, 8) })).toBe(false);
  });

  it("duration hedefi herhangi bir antrenmandaki tek bir tutuşla karşılanır", () => {
    expect(isTargetMet(durationTarget, { s1: holds(12), s2: holds(31) })).toBe(true);
  });

  it("hiç set yoksa hedef karşılanmamıştır", () => {
    expect(isTargetMet(repsTarget, undefined)).toBe(false);
  });

  // Eksik veri kullanıcıyı haksız yere kilitlememeli.
  it("target_type tanımsızsa hedef karşılanmış sayılır", () => {
    const noTarget: TargetSpec = {
      target_type: null,
      target_sets: null,
      target_reps: null,
      target_duration_seconds: null,
    };
    expect(isTargetMet(noTarget, undefined)).toBe(true);
  });
});

describe("computeTargetProgress", () => {
  // Uygulamadaki en önemli görsel söz: çubuk dolduysa hedef gerçekten bitmiştir.
  it("çubuk dolu olmakla hedefin karşılanması aynı anlama gelir", () => {
    const cases: Array<[TargetSpec, MovementSetLogMap[string] | undefined]> = [
      [repsTarget, { s1: reps(8, 8, 8) }],
      [repsTarget, { s1: reps(8, 8) }],
      [repsTarget, { s1: reps(8), s2: reps(8), s3: reps(8) }],
      [repsTarget, undefined],
      [durationTarget, { s1: holds(30) }],
      [durationTarget, { s1: holds(29) }],
    ];
    for (const [target, sets] of cases) {
      const progress = computeTargetProgress(target, sets);
      expect(progress?.ratio === 1).toBe(isTargetMet(target, sets));
      expect(progress?.met).toBe(isTargetMet(target, sets));
    }
  });

  it("reps_sets ilerlemesi tek antrenmandaki en iyi set sayısını gösterir", () => {
    const progress = computeTargetProgress(repsTarget, { s1: reps(8, 8, 5), s2: reps(8) });
    expect(progress?.label).toBe("2 / 3 set x 8 tekrar");
  });

  it("hedef tekrara hiç ulaşılmadıysa çubuk boş kalır ama en iyi set yazılır", () => {
    const progress = computeTargetProgress(repsTarget, { s1: reps(6, 5) });
    expect(progress?.ratio).toBe(0);
    expect(progress?.detail).toBe("En iyi setin: 6 tekrar");
  });

  it("duration ilerlemesi en uzun tutuşa göre hesaplanır", () => {
    const progress = computeTargetProgress(durationTarget, { s1: holds(12, 21) });
    expect(progress?.label).toBe("21 / 30 sn");
    expect(progress?.met).toBe(false);
  });
});

describe("areAllPrerequisitesMet", () => {
  it("ön koşulu olmayan hareket kilitli değildir", () => {
    expect(areAllPrerequisitesMet([], {})).toBe(true);
  });

  it("tek bir ön koşul bile eksikse basamak kilitlidir", () => {
    const setLogMap: MovementSetLogMap = {
      "m-1": { s1: reps(8, 8, 8) },
      "m-2": { s1: holds(10) },
    };
    const prerequisites = [
      {
        target_sets: null,
        target_reps: null,
        target_duration_seconds: null,
        order_index: 1,
        prerequisite_movement: {
          id: "m-1",
          name: "Şınav",
          movement_type: "foundation" as const,
          target_type: "reps_sets" as const,
          target_sets: 3,
          target_reps: 8,
          target_duration_seconds: null,
        },
      },
      {
        target_sets: null,
        target_reps: null,
        target_duration_seconds: null,
        order_index: 2,
        prerequisite_movement: {
          id: "m-2",
          name: "Plank",
          movement_type: "foundation" as const,
          target_type: "duration" as const,
          target_sets: null,
          target_reps: null,
          target_duration_seconds: 45,
        },
      },
    ];
    expect(areAllPrerequisitesMet(prerequisites, setLogMap)).toBe(false);
  });
});

describe("formatTarget", () => {
  it("reps_sets hedefini okunabilir metne çevirir", () => {
    expect(formatTarget(repsTarget)).toBe("3 set x 8 tekrar");
  });

  it("duration hedefini okunabilir metne çevirir", () => {
    expect(formatTarget(durationTarget)).toBe("30 saniye tutuş");
  });
});
