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
