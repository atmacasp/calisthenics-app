import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../types/movements";
import type { ProgramMovementWithName } from "../types/programs";
import { areAllPrerequisitesMet, formatTarget, isTargetMet } from "./targetProgress";

/** Programdaki bir satır için "artık bir üst basamağa geçebilirsin" önerisi. */
export interface ProgramUpgrade {
  /** Güncellenecek program_movements satırının id'si */
  programMovementId: string;
  dayOfWeek: number;
  groupName: string;
  currentName: string;
  nextMovement: MovementWithGroupAndPrerequisites;
  /** Yeni basamağın kendi hedefi, okunabilir hâlde */
  nextTargetLabel: string | null;
}

/**
 * Programın "seninle birlikte ilerlemesi" için: programdaki her hareketin
 * hedefi karşılandıysa ve aynı zincirde kilidi açık bir üst basamak varsa
 * onu önerir.
 *
 * Kurallar:
 * - Hedef karşılanmamışsa öneri yok (basamağı henüz hak etmedin).
 * - Zincirde ileri doğru yürünür: program birkaç basamak geride kalmışsa
 *   hedefi HENÜZ karşılanmamış ilk basamak önerilir, bir sonraki değil.
 * - Önerilen basamağın tüm ön koşulları karşılanmış olmalı (kilitliyse öneri yok).
 * - Aynı hareket programda zaten varsa tekrar önerilmez.
 *
 * isTargetMet ile aynı motoru kullanır; yani Antrenman sekmesindeki çubuk
 * dolduğu anda burada da öneri belirir.
 */
export function computeProgramUpgrades(
  daysMap: Record<number, ProgramMovementWithName[]>,
  movements: MovementWithGroupAndPrerequisites[],
  setLogMap: MovementSetLogMap
): ProgramUpgrade[] {
  const byId = new Map<string, MovementWithGroupAndPrerequisites>();
  const chains = new Map<string, MovementWithGroupAndPrerequisites[]>();

  for (const m of movements) {
    byId.set(m.id, m);
    const key = m.group_id ?? "";
    if (!chains.has(key)) chains.set(key, []);
    chains.get(key)!.push(m);
  }

  // Programda hâlihazırda bulunan hareketler - aynı hareketi ikinci kez önermeyelim.
  const usedMovementIds = new Set<string>();
  Object.values(daysMap).forEach((list) =>
    list.forEach((pm) => {
      if (pm.movementId) usedMovementIds.add(pm.movementId);
    })
  );

  const upgrades: ProgramUpgrade[] = [];

  Object.keys(daysMap)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((day) => {
      daysMap[day].forEach((pm) => {
        if (!pm.movementId) return;
        const current = byId.get(pm.movementId);
        if (!current) return;

        // Mevcut basamağın hedefi karşılanmadıysa terfi yok.
        if (!isTargetMet(current, setLogMap[current.id])) return;

        const chain = chains.get(current.group_id ?? "") ?? [];
        const index = chain.findIndex((m) => m.id === current.id);
        if (index === -1) return;

        const next = chain.slice(index + 1).find((m) => !isTargetMet(m, setLogMap[m.id]));
        if (!next) return; // zincirin sonundasın
        if (usedMovementIds.has(next.id)) return;
        if (!areAllPrerequisitesMet(next.prerequisites ?? [], setLogMap)) return;

        upgrades.push({
          programMovementId: pm.id,
          dayOfWeek: day,
          groupName: current.movement_groups?.name ?? "",
          currentName: pm.movementName,
          nextMovement: next,
          nextTargetLabel: formatTarget(next),
        });
      });
    });

  return upgrades;
}
