import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../types/movements";
import type { ProgramMovementWithName } from "../types/programs";
import { areAllPrerequisitesMet, formatTarget, isTargetMet } from "./targetProgress";

/** Programdaki bir satır için "artık bir üst basamağa geçebilirsin" önerisi. */
export interface ProgramUpgrade {
  /** Güncellenecek program_movements satırının id'si */
  programMovementId: string;
  dayOfWeek: number;
  groupName: string;
  /** Programda şu anda duran hareketin id değeri — tamamlanan hedeflerle eşleştirmek için */
  currentMovementId: string;
  currentName: string;
  nextMovement: MovementWithGroupAndPrerequisites;
  /** Yeni basamağın kendi hedefi, okunabilir hâlde */
  nextTargetLabel: string | null;
}

/** Programda hiç bulunmayan, kilidi açılmış bir zincir basamağı için "ekle" önerisi. */
export interface ProgramAddition {
  movement: MovementWithGroupAndPrerequisites;
  groupName: string;
  targetLabel: string | null;
  /** Önerilen gün (1=Pazartesi ... 7=Pazar) */
  dayOfWeek: number;
  /**
   * Günün neden seçildiği: "prerequisite" -> bu basamağın ön koşulu o gün
   * çalışılıyor; "lightest" -> ön koşul programda yok, en az hareketi olan gün.
   */
  reason: "prerequisite" | "lightest";
}

/**
 * DEĞİŞTİRME önerileri (terfi).
 *
 * Sadece gerçek progression zincirleri için üretilir. Temel Güç (foundation)
 * hareketleri bilinçli olarak dışarıda: migration 0006'da da yazdığı gibi o
 * kategoride sıralı bir kilit ilişkisi yoktur - Şınav'ı geçmek Barfiks'e
 * "terfi" etmek değildir. Temel Güç hedeflerini tamamlamak YENİ ZİNCİR açar,
 * bunun karşılığı computeProgramAdditions'tır.
 *
 * Kurallar:
 * - Mevcut hareketin hedefi karşılanmamışsa öneri yok.
 * - Zincirde ileri yürünür: hedefi HENÜZ karşılanmamış ilk basamak önerilir.
 * - Önerilen basamağın tüm ön koşulları karşılanmış olmalı.
 * - Aynı hareket programda zaten varsa tekrar önerilmez.
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

        // Temel Güç hareketleri zincir değildir - burada terfi aranmaz.
        if (current.movement_type !== "progression") return;
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
          currentMovementId: current.id,
          currentName: pm.movementName,
          nextMovement: next,
          nextTargetLabel: formatTarget(next),
        });
      });
    });

  return upgrades;
}

/**
 * EKLEME önerileri.
 *
 * "Temel Güç hedeflerini tamamladın, şu zincire başlayabilirsin" durumunun
 * programdaki karşılığı. Kilidi açık, hedefi henüz karşılanmamış ve programda
 * bulunmayan basamaklardan her kategori için EN DÜŞÜK sıradakini önerir.
 * Kategoriden zaten bir hareket programdaysa o kategori atlanır - orayı
 * computeProgramUpgrades yönetir.
 *
 * onlyIds verilirse (antrenman özeti gibi "bu antrenmanda ne değişti" bağlamı)
 * sadece o hareketler önerilir; verilmezse birikmiş tüm fırsatlar döner.
 */
export function computeProgramAdditions(
  daysMap: Record<number, ProgramMovementWithName[]>,
  movements: MovementWithGroupAndPrerequisites[],
  setLogMap: MovementSetLogMap,
  onlyIds?: string[]
): ProgramAddition[] {
  const days = Object.keys(daysMap)
    .map(Number)
    .sort((a, b) => a - b);
  if (days.length === 0) return [];

  const byId = new Map(movements.map((m) => [m.id, m] as const));
  const usedMovementIds = new Set<string>();
  const groupsInProgram = new Set<string>();

  days.forEach((day) =>
    daysMap[day].forEach((pm) => {
      if (!pm.movementId) return;
      usedMovementIds.add(pm.movementId);
      const m = byId.get(pm.movementId);
      if (m && m.movement_type === "progression" && m.group_id) groupsInProgram.add(m.group_id);
    })
  );

  // En az hareketi olan gün - ön koşul programda bulunamazsa buraya eklenir.
  const lightestDay = days.reduce((best, d) => (daysMap[d].length < daysMap[best].length ? d : best), days[0]);

  // Önce her kategori için "sıradaki uygun basamak" belirlenir; onlyIds filtresi
  // SONRA uygulanır ki filtre yüzünden zincirin ilerisindeki bir basamak öne geçmesin.
  const firstByGroup = new Map<string, MovementWithGroupAndPrerequisites>();
  for (const m of movements) {
    if (m.movement_type !== "progression") continue;
    const groupId = m.group_id ?? "";
    if (!groupId || groupsInProgram.has(groupId) || firstByGroup.has(groupId)) continue;
    if (usedMovementIds.has(m.id)) continue;
    if (isTargetMet(m, setLogMap[m.id])) continue;
    if (!areAllPrerequisitesMet(m.prerequisites ?? [], setLogMap)) continue;
    firstByGroup.set(groupId, m);
  }

  const filter = onlyIds ? new Set(onlyIds) : null;
  const additions: ProgramAddition[] = [];

  firstByGroup.forEach((m) => {
    if (filter && !filter.has(m.id)) return;

    const prerequisiteIds = new Set((m.prerequisites ?? []).map((p) => p.prerequisite_movement.id));
    const hostDay = days.find((d) =>
      daysMap[d].some((pm) => pm.movementId && prerequisiteIds.has(pm.movementId))
    );

    additions.push({
      movement: m,
      groupName: m.movement_groups?.name ?? "",
      targetLabel: formatTarget(m),
      dayOfWeek: hostDay ?? lightestDay,
      reason: hostDay ? "prerequisite" : "lightest",
    });
  });

  return additions;
}
