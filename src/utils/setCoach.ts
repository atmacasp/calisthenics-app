/**
 * Antrenman sırasında "sırada ne var" ve "az önceki set nasıldı" sorularının
 * cevabı.
 *
 * Aktif Antrenman ekranı bugüne kadar boş bir form gösteriyordu: kullanıcı kaçıncı
 * sette olduğunu, kaç tekrar yapması gerektiğini kendi aklında tutuyordu. Bu modül
 * o işi devralıyor - ekran artık her an bir sonraki seti reçete olarak gösteriyor.
 *
 * HEDEFİN TANIMI (targetProgress.isTargetMet ile AYNI olmak zorunda, çünkü bir
 * sonraki basamağın kilidini o açıyor):
 *
 *   "3 set x 8 tekrar" = aynı antrenmanda, HER BİRİ en az 8 tekrar olan 3 set.
 *   Toplam 24 tekrar DEĞİL: 8+7+9 hedefi karşılamaz, 8+8+8 karşılar.
 *
 *   "30 saniye tutuş" = tek bir sette 30 saniyeye ulaşmak yeter; tutuşlarda
 *   set sayısı şartı yok (seed'de duration hedeflerinin target_sets'i zaten null).
 *
 * Bu modül önce sadece set SAYISINI sayıyordu; 8, 7, 1, 3, 4 atan kullanıcıya
 * "hedefi tamamladın, bu ekstra" derken hemen altında "hedefe 4 tekrar kaldı"
 * yazıyordu. İki satır iki farklı kural konuşuyordu - düzeltilen buydu.
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
  /** Girilecek setin gerçek sırası (1 tabanlı) - tutmayan setler de sayılır. */
  setNumber: number;
  /** Hedefin istediği "tutan set" sayısı; hedef yoksa null. Tutuşlarda 1. */
  requiredSets: number | null;
  /** Hedef değeri TUTAN set sayısı. Noktaları bu dolduruyor. */
  qualifiedSets: number;
  /** Bu set için hedef değer (tekrar ya da saniye); yoksa null. */
  targetValue: number | null;
  /** Hedef karşılandı mı - kilidi açan kuralın birebir aynısı. */
  targetComplete: boolean;
  /** Hedef zaten tamamken atılan set. */
  isExtraSet: boolean;
  /** Giriş alanına önerilecek değer. Boş string = öneri yok. */
  prefill: string;
  /** "3. set" gibi başlık. */
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

function targetValueOf(movement: CoachMovement, kind: SetKind): number | null {
  return (kind === "duration" ? movement.targetDurationSeconds : movement.targetReps) ?? null;
}

/**
 * Hedefin kaç TUTAN set istediği.
 *
 * Tutuşlarda 1: isTargetMet duration dalında set sayısına hiç bakmıyor, tek bir
 * yeterli tutuş kilidi açıyor. Tekrarlı hedeflerde target_sets (yoksa 1).
 */
function requiredSetsOf(movement: CoachMovement, kind: SetKind): number | null {
  if (targetValueOf(movement, kind) == null) return null;
  if (kind === "duration") return 1;
  return movement.targetSets ?? 1;
}

/**
 * Tek bir setin hedefe oranı (0-1), set çiplerindeki mini çubuk için.
 *
 * Hedef yoksa null: çubuk çizilmez. 1'i geçmez - hedefi ikiye katlayan set de
 * dolu çubuk gösterir, "tuttu" bilgisini çubuk değil çerçeve taşıyor.
 */
export function setValueRatio(value: number | null | undefined, target: number | null | undefined): number | null {
  if (target == null || target <= 0) return null;
  if (value == null || value <= 0) return 0;
  return Math.min(1, value / target);
}

/** Hedef değeri tutan set sayısı. isTargetMet'in saydığı şeyin aynısı. */
export function countQualifyingSets(movement: CoachMovement): number {
  const kind = setKindOf(movement);
  const target = targetValueOf(movement, kind);
  if (target == null) return 0;
  return movement.sets.filter((s) => (valueOf(s, kind) ?? 0) >= target).length;
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
  const targetValue = targetValueOf(movement, kind);
  const requiredSets = requiredSetsOf(movement, kind);
  const qualifiedSets = countQualifyingSets(movement);
  const targetComplete = requiredSets != null && qualifiedSets >= requiredSets;
  const setNumber = movement.sets.length + 1;

  const lastValue = valueOf(movement.sets[movement.sets.length - 1], kind);
  const suggested = targetValue ?? lastValue;

  let hint: string | null = null;
  if (targetComplete) {
    hint = "Hedefi tamamladın, bu ekstra set";
  } else if (targetValue != null && kind === "duration") {
    // Tek tutuş yettiği için set sayacı yok; "tek" kelimesi bunu söylüyor.
    hint = `Hedef: tek sette ${targetValue} saniye`;
  } else if (targetValue != null && requiredSets != null) {
    // İpucu yalnızca TANIMI söylüyor; "kaçı tamam" bilgisi qualifiedSets/
    // requiredSets ile ekranın sayaç ve çubuğunda duruyor. İkisi de metinde
    // olunca aynı kesir iki kez yazılıyordu.
    hint = requiredSets > 1 ? `Hedef: her set ${targetValue} tekrar` : `Hedef: ${targetValue} tekrar`;
  }

  return {
    kind,
    setNumber,
    requiredSets,
    qualifiedSets,
    targetValue,
    targetComplete,
    isExtraSet: targetComplete,
    prefill: suggested != null ? String(suggested) : "",
    headline: `${setNumber}. set`,
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

  const target = targetValueOf(movement, kind);
  const unit = unitOf(kind);

  if (target != null) {
    const requiredSets = requiredSetsOf(movement, kind) ?? 1;
    const qualified = countQualifyingSets(movement);

    if (value >= target) {
      if (qualified >= requiredSets) return "Hedefi tamamladın 🎯";
      const left = requiredSets - qualified;
      return `Hedef tuttu · ${left} tam set kaldı`;
    }
    // "Bu sette" şart: eksik olan bu setin değeri, hedefin tamamı değil.
    return `Bu sette hedefe ${target - value} ${unit} kaldı`;
  }

  // Hedefi olmayan hareketlerde ölçüt bir önceki settir.
  const previous = valueOf(sets[sets.length - 2], kind);
  if (previous == null) return null;
  if (value > previous) return `Bir önceki setten ${value - previous} ${unit} fazla`;
  if (value === previous) return "Bir önceki setle aynı";
  return `Bir önceki setten ${previous - value} ${unit} az`;
}
