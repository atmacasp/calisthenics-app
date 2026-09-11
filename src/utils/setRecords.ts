/**
 * "Bu set rekor mu, hedefi tuttu mu" - set çiplerindeki iki rozetin kuralı.
 *
 * Bu iki kural aktif antrenman ekranının içinde, testsiz duruyordu. Ekranın
 * içinde kaldıkları sürece bozulduklarını ancak cihazda fark edebiliyorduk;
 * buraya taşınınca test kapsamına girdiler (AGENTS.md kuralı).
 *
 * setCoach'tan ayrı duruyorlar çünkü farklı bir soruya cevap veriyorlar:
 * setCoach "sırada ne var" der, burası "az önceki setler nasıldı" der.
 */

/** Antrenman BAŞLAMADAN önceki kişisel rekorlar. */
export interface PersonalBest {
  maxReps: number;
  maxDuration: number;
  maxWeight: number;
}

/** LoggedSet bu şekle yapısal olarak uyuyor; utils store'a bağlanmasın diye ayrı tanımlı. */
export interface RecordSet {
  id: string;
  reps?: number | null;
  duration_seconds?: number | null;
  added_weight_kg?: number | null;
}

/**
 * Bir hareketin bu antrenmandaki setlerini, antrenman öncesi kişisel rekorla
 * (baseline) karşılaştırarak sırayla tarar. Her metrik (tekrar/süre/ek kg) için
 * SADECE o metrikte hâlâ en yüksek değeri tutan TEK seti "rekor sahibi" işaretler.
 * Böylece bir set öncekini geçtiğinde rozet otomatik olarak yeni sete kayar,
 * aynı anda birden fazla set "Yeni Rekor!" göstermez.
 *
 * Eşitlik rekor saymıyor: baseline'a eşit set "geçti" değil "tekrarladı"dır.
 */
export function computeRecordHolderIds(sets: RecordSet[], baseline: PersonalBest): Set<string> {
  let bestReps = baseline.maxReps;
  let repsHolder: string | null = null;
  let bestDuration = baseline.maxDuration;
  let durationHolder: string | null = null;
  let bestWeight = baseline.maxWeight;
  let weightHolder: string | null = null;

  for (const s of sets) {
    if (s.reps != null && s.reps > bestReps) {
      bestReps = s.reps;
      repsHolder = s.id;
    }
    if (s.duration_seconds != null && s.duration_seconds > bestDuration) {
      bestDuration = s.duration_seconds;
      durationHolder = s.id;
    }
    if (s.added_weight_kg != null && s.added_weight_kg > bestWeight) {
      bestWeight = s.added_weight_kg;
      weightHolder = s.id;
    }
  }

  return new Set([repsHolder, durationHolder, weightHolder].filter((x): x is string => !!x));
}

/**
 * Bir setin, hareketin KENDİ hedefini karşılayıp karşılamadığı (anlık, tek set bazlı).
 *
 * Hedefi olmayan harekette false döner - tik yoksa kullanıcı "tuttu mu" diye
 * bakmaz; hedefi olmayan bir harekette tik vermek hedefin anlamını silerdi.
 */
export function setMeetsOwnTarget(
  s: RecordSet,
  targetType: "reps_sets" | "duration" | null | undefined,
  targetReps: number | null | undefined,
  targetDurationSeconds: number | null | undefined
): boolean {
  if (targetType === "duration" && targetDurationSeconds) {
    return (s.duration_seconds ?? 0) >= targetDurationSeconds;
  }
  if (targetType === "reps_sets" && targetReps) {
    return (s.reps ?? 0) >= targetReps;
  }
  return false;
}
