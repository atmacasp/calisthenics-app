/**
 * Antrenman sırasında "sırada ne var" ve "az önceki set nasıldı" sorularının
 * cevabı.
 *
 * Aktif Antrenman ekranı bugüne kadar boş bir form gösteriyordu: kullanıcı kaçıncı
 * sette olduğunu, kaç tekrar yapması gerektiğini kendi aklında tutuyordu. Bu modül
 * o işi devralıyor - ekran artık her an bir sonraki seti reçete olarak gösteriyor.
 *
 * Saf tutuluyor (store/servis bilmiyor) çünkü uygulamanın "koç sesi" burada
 * tanımlanıyor ve testlerle korunması gerekiyor.
 */

export interface CoachSet {
  reps?: number | null;
  duration_seconds?: number | null;
  added_weight_kg?: number | null;
}

/** SessionMovement bu şekle yapısal olarak uyuyor; utils store'a bağlanmasın diye ayrı tanımlı. */
export interface CoachMovement {
  targetType?: "reps_sets" | "duration" | null;
  targetSets?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  sets: CoachSet[];
}

export type SetKind = "reps" | "duration";

export interface SetPlan {
  kind: SetKind;
  /** Girilecek setin sırası (1 tabanlı). */
  setNumber: number;
  /** Hedefteki set sayısı; hedef yoksa null. */
  totalSets: number | null;
  /** Hedefteki set sayısı aşıldı mı - "ekstra set" durumu. */
  isExtraSet: boolean;
  /** Bu set için hedef değer (tekrar ya da saniye); yoksa null. */
  targetValue: number | null;
  /** Giriş alanına önerilecek değer. Boş string = öneri yok. */
  prefill: string;
  /** "Set 2 / 3" gibi başlık. */
  headline: string;
  /** Başlığın altındaki tek satırlık yönlendirme. */
  hint: string | null;
}

function valueOf(set: CoachSet | undefined, kind: SetKind): number | null {
  if (!set) return null;
  const raw = kind === "duration" ? set.duration_seconds : set.reps;
  return raw == null || raw <= 0 ? null : raw;
}

function unitOf(kind: SetKind): string {
  return kind === "duration" ? "saniye" : "tekrar";
}

export function setKindOf(movement: CoachMovement): SetKind {
  return movement.targetType === "duration" ? "duration" : "reps";
}

/**
 * Sıradaki setin reçetesi.
 *
 * Öneri sırası: hareketin kendi hedefi -> bu antrenmanda yapılan son set -> boş.
 * İkinci basamak önemli: hedefi olmayan bir harekette kullanıcı ilk sette ne
 * girdiyse sonraki setlerde onu tekrar yazmak zorunda kalmıyor.
 */
export function buildSetPlan(movement: CoachMovement): SetPlan {
  const kind = setKindOf(movement);
  const targetValue = (kind === "duration" ? movement.targetDurationSeconds : movement.targetReps) ?? null;
  const totalSets = movement.targetSets ?? null;
  const setNumber = movement.sets.length + 1;
  const isExtraSet = totalSets != null && setNumber > totalSets;

  const lastValue = valueOf(movement.sets[movement.sets.length - 1], kind);
  const suggested = targetValue ?? lastValue;

  let hint: string | null = null;
  if (isExtraSet) {
    hint = "Hedefi tamamladın, bu ekstra";
  } else if (targetValue != null) {
    hint = `Hedef ${targetValue} ${unitOf(kind)}`;
  }

  return {
    kind,
    setNumber,
    totalSets,
    isExtraSet,
    targetValue,
    prefill: suggested != null ? String(suggested) : "",
    headline: totalSets != null && !isExtraSet ? `Set ${setNumber} / ${totalSets}` : `Set ${setNumber}`,
    hint,
  };
}

/**
 * Kaydedilen SON set hakkında tek satırlık geri bildirim.
 *
 * Kişisel rekor durumu bilerek burada yok - onun kendi rozeti var
 * (computeRecordHolderIds), iki yerden aynı şeyi söylemek gürültü olurdu.
 */
export function lastSetFeedback(movement: CoachMovement): string | null {
  const sets = movement.sets;
  if (sets.length === 0) return null;

  const kind = setKindOf(movement);
  const value = valueOf(sets[sets.length - 1], kind);
  if (value == null) return null;

  const target = (kind === "duration" ? movement.targetDurationSeconds : movement.targetReps) ?? null;
  const totalSets = movement.targetSets ?? null;
  const unit = unitOf(kind);

  if (target != null) {
    if (value >= target) {
      const metCount = sets.filter((s) => (valueOf(s, kind) ?? 0) >= target).length;
      if (totalSets != null && metCount >= totalSets) return "Hedefi tamamladın 🎯";
      if (totalSets != null) {
        const left = totalSets - metCount;
        return `Hedef tuttu · ${left} set kaldı`;
      }
      return "Hedef tuttu";
    }
    return `Hedefe ${target - value} ${unit} kaldı`;
  }

  // Hedefi olmayan hareketlerde ölçüt bir önceki settir.
  const previous = valueOf(sets[sets.length - 2], kind);
  if (previous == null) return null;
  if (value > previous) return `Bir önceki setten ${value - previous} ${unit} fazla`;
  if (value === previous) return "Bir önceki setle aynı";
  return `Bir önceki setten ${previous - value} ${unit} az`;
}
