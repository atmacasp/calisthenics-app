/// <reference types="jest" />
import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MISSED_TARGET_EXTRA_SECONDS,
  focusAfterSet,
  initialFocus,
  isMovementComplete,
  restPlanFor,
  sessionHeadline,
  sessionOutline,
  sessionProgress,
  type FlowMovement,
} from "../sessionFlow";

const reps = (...values: number[]) => values.map((reps) => ({ reps }));
const holds = (...values: number[]) => values.map((duration_seconds) => ({ duration_seconds }));

/** 3 set x 15 tekrar hedefi olan hareket. */
const repsMovement = (
  movementId: string,
  sets: FlowMovement["sets"],
  over: Partial<FlowMovement> = {}
): FlowMovement => ({
  movementId,
  name: movementId.toUpperCase(),
  targetType: "reps_sets",
  targetSets: 3,
  targetReps: 15,
  targetDurationSeconds: null,
  sets,
  ...over,
});

/** 45 saniye tutuş hedefi olan hareket. */
const holdMovement = (
  movementId: string,
  sets: FlowMovement["sets"],
  over: Partial<FlowMovement> = {}
): FlowMovement => ({
  movementId,
  name: movementId.toUpperCase(),
  targetType: "duration",
  targetSets: null,
  targetReps: null,
  targetDurationSeconds: 45,
  sets,
  ...over,
});

/** Kullanıcının elle eklediği, hedefi olmayan hareket. */
const freeMovement = (movementId: string, sets: FlowMovement["sets"]): FlowMovement => ({
  movementId,
  name: movementId.toUpperCase(),
  sets,
});

describe("isMovementComplete", () => {
  it("hedef tutan set sayısı dolunca biter", () => {
    expect(isMovementComplete(repsMovement("a", reps(15, 15, 15)))).toBe(true);
  });

  it("eksik set varken bitmez", () => {
    expect(isMovementComplete(repsMovement("a", reps(15, 15)))).toBe(false);
  });

  it("toplam tekrar yetse de tutmayan setler bitirmez", () => {
    // Kilit motorunun kuralı: 8+7+9 = 24 ama hiçbiri 15 değil.
    expect(isMovementComplete(repsMovement("a", reps(8, 7, 9)))).toBe(false);
  });

  it("tutuşta tek yeterli set bitirir", () => {
    expect(isMovementComplete(holdMovement("a", holds(45)))).toBe(true);
    expect(isMovementComplete(holdMovement("a", holds(30, 40)))).toBe(false);
  });

  it("hedefi olmayan harekette tek set yeter", () => {
    expect(isMovementComplete(freeMovement("a", []))).toBe(false);
    expect(isMovementComplete(freeMovement("a", reps(6)))).toBe(true);
  });
});

describe("initialFocus", () => {
  it("hareket yoksa boş", () => {
    expect(initialFocus([])).toEqual({ movementId: null, index: -1, reason: "empty" });
  });

  it("ilk eksik harekete odaklanır", () => {
    const movements = [repsMovement("a", reps(15, 15, 15)), repsMovement("b", [])];
    expect(initialFocus(movements)).toEqual({ movementId: "b", index: 1, reason: "continue" });
  });

  it("hepsi tamamsa ilk harekete düşer", () => {
    // Bitmiş bir oturuma dönen kullanıcı boş ekran görmemeli, ekstra set atabilmeli.
    const movements = [repsMovement("a", reps(15, 15, 15)), freeMovement("b", reps(10))];
    expect(initialFocus(movements)).toEqual({ movementId: "a", index: 0, reason: "complete" });
  });
});

describe("focusAfterSet", () => {
  it("açık hareketin işi bitmediyse yerinde kalır", () => {
    const movements = [repsMovement("a", reps(15)), repsMovement("b", [])];
    expect(focusAfterSet(movements, "a")).toEqual({ movementId: "a", index: 0, reason: "continue" });
  });

  it("hedef dolunca sıradaki eksik harekete geçer", () => {
    const movements = [repsMovement("a", reps(15, 15, 15)), repsMovement("b", [])];
    expect(focusAfterSet(movements, "a")).toEqual({ movementId: "b", index: 1, reason: "advanced" });
  });

  it("aşağıda eksik kalmadıysa başa sarar", () => {
    // Kullanıcı ilk hareketi yarım bırakıp ilerlediyse oturum sonunda ona döner.
    const movements = [repsMovement("a", reps(15)), repsMovement("b", reps(15, 15, 15))];
    expect(focusAfterSet(movements, "b")).toEqual({ movementId: "a", index: 0, reason: "advanced" });
  });

  it("aradaki bitmiş hareketleri atlar", () => {
    const movements = [
      repsMovement("a", reps(15, 15, 15)),
      holdMovement("b", holds(60)),
      repsMovement("c", []),
    ];
    expect(focusAfterSet(movements, "a")).toEqual({ movementId: "c", index: 2, reason: "advanced" });
  });

  it("hepsi bitince odak kalmaz", () => {
    const movements = [repsMovement("a", reps(15, 15, 15)), holdMovement("b", holds(45))];
    expect(focusAfterSet(movements, "a")).toEqual({ movementId: null, index: -1, reason: "complete" });
  });

  it("hareket yoksa boş", () => {
    expect(focusAfterSet([], "a")).toEqual({ movementId: null, index: -1, reason: "empty" });
  });

  it("bilinmeyen hareket kimliğinde ilk eksiğe geçer", () => {
    // Kullanıcı hareketi silmişse odak boşlukta kalmamalı.
    const movements = [repsMovement("a", []), repsMovement("b", [])];
    expect(focusAfterSet(movements, "silinmis")).toEqual({ movementId: "a", index: 0, reason: "advanced" });
  });
});

describe("sessionProgress", () => {
  it("boş oturumda sıfır", () => {
    expect(sessionProgress([])).toEqual({
      totalMovements: 0,
      completedMovements: 0,
      qualifiedSets: 0,
      requiredSets: 0,
      loggedSets: 0,
      ratio: 0,
      complete: false,
    });
  });

  it("tutmayan setler girilen sete sayılır, tutan sete sayılmaz", () => {
    const progress = sessionProgress([repsMovement("a", reps(15, 9, 15))]);
    expect(progress.loggedSets).toBe(3);
    expect(progress.qualifiedSets).toBe(2);
    expect(progress.requiredSets).toBe(3);
    expect(progress.completedMovements).toBe(0);
  });

  it("hedefsiz hareket paydaya girmez ama çubuğa girer", () => {
    const progress = sessionProgress([repsMovement("a", reps(15, 15)), freeMovement("b", reps(10))]);
    expect(progress.requiredSets).toBe(3);
    // a: 2/3, b: 1 -> ortalama
    expect(progress.ratio).toBeCloseTo((2 / 3 + 1) / 2);
    expect(progress.completedMovements).toBe(1);
    expect(progress.complete).toBe(false);
  });

  it("hepsi tamamlanınca çubuk dolar", () => {
    const progress = sessionProgress([repsMovement("a", reps(15, 15, 15)), holdMovement("b", holds(50))]);
    expect(progress.ratio).toBe(1);
    expect(progress.complete).toBe(true);
    expect(progress.completedMovements).toBe(2);
  });

  it("hedefi aşan set çubuğu taşırmaz", () => {
    const progress = sessionProgress([repsMovement("a", reps(20, 20, 20, 20))]);
    expect(progress.ratio).toBe(1);
    expect(progress.qualifiedSets).toBe(4);
  });
});

describe("sessionOutline", () => {
  it("biten, açık ve bekleyen hareketleri ayırır", () => {
    const movements = [repsMovement("a", reps(15, 15, 15)), repsMovement("b", reps(15)), repsMovement("c", [])];
    expect(sessionOutline(movements, "b").map((o) => o.state)).toEqual(["done", "current", "todo"]);
  });

  it("tamamlanmış harekete geri dönülse de yeşil kalır", () => {
    const movements = [repsMovement("a", reps(15, 15, 15)), repsMovement("b", [])];
    expect(sessionOutline(movements, "a")[0].state).toBe("done");
  });

  it("sayaçları taşır", () => {
    const outline = sessionOutline([repsMovement("a", reps(15, 9))], "a");
    expect(outline[0]).toEqual({
      movementId: "a",
      name: "A",
      state: "current",
      qualifiedSets: 1,
      requiredSets: 3,
      loggedSets: 2,
    });
  });

  it("hedefsiz harekette gereken set null", () => {
    expect(sessionOutline([freeMovement("a", reps(8))], "a")[0].requiredSets).toBeNull();
  });
});

describe("sessionHeadline", () => {
  it("boş oturumda hareket eklemeye çağırır", () => {
    expect(sessionHeadline(sessionProgress([]))).toBe("Hareket ekleyerek başla");
  });

  it("kalan hareket sayısını söyler", () => {
    const movements = [repsMovement("a", reps(15, 15, 15)), repsMovement("b", []), repsMovement("c", [])];
    expect(sessionHeadline(sessionProgress(movements))).toBe("2 hareket kaldı");
  });

  it("hepsi bitince kutlar", () => {
    expect(sessionHeadline(sessionProgress([repsMovement("a", reps(15, 15, 15))]))).toBe("Tüm hedefler tamam");
  });
});

describe("restPlanFor", () => {
  it("aynı harekette programın süresini kullanır", () => {
    const movements = [repsMovement("a", reps(15), { restSeconds: 90 })];
    expect(restPlanFor(movements, "a")).toEqual({
      seconds: 90,
      kind: "same-movement",
      nextMovementId: "a",
      upNext: "A · 2. set",
      note: null,
    });
  });

  it("programdan gelmeyen harekette varsayılana düşer", () => {
    const plan = restPlanFor([repsMovement("a", reps(15))], "a");
    expect(plan.seconds).toBe(DEFAULT_REST_SECONDS);
  });

  it("hedefin altında kalan setten sonra süreyi uzatır", () => {
    const movements = [repsMovement("a", reps(15, 11), { restSeconds: 60 })];
    const plan = restPlanFor(movements, "a");
    expect(plan.seconds).toBe(60 + MISSED_TARGET_EXTRA_SECONDS);
    expect(plan.note).toBe(`Hedefin altında kaldın · ${MISSED_TARGET_EXTRA_SECONDS} sn ekledim`);
  });

  it("kısa tutuştan sonra da uzatır", () => {
    const plan = restPlanFor([holdMovement("a", holds(30), { restSeconds: 60 })], "a");
    expect(plan.seconds).toBe(90);
  });

  it("hedefsiz hareket tek setle bittiği için oturumu kapatır", () => {
    const plan = restPlanFor([freeMovement("a", reps(4))], "a");
    expect(plan.kind).toBe("session-complete");
  });

  it("hedefsiz hareket yarım kalmışsa standart dinlenme verir", () => {
    const movements = [freeMovement("a", reps(4)), repsMovement("b", [])];
    const plan = restPlanFor(movements, "a");
    expect(plan.kind).toBe("next-movement");
    expect(plan.note).toBeNull();
  });

  it("hareket bitince sonraki hareketin süresine geçer", () => {
    const movements = [
      repsMovement("a", reps(15, 15, 15), { restSeconds: 60 }),
      repsMovement("b", [], { restSeconds: 120 }),
    ];
    expect(restPlanFor(movements, "a")).toEqual({
      seconds: 120,
      kind: "next-movement",
      nextMovementId: "b",
      upNext: "B · 1. set",
      note: null,
    });
  });

  it("harekete geçerken önceki setin tutmaması süreyi uzatmaz", () => {
    // Yorgunluk arkada bırakılan harekette; yeni hareket kendi süresiyle başlar.
    const movements = [
      holdMovement("a", holds(60), { restSeconds: 45 }),
      repsMovement("b", [], { restSeconds: 45 }),
    ];
    expect(restPlanFor(movements, "a").note).toBeNull();
  });

  it("oturum bitince sayaç çalışmaz", () => {
    const movements = [repsMovement("a", reps(15, 15, 15))];
    expect(restPlanFor(movements, "a")).toEqual({
      seconds: 0,
      kind: "session-complete",
      nextMovementId: null,
      upNext: null,
      note: null,
    });
  });

  it("uzatma üst sınırı aşmaz", () => {
    const movements = [repsMovement("a", reps(2), { restSeconds: 290 })];
    expect(restPlanFor(movements, "a").seconds).toBe(MAX_REST_SECONDS);
  });

  it("saçma uzun program süresi de kırpılır", () => {
    const movements = [repsMovement("a", reps(15), { restSeconds: 6000 })];
    expect(restPlanFor(movements, "a").seconds).toBe(MAX_REST_SECONDS);
  });

  it("bilinmeyen hareket oturumu kilitlemez", () => {
    const movements = [repsMovement("a", [])];
    const plan = restPlanFor(movements, "silinmis");
    expect(plan.nextMovementId).toBe("a");
    expect(plan.kind).toBe("next-movement");
  });
});
