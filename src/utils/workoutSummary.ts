import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../types/movements";
import { areAllPrerequisitesMet, isTargetMet } from "./targetProgress";

export interface AchievedMovement {
  id: string;
  name: string;
  groupName: string;
}

export interface WorkoutAchievements {
  /** Hedefi ilk kez BU antrenmanla karşılanan hareketler */
  completedTargets: AchievedMovement[];
  /** Ön koşulları bu antrenmanla tamamlanıp kilidi açılan basamaklar */
  unlockedSteps: AchievedMovement[];
}

function toRef(m: MovementWithGroupAndPrerequisites): AchievedMovement {
  return { id: m.id, name: m.name, groupName: m.movement_groups?.name ?? "Diğer" };
}

/**
 * Bir antrenmanın progression'a katkısını, aynı motoru iki kez çalıştırıp
 * farkını alarak hesaplar:
 *   before = kullanıcının bu antrenman HARİÇ tüm setleri
 *   after  = bu antrenman dahil tüm setleri
 *
 * Böylece "zaten karşılanmış" hedefler tekrar kutlanmaz; sadece bu antrenmanla
 * gerçekten değişenler raporlanır.
 */
export function computeWorkoutAchievements(
  movements: MovementWithGroupAndPrerequisites[],
  before: MovementSetLogMap,
  after: MovementSetLogMap
): WorkoutAchievements {
  const completedTargets: AchievedMovement[] = [];
  const unlockedSteps: AchievedMovement[] = [];

  for (const m of movements) {
    const wasMet = isTargetMet(m, before[m.id]);
    const nowMet = isTargetMet(m, after[m.id]);
    if (!wasMet && nowMet) completedTargets.push(toRef(m));

    const prerequisites = m.prerequisites ?? [];
    if (prerequisites.length === 0) continue;

    const wasUnlocked = areAllPrerequisitesMet(prerequisites, before);
    const nowUnlocked = areAllPrerequisitesMet(prerequisites, after);
    // Hedefi de aynı anda karşılanmış bir basamağı "kilidi açıldı" diye
    // duyurmak anlamsız - kullanıcı onu zaten geçmiş olur.
    if (!wasUnlocked && nowUnlocked && !nowMet) unlockedSteps.push(toRef(m));
  }

  return { completedTargets, unlockedSteps };
}
