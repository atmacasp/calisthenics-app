
import type { MovementPrerequisite, MovementSetLogMap, SetLogEntry, TargetSpec } from "../types/movements";

/**
 * Bir hedefin, kullanıcının o harekete ait session bazlı set kayıtları içinde
 * karşılanıp karşılanmadığını hesaplar.
 *
 * - duration hedefi: HERHANGİ bir session'daki herhangi bir set, hedef süreye
 *   ulaşmış/geçmiş mi? (tutuşlar tek seferlik test edilir, art arda set gerekmez)
 * - reps_sets hedefi: TEK bir session içinde, hedef tekrara ulaşan set sayısı
 *   hedef set sayısına eşit ya da fazla mı? (örn. "3 set x 15 tekrar" ->
 *   aynı antrenmanda en az 3 set, her biri en az 15 tekrar olmalı)
 *
 * target_type tanımlı değilse (ör. eski/seed edilmemiş hareketler) kilit
 * uygulanamayacağından hedef "karşılanmış" sayılır — eksik veri kullanıcıyı
 * haksız yere kilitlememeli.
 */
export function isTargetMet(
  target: TargetSpec,
  sessionSets: Record<string, SetLogEntry[]> | undefined
): boolean {
  if (!target.target_type) return true;
  if (!sessionSets) return false;

  if (target.target_type === "duration") {
    if (!target.target_duration_seconds) return true;
    return Object.values(sessionSets).some((sets) =>
      sets.some((s) => (s.duration_seconds ?? 0) >= target.target_duration_seconds!)
    );
  }

  // reps_sets
  if (!target.target_reps) return true;
  const requiredSets = target.target_sets ?? 1;
  return Object.values(sessionSets).some(
    (sets) => sets.filter((s) => (s.reps ?? 0) >= target.target_reps!).length >= requiredSets
  );
}

/**
 * Bir ön koşul satırının geçerli hedefini döner: movement_prerequisites satırında
 * bir override varsa onu kullanır, yoksa prerequisite hareketin kendi hedefine düşer.
 * (movement/[id].tsx'teki eski `overrideTarget` mantığıyla aynı kural — tek yerde toplandı.)
 */
export function getPrerequisiteTarget(p: MovementPrerequisite): TargetSpec {
  const pm = p.prerequisite_movement;
  return {
    target_type: pm.target_type,
    target_sets: p.target_sets ?? pm.target_sets,
    target_reps: p.target_reps ?? pm.target_reps,
    target_duration_seconds: p.target_duration_seconds ?? pm.target_duration_seconds,
  };
}

export function isPrerequisiteMet(p: MovementPrerequisite, setLogMap: MovementSetLogMap): boolean {
  const target = getPrerequisiteTarget(p);
  return isTargetMet(target, setLogMap[p.prerequisite_movement.id]);
}

/**
 * AND mantığı: bir basamağın kilidi açılması için TÜM ön koşulların karşılanmış
 * olması gerekir. Ön koşul yoksa zaten kilitli değildir.
 *
 * Not: Şu an sadece zincirlerin ilk basamakları Temel Güç hareketlerine
 * prerequisite ile bağlı. İleride ara basamaklara da (örn. adım 2 -> adım 1)
 * movement_prerequisites satırı eklendiğinde bu fonksiyon hiçbir değişiklik
 * gerektirmeden aynı şekilde çalışır.
 */
export function areAllPrerequisitesMet(
  prerequisites: MovementPrerequisite[],
  setLogMap: MovementSetLogMap
): boolean {
  if (!prerequisites.length) return true;
  return prerequisites.every((p) => isPrerequisiteMet(p, setLogMap));
}

/**
 * Bir hedefi ekranda gösterilecek okunabilir metne çevirir (ör. "3 set x 15 tekrar",
 * "30 saniye tutuş"). movement/[id].tsx ve workout önerisi motoru aynı fonksiyonu kullanır.
 */
export function formatTarget(t: TargetSpec | null | undefined): string | null {
  if (!t?.target_type) return null;
  if (t.target_type === "reps_sets" && t.target_sets && t.target_reps) {
    return `${t.target_sets} set x ${t.target_reps} tekrar`;
  }
  if (t.target_type === "duration" && t.target_duration_seconds) {
    return `${t.target_duration_seconds} saniye tutuş`;
  }
  return null;
}

/** Hedefe ne kadar yaklaşıldığı - ekranda gösterilmeye hazır hâlde. */
export interface TargetProgress {
  /** 0..1 arası doluluk */
  ratio: number;
  /** "14 / 20 sn" ya da "2 / 3 set x 15 tekrar" */
  label: string;
  /** Hedef tekrara hiç ulaşılamadıysa nerede olunduğunu açıklar */
  detail: string | null;
  met: boolean;
}

/**
 * isTargetMet ile AYNI kuralı kullanır, sadece "evet/hayır" yerine mesafeyi
 * döner - böylece çubuk dolduğunda hedef gerçekten karşılanmış olur.
 *
 * duration : herhangi bir setteki en uzun tutuş / hedef süre
 * reps_sets: TEK bir antrenmanda hedef tekrara ulaşan en fazla set sayısı /
 *            hedef set sayısı. Hedef tekrara hiç ulaşılmadıysa çubuk 0 kalır,
 *            bu yüzden detail alanında en iyi tekrar ayrıca gösterilir.
 */
export function computeTargetProgress(
  target: TargetSpec | null | undefined,
  sessionSets: Record<string, SetLogEntry[]> | undefined
): TargetProgress | null {
  if (!target?.target_type) return null;

  const allSets: SetLogEntry[] = [];
  if (sessionSets) {
    Object.values(sessionSets).forEach((sets) => sets.forEach((s) => allSets.push(s)));
  }

  if (target.target_type === "duration") {
    const goal = target.target_duration_seconds;
    if (!goal) return null;
    const best = allSets.reduce((max, s) => Math.max(max, s.duration_seconds ?? 0), 0);
    return {
      ratio: Math.min(1, best / goal),
      label: `${best} / ${goal} sn`,
      detail: null,
      met: best >= goal,
    };
  }

  const goalReps = target.target_reps;
  if (!goalReps) return null;
  const goalSets = target.target_sets ?? 1;

  const bestQualifyingSets = sessionSets
    ? Object.values(sessionSets).reduce(
        (max, sets) => Math.max(max, sets.filter((s) => (s.reps ?? 0) >= goalReps).length),
        0
      )
    : 0;
  const bestReps = allSets.reduce((max, s) => Math.max(max, s.reps ?? 0), 0);

  return {
    ratio: Math.min(1, bestQualifyingSets / goalSets),
    label: `${Math.min(bestQualifyingSets, goalSets)} / ${goalSets} set x ${goalReps} tekrar`,
    detail: bestQualifyingSets < goalSets && bestReps > 0 ? `En iyi setin: ${bestReps} tekrar` : null,
    met: bestQualifyingSets >= goalSets,
  };
}
