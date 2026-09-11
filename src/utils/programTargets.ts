/**
 * Program satırlarının hedef kuralı.
 *
 * movements tablosunda target_type sütunu var ama program_movements'ta YOK:
 * orada hedefin türü, hangi alanın dolu olduğundan çıkarılıyor. Bu çıkarım
 * ekranlarda ayrı ayrı yazılmıştı ve davranışları ayrışmıştı - aynı program
 * satırı program detayında "3 set", antrenman sekmesinde "3 set x - tekrar"
 * görünebiliyordu. Kural artık tek yerde.
 */

/** Bir program satırının hedefini tanımlayan alanlar (kamelCase, servis çıktısı). */
export interface ProgramTargetSpec {
  targetSets: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
}

export type ProgramTargetKind = "duration" | "reps_sets";

/**
 * Süre dolu ise süre hedefi, değilse tekrar hedefi.
 *
 * Sıra önemli: bir satırda hem süre hem tekrar doluysa süre kazanır, çünkü
 * builder süre hedefi seçildiğinde tekrarı null'lamaya çalışır ama eski
 * kayıtlarda ikisi birden dolu kalmış olabilir.
 */
export function inferProgramTargetKind(item: ProgramTargetSpec): ProgramTargetKind {
  return item.targetDurationSeconds ? "duration" : "reps_sets";
}

/**
 * "3 set x 30 sn" / "3 set x 12 tekrar" / "3 set".
 *
 * Set sayısı yoksa 1 varsayılır (tek setlik tutuşlar böyle kaydedilmiş).
 * Ne süre ne tekrar varsa sadece set yazılır - "x - tekrar" gibi yarım bir
 * metin çıkmaz.
 */
export function formatProgramTarget(item: ProgramTargetSpec): string {
  const sets = item.targetSets ?? 1;
  if (item.targetDurationSeconds) return `${sets} set x ${item.targetDurationSeconds} sn`;
  if (item.targetReps) return `${sets} set x ${item.targetReps} tekrar`;
  return `${sets} set`;
}
