
import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../types/movements";
import { areAllPrerequisitesMet, isTargetMet } from "./targetProgress";

export interface FocusSuggestion {
  groupName: string;
  movement: MovementWithGroupAndPrerequisites;
  /**
   * Sadece zincirin İLK basamağı için mümkündür (Temel Güç hazır değilse).
   * Zincir mantığı gereği (N. basamak (N-1). basamağın hedefine bağlı), bir
   * basamak "focus" (hedefi henüz karşılanmamış İLK basamak) olarak seçildiyse
   * ondan önceki tüm basamaklar zaten karşılanmıştır - yani basamak 2+ hiçbir
   * zaman kilitli "focus" olamaz.
   */
  locked: boolean;
  /** Zincirdeki tüm basamakların hedefi karşılanmış (kategori tamamlanmış). */
  completed: boolean;
}

/**
 * movementsService.getAllMovementsWithPrerequisites() sonucundan, her kategori
 * (Temel Güç dahil 8 kategori) için kullanıcının "sırada çalışması gereken"
 * basamağını hesaplar: zincirdeki hedefi henüz karşılanmamış İLK basamak.
 * Temel Güç hareketlerinin prerequisites'i olmadığından (areAllPrerequisitesMet
 * boş dizide her zaman true döner) bu kategori hiçbir zaman kilitli görünmez -
 * yeni bir kullanıcı için ilk aksiyon adımı doğal olarak Temel Güç olur, çünkü
 * movement_groups.order_index=0 olduğundan liste sırasında da ilk o gelir.
 */
export function computeFocusSuggestions(
  movements: MovementWithGroupAndPrerequisites[],
  setLogMap: MovementSetLogMap
): FocusSuggestion[] {
  const groupOrder: string[] = [];
  const byGroup = new Map<string, MovementWithGroupAndPrerequisites[]>();

  for (const m of movements) {
    const key = m.movement_groups?.name ?? "Diğer";
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      groupOrder.push(key);
    }
    byGroup.get(key)!.push(m);
  }

  const suggestions: FocusSuggestion[] = [];
  for (const groupName of groupOrder) {
    const chain = byGroup.get(groupName)!;
    const focus = chain.find((m) => !isTargetMet(m, setLogMap[m.id]));

    if (!focus) {
      // Zincirdeki her basamağın hedefi karşılanmış -> kategori tamamlandı.
      const top = chain[chain.length - 1];
      if (top) suggestions.push({ groupName, movement: top, locked: false, completed: true });
      continue;
    }

    const locked = !areAllPrerequisitesMet(focus.prerequisites ?? [], setLogMap);
    suggestions.push({ groupName, movement: focus, locked, completed: false });
  }

  return suggestions;
}
