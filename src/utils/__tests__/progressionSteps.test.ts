import { resolveStepStates } from "../progressionSteps";

const step = (done: boolean, unlocked: boolean) => ({ done, unlocked });

describe("resolveStepStates", () => {
  it("boş zincirde boş döner", () => {
    expect(resolveStepStates([])).toEqual([]);
  });

  it("hiç ilerleme yokken ilk basamak sıradakidir", () => {
    const states = resolveStepStates([step(false, true), step(false, false), step(false, false)]);
    expect(states).toEqual(["current", "locked", "locked"]);
  });

  it("yalnızca TEK basamak current olur", () => {
    const states = resolveStepStates([step(false, true), step(false, true), step(false, true)]);
    expect(states).toEqual(["current", "todo", "todo"]);
  });

  it("tamamlananları atlayıp ilk bitmemiş açık basamağı işaretler", () => {
    const states = resolveStepStates([step(true, true), step(true, true), step(false, true), step(false, false)]);
    expect(states).toEqual(["done", "done", "current", "locked"]);
  });

  it("kilitli basamak current olamaz, sıra sonraki açık basamağa geçer", () => {
    const states = resolveStepStates([step(false, false), step(false, true)]);
    expect(states).toEqual(["locked", "current"]);
  });

  it("zincir bittiyse current yoktur", () => {
    const states = resolveStepStates([step(true, true), step(true, true)]);
    expect(states).toEqual(["done", "done"]);
  });

  it("tamamlanmış basamak kilitli görünse de done kalır", () => {
    // Ön koşul sonradan değişmiş olabilir; yapılmış iş geri alınmaz.
    const states = resolveStepStates([step(true, false), step(false, true)]);
    expect(states).toEqual(["done", "current"]);
  });

  it("girdiyi değiştirmez", () => {
    const input = [step(false, true), step(false, true)];
    const snapshot = JSON.parse(JSON.stringify(input));
    resolveStepStates(input);
    expect(input).toEqual(snapshot);
  });
});
