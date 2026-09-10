/**
 * Progression zincirindeki bir basamağın görsel durumu.
 *
 * "current", zincirde çalışılabilir durumdaki İLK bitmemiş basamak - ekranın
 * kullanıcıya "şimdi bunu yap" dediği tek yer. Geri kalan açık basamaklar
 * "todo": erişilebilir ama sıradaki değil.
 */
export type StepState = "done" | "current" | "todo" | "locked";

export interface StepInput {
  /** Hedefi tutmuş mu (isTargetMet). */
  done: boolean;
  /** Ön koşulları sağlanmış mı (areAllPrerequisitesMet). */
  unlocked: boolean;
}

/**
 * Her basamağa durumunu atar.
 *
 * Sırayı değiştirmez, girdiyi kopyalamaz; yalnızca "current"ı bulmak için
 * tek geçiş yapar. Tamamlanmış bir basamak kilitli görünse bile (ön koşulu
 * sonradan değişmiş olabilir) "done" kalır: yapılmış iş geri alınmaz.
 */
export function resolveStepStates(steps: StepInput[]): StepState[] {
  let currentUsed = false;

  return steps.map((step) => {
    if (step.done) return "done";
    if (!step.unlocked) return "locked";
    if (!currentUsed) {
      currentUsed = true;
      return "current";
    }
    return "todo";
  });
}
