/// <reference types="jest" />
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../../types/movements";
import type { ProgramMovementWithName } from "../../types/programs";
import { computeProgramAdditions, computeProgramUpgrades } from "../programUpgrades";

/**
 * Fixture'lar movements satırının tamamını taşımıyor; motorun okuduğu alanlar
 * yeterli. Tip zorlaması bilinçli - testin okunabilirliği tam satır kurmaktan
 * daha değerli.
 */
function movement(over: Partial<MovementWithGroupAndPrerequisites> & { id: string; name: string }) {
  return {
    group_id: "g-foundation",
    movement_type: "progression",
    target_type: "reps_sets",
    target_sets: 3,
    target_reps: 8,
    target_duration_seconds: null,
    order_index: 1,
    prerequisites: [],
    movement_groups: { name: "Kategori", order_index: 0 },
    ...over,
  } as unknown as MovementWithGroupAndPrerequisites;
}

function programRow(over: Partial<ProgramMovementWithName> & { id: string; movementId: string }) {
  return {
    movementName: "Hareket",
    targetSets: 3,
    targetReps: 8,
    targetDurationSeconds: null,
    restSeconds: 60,
    orderIndex: 0,
    ...over,
  } as ProgramMovementWithName;
}

const metSets = { s1: [{ reps: 8, duration_seconds: null }, { reps: 8, duration_seconds: null }, { reps: 8, duration_seconds: null }] };

describe("computeProgramUpgrades", () => {
  /**
   * Gerçek hata: Temel Güç kategorisi bir zincir değil (migration 0006 bunu
   * açıkça dışarıda bırakıyor). Motor eskiden "aynı gruptaki bir sonraki hareket"
   * diye yürüdüğü için Barfiks'in hedefini tamamlayınca Dips'i "üst basamak"
   * olarak önerecekti.
   */
  it("Temel Güç hareketleri için terfi önerilmez", () => {
    const movements = [
      movement({ id: "sinav", name: "Standart Şınav", movement_type: "foundation", order_index: 1 }),
      movement({ id: "dips", name: "Dips", movement_type: "foundation", order_index: 2 }),
    ];
    const daysMap = { 1: [programRow({ id: "pm-1", movementId: "sinav", movementName: "Standart Şınav" })] };
    const setLogMap: MovementSetLogMap = { sinav: metSets };

    expect(computeProgramUpgrades(daysMap, movements, setLogMap)).toHaveLength(0);
  });

  it("zincirde hedefi tamamlanan basamak için bir üst basamağı önerir", () => {
    const movements = [
      movement({ id: "step1", name: "Tuck L-Sit", group_id: "g-lsit", order_index: 1 }),
      movement({ id: "step2", name: "Tek Bacak L-Sit", group_id: "g-lsit", order_index: 2 }),
    ];
    const daysMap = { 3: [programRow({ id: "pm-1", movementId: "step1", movementName: "Tuck L-Sit" })] };
    const setLogMap: MovementSetLogMap = { step1: metSets };

    const upgrades = computeProgramUpgrades(daysMap, movements, setLogMap);
    expect(upgrades).toHaveLength(1);
    expect(upgrades[0].currentMovementId).toBe("step1");
    expect(upgrades[0].nextMovement.id).toBe("step2");
    expect(upgrades[0].dayOfWeek).toBe(3);
  });

  it("mevcut basamağın hedefi karşılanmadıysa terfi önerilmez", () => {
    const movements = [
      movement({ id: "step1", name: "Tuck L-Sit", group_id: "g-lsit", order_index: 1 }),
      movement({ id: "step2", name: "Tek Bacak L-Sit", group_id: "g-lsit", order_index: 2 }),
    ];
    const daysMap = { 3: [programRow({ id: "pm-1", movementId: "step1", movementName: "Tuck L-Sit" })] };

    expect(computeProgramUpgrades(daysMap, movements, {})).toHaveLength(0);
  });

  it("önerilecek basamak programda zaten varsa tekrar önerilmez", () => {
    const movements = [
      movement({ id: "step1", name: "Tuck L-Sit", group_id: "g-lsit", order_index: 1 }),
      movement({ id: "step2", name: "Tek Bacak L-Sit", group_id: "g-lsit", order_index: 2 }),
    ];
    const daysMap = {
      3: [
        programRow({ id: "pm-1", movementId: "step1", movementName: "Tuck L-Sit" }),
        programRow({ id: "pm-2", movementId: "step2", movementName: "Tek Bacak L-Sit" }),
      ],
    };
    const setLogMap: MovementSetLogMap = { step1: metSets };

    expect(computeProgramUpgrades(daysMap, movements, setLogMap)).toHaveLength(0);
  });

  it("zincirin sonundaysan terfi önerilmez", () => {
    const movements = [movement({ id: "son", name: "Tam L-Sit", group_id: "g-lsit", order_index: 1 })];
    const daysMap = { 3: [programRow({ id: "pm-1", movementId: "son", movementName: "Tam L-Sit" })] };
    const setLogMap: MovementSetLogMap = { son: metSets };

    expect(computeProgramUpgrades(daysMap, movements, setLogMap)).toHaveLength(0);
  });
});

describe("computeProgramAdditions", () => {
  const foundation = movement({
    id: "sinav",
    name: "Standart Şınav",
    movement_type: "foundation",
    group_id: "g-foundation",
  });

  /** Ön koşulu Şınav olan, kilidi Şınav hedefiyle açılan zincir başlangıcı. */
  const chainStart = movement({
    id: "pike",
    name: "Pike Şınav",
    group_id: "g-hspu",
    movement_groups: { name: "HSPU", order_index: 1 },
    prerequisites: [
      {
        target_sets: null,
        target_reps: null,
        target_duration_seconds: null,
        order_index: 1,
        prerequisite_movement: {
          id: "sinav",
          name: "Standart Şınav",
          movement_type: "foundation",
          target_type: "reps_sets",
          target_sets: 3,
          target_reps: 8,
          target_duration_seconds: null,
        },
      },
    ],
  });

  const daysMap = {
    1: [programRow({ id: "pm-1", movementId: "sinav", movementName: "Standart Şınav" })],
    5: [
      programRow({ id: "pm-2", movementId: "sinav", movementName: "Standart Şınav" }),
      programRow({ id: "pm-3", movementId: "sinav", movementName: "Standart Şınav" }),
    ],
  };

  it("kilidi açılan zincir başlangıcını önerir", () => {
    const additions = computeProgramAdditions(daysMap, [foundation, chainStart], { sinav: metSets });
    expect(additions).toHaveLength(1);
    expect(additions[0].movement.id).toBe("pike");
  });

  it("önerilen gün, ön koşulun programda bulunduğu ilk gündür", () => {
    const additions = computeProgramAdditions(daysMap, [foundation, chainStart], { sinav: metSets });
    expect(additions[0].dayOfWeek).toBe(1);
    expect(additions[0].reason).toBe("prerequisite");
  });

  it("ön koşul karşılanmadıysa öneri yapılmaz", () => {
    expect(computeProgramAdditions(daysMap, [foundation, chainStart], {})).toHaveLength(0);
  });

  it("hareket programda zaten varsa önerilmez", () => {
    const withPike = {
      ...daysMap,
      1: [...daysMap[1], programRow({ id: "pm-9", movementId: "pike", movementName: "Pike Şınav" })],
    };
    expect(computeProgramAdditions(withPike, [foundation, chainStart], { sinav: metSets })).toHaveLength(0);
  });

  it("bir kategoriden en fazla tek öneri çıkar", () => {
    const secondStep = movement({
      id: "pike2",
      name: "Yükseltilmiş Pike Şınav",
      group_id: "g-hspu",
      order_index: 2,
      movement_groups: { name: "HSPU", order_index: 1 },
      prerequisites: chainStart.prerequisites,
    });
    const additions = computeProgramAdditions(daysMap, [foundation, chainStart, secondStep], { sinav: metSets });
    expect(additions).toHaveLength(1);
    expect(additions[0].movement.id).toBe("pike");
  });

  it("onlyIds verilirse sadece o hareketler önerilir", () => {
    expect(computeProgramAdditions(daysMap, [foundation, chainStart], { sinav: metSets }, [])).toHaveLength(0);
    expect(
      computeProgramAdditions(daysMap, [foundation, chainStart], { sinav: metSets }, ["pike"])
    ).toHaveLength(1);
  });
});
