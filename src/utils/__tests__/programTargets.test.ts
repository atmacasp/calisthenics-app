import { formatProgramTarget, inferProgramTargetKind } from "../programTargets";

const spec = (
  over: Partial<{ targetSets: number | null; targetReps: number | null; targetDurationSeconds: number | null }>
) => ({ targetSets: null, targetReps: null, targetDurationSeconds: null, ...over });

describe("inferProgramTargetKind", () => {
  it("süre doluysa süre hedefi", () => {
    expect(inferProgramTargetKind(spec({ targetDurationSeconds: 30 }))).toBe("duration");
  });

  it("süre boşsa tekrar hedefi", () => {
    expect(inferProgramTargetKind(spec({ targetReps: 12 }))).toBe("reps_sets");
  });

  it("ikisi de boşsa tekrar hedefine düşer", () => {
    expect(inferProgramTargetKind(spec({ targetSets: 3 }))).toBe("reps_sets");
  });

  it("ikisi de doluysa süre kazanır", () => {
    // Eski kayıtlarda ikisi birden dolu kalmış olabilir; kural belirsiz kalmasın.
    expect(inferProgramTargetKind(spec({ targetReps: 10, targetDurationSeconds: 45 }))).toBe("duration");
  });
});

describe("formatProgramTarget", () => {
  it("süre hedefi", () => {
    expect(formatProgramTarget(spec({ targetSets: 3, targetDurationSeconds: 30 }))).toBe("3 set x 30 sn");
  });

  it("tekrar hedefi", () => {
    expect(formatProgramTarget(spec({ targetSets: 4, targetReps: 12 }))).toBe("4 set x 12 tekrar");
  });

  it("set sayısı yoksa 1 varsayılır", () => {
    expect(formatProgramTarget(spec({ targetDurationSeconds: 60 }))).toBe("1 set x 60 sn");
  });

  it("ne süre ne tekrar varsa sadece set yazılır", () => {
    // Eski hata: bu durumda "3 set x - tekrar" yazılıyordu.
    expect(formatProgramTarget(spec({ targetSets: 3 }))).toBe("3 set");
  });

  it("hiçbir alan yoksa '1 set'", () => {
    expect(formatProgramTarget(spec({}))).toBe("1 set");
  });

  it("sıfır tekrar 'x 0 tekrar' yazmaz", () => {
    expect(formatProgramTarget(spec({ targetSets: 2, targetReps: 0 }))).toBe("2 set");
  });
});
