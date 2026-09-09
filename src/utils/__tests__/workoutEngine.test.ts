/// <reference types="jest" />
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../types/movements";
import { computeFocusSuggestions, summarizeSteps } from "../workoutSuggestions";
import { computeWorkoutAchievements } from "../workoutSummary";

function movement(over: Partial<MovementWithGroupAndPrerequisites> & { id: string; name: string }) {
  return {
    group_id: "g-lsit",
    movement_type: "progression",
    target_type: "reps_sets",
    target_sets: 3,
    target_reps: 8,
    target_duration_seconds: null,
    order_index: 1,
    prerequisites: [],
    movement_groups: { name: "L-Sit", order_index: 0 },
    ...over,
  } as unknown as MovementWithGroupAndPrerequisites;
}

const met = { s1: [{ reps: 8, duration_seconds: null }, { reps: 8, duration_seconds: null }, { reps: 8, duration_seconds: null }] };

const prerequisiteOn = (id: string, name: string) => [
  {
    target_sets: null,
    target_reps: null,
    target_duration_seconds: null,
    order_index: 1,
    prerequisite_movement: {
      id,
      name,
      movement_type: "foundation" as const,
      target_type: "reps_sets" as const,
      target_sets: 3,
      target_reps: 8,
      target_duration_seconds: null,
    },
  },
];

describe("computeFocusSuggestions", () => {
  const chain = [
    movement({ id: "a", name: "Basamak 1", order_index: 1 }),
    movement({ id: "b", name: "Basamak 2", order_index: 2 }),
    movement({ id: "c", name: "Basamak 3", order_index: 3 }),
  ];

  it("hedefi karşılanmamış ilk basamağı odak seçer", () => {
    const suggestions = computeFocusSuggestions(chain, { a: met });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].movement.id).toBe("b");
    expect(suggestions[0].stepIndex).toBe(2);
    expect(suggestions[0].chainLength).toBe(3);
    expect(suggestions[0].completedSteps).toBe(1);
  });

  it("tüm basamaklar bittiğinde kategori tamamlanmış sayılır", () => {
    const suggestions = computeFocusSuggestions(chain, { a: met, b: met, c: met });
    expect(suggestions[0].completed).toBe(true);
    expect(suggestions[0].completedSteps).toBe(3);
    expect(suggestions[0].progress).toBeNull();
  });

  it("kilitli basamakta ilerleme değil, engelleyen ön koşul döner", () => {
    const locked = [
      movement({ id: "x", name: "Kilitli Basamak", prerequisites: prerequisiteOn("sinav", "Standart Şınav") }),
    ];
    const suggestions = computeFocusSuggestions(locked, {});
    expect(suggestions[0].locked).toBe(true);
    expect(suggestions[0].progress).toBeNull();
    expect(suggestions[0].blockingPrerequisite?.name).toBe("Standart Şınav");
    expect(suggestions[0].blockingPrerequisite?.targetLabel).toBe("3 set x 8 tekrar");
  });

  it("ön koşul karşılanınca basamak açılır ve ilerleme gösterilir", () => {
    const gated = [
      movement({ id: "x", name: "Basamak", prerequisites: prerequisiteOn("sinav", "Standart Şınav") }),
    ];
    const suggestions = computeFocusSuggestions(gated, { sinav: met });
    expect(suggestions[0].locked).toBe(false);
    expect(suggestions[0].blockingPrerequisite).toBeNull();
    expect(suggestions[0].progress?.met).toBe(false);
  });

  it("summarizeSteps tüm kategorilerin toplamını verir", () => {
    const twoGroups = [
      ...chain,
      movement({ id: "p", name: "Diğer", group_id: "g-planche", movement_groups: { name: "Planche", order_index: 1 } }),
    ];
    const summary = summarizeSteps(computeFocusSuggestions(twoGroups, { a: met }));
    expect(summary.total).toBe(4);
    expect(summary.completed).toBe(1);
  });
});

describe("computeWorkoutAchievements", () => {
  const single = [movement({ id: "a", name: "Basamak 1" })];

  it("bu antrenmanda karşılanan hedefi raporlar", () => {
    const result = computeWorkoutAchievements(single, {}, { a: met });
    expect(result.completedTargets).toHaveLength(1);
    expect(result.completedTargets[0].id).toBe("a");
  });

  // Aksi hâlde her antrenman sonunda aynı hedef tekrar tekrar kutlanırdı.
  it("zaten karşılanmış hedefi tekrar kutlamaz", () => {
    const result = computeWorkoutAchievements(single, { a: met }, { a: met });
    expect(result.completedTargets).toHaveLength(0);
  });

  it("ön koşulu bu antrenmanla tamamlanan basamağı 'kilidi açıldı' diye raporlar", () => {
    const gated = [
      movement({ id: "x", name: "Yeni Basamak", prerequisites: prerequisiteOn("sinav", "Standart Şınav") }),
    ];
    const result = computeWorkoutAchievements(gated, {}, { sinav: met });
    expect(result.unlockedSteps).toHaveLength(1);
    expect(result.unlockedSteps[0].id).toBe("x");
  });

  it("kilidi açılırken hedefi de karşılanan basamak 'açıldı' diye duyurulmaz", () => {
    const gated = [
      movement({ id: "x", name: "Yeni Basamak", prerequisites: prerequisiteOn("sinav", "Standart Şınav") }),
    ];
    const result = computeWorkoutAchievements(gated, {}, { sinav: met, x: met });
    expect(result.unlockedSteps).toHaveLength(0);
    expect(result.completedTargets).toHaveLength(1);
  });
});
