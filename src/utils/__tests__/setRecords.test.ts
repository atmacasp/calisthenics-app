/// <reference types="jest" />
import { computeRecordHolderIds, setMeetsOwnTarget, type PersonalBest, type RecordSet } from "../setRecords";

const none: PersonalBest = { maxReps: 0, maxDuration: 0, maxWeight: 0 };

const repSet = (id: string, reps: number): RecordSet => ({ id, reps });
const holdSet = (id: string, duration_seconds: number): RecordSet => ({ id, duration_seconds });

describe("computeRecordHolderIds", () => {
  it("set yoksa rozet de yok", () => {
    expect(computeRecordHolderIds([], none).size).toBe(0);
  });

  it("rekoru geçen tek seti işaretler", () => {
    const ids = computeRecordHolderIds([repSet("a", 8)], { ...none, maxReps: 5 });
    expect([...ids]).toEqual(["a"]);
  });

  it("rozet sonraki daha iyi sete kayar, ikisinde birden durmaz", () => {
    const ids = computeRecordHolderIds([repSet("a", 8), repSet("b", 12)], { ...none, maxReps: 5 });
    expect([...ids]).toEqual(["b"]);
  });

  it("sonraki set daha düşükse rozet yerinde kalır", () => {
    const ids = computeRecordHolderIds([repSet("a", 12), repSet("b", 9)], { ...none, maxReps: 5 });
    expect([...ids]).toEqual(["a"]);
  });

  it("eşitlik rekor değildir", () => {
    // Baseline'a eşit set "geçti" değil "tekrarladı"dır.
    expect(computeRecordHolderIds([repSet("a", 10)], { ...none, maxReps: 10 }).size).toBe(0);
  });

  it("rekorun altındaki setler işaretlenmez", () => {
    expect(computeRecordHolderIds([repSet("a", 4), repSet("b", 7)], { ...none, maxReps: 10 }).size).toBe(0);
  });

  it("her metrik kendi rozetini taşır, aynı anda üçü birden olabilir", () => {
    const sets: RecordSet[] = [
      { id: "a", reps: 12 },
      { id: "b", duration_seconds: 40 },
      { id: "c", added_weight_kg: 5 },
    ];
    const ids = computeRecordHolderIds(sets, none);
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(true);
    expect(ids.has("c")).toBe(true);
  });

  it("tek set birden fazla metrikte rekor kırabilir", () => {
    const ids = computeRecordHolderIds([{ id: "a", reps: 12, added_weight_kg: 5 }], none);
    expect([...ids]).toEqual(["a"]);
  });

  it("bir metrikteki rekor diğerinin rozetini düşürmez", () => {
    const sets: RecordSet[] = [
      { id: "a", reps: 12 },
      { id: "b", duration_seconds: 40 },
      { id: "c", reps: 15 },
    ];
    const ids = computeRecordHolderIds(sets, none);
    expect(ids.has("a")).toBe(false);
    expect(ids.has("b")).toBe(true);
    expect(ids.has("c")).toBe(true);
  });

  it("boş değerler rekor kırmaz", () => {
    expect(computeRecordHolderIds([{ id: "a", reps: null, duration_seconds: null }], none).size).toBe(0);
  });

  it("tutuşta süre rekoru ayrı sayılır", () => {
    const ids = computeRecordHolderIds([holdSet("a", 30), holdSet("b", 45)], { ...none, maxDuration: 35 });
    expect([...ids]).toEqual(["b"]);
  });
});

describe("setMeetsOwnTarget", () => {
  it("hedefe ulaşan tekrar tutar", () => {
    expect(setMeetsOwnTarget(repSet("a", 8), "reps_sets", 8, null)).toBe(true);
  });

  it("hedefi geçen tekrar da tutar", () => {
    expect(setMeetsOwnTarget(repSet("a", 20), "reps_sets", 8, null)).toBe(true);
  });

  it("hedefin altındaki tekrar tutmaz", () => {
    expect(setMeetsOwnTarget(repSet("a", 7), "reps_sets", 8, null)).toBe(false);
  });

  it("tutuşta süreye bakar", () => {
    expect(setMeetsOwnTarget(holdSet("a", 45), "duration", null, 45)).toBe(true);
    expect(setMeetsOwnTarget(holdSet("a", 44), "duration", null, 45)).toBe(false);
  });

  it("tutuşta tekrar alanına bakmaz", () => {
    expect(setMeetsOwnTarget({ id: "a", reps: 99 }, "duration", null, 45)).toBe(false);
  });

  it("hedefi olmayan harekette tik verilmez", () => {
    expect(setMeetsOwnTarget(repSet("a", 50), null, null, null)).toBe(false);
    expect(setMeetsOwnTarget(repSet("a", 50), "reps_sets", null, null)).toBe(false);
  });

  it("değeri olmayan set tutmaz", () => {
    expect(setMeetsOwnTarget({ id: "a" }, "reps_sets", 8, null)).toBe(false);
  });
});
