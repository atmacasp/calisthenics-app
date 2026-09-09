import type { MovementSetLogMap, MovementWithGroupAndPrerequisites } from "../types/movements";
import {
  areAllPrerequisitesMet,
  computeTargetProgress,
  formatTarget,
  getPrerequisiteTarget,
  isPrerequisiteMet,
  isTargetMet,
  type TargetProgress,
} from "./targetProgress";

/** Kilitli bir basamağın önündeki ilk karşılanmamış ön koşul - "önce şunu bitir" bilgisi. */
export interface BlockingPrerequisite {
  name: string;
  /** "3 set x 20 tekrar" gibi okunabilir hedef metni */
  targetLabel: string | null;
  /** O ön koşula ne kadar yaklaşıldığı */
  progress: TargetProgress | null;
}

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
  /** Odak basamağın zincirdeki sırası (1 tabanlı) - "Basamak 3/8" rozeti için. */
  stepIndex: number;
  /** Zincirdeki toplam basamak sayısı. */
  chainLength: number;
  /** Bu zincirde hedefi karşılanmış basamak sayısı. */
  completedSteps: number;
  /**
   * Odak basamağın kendi hedefine mesafe. Kilitliyse null döner: kullanıcı o
   * hareketi henüz çalışmamalı, dolayısıyla "ne kadar kaldı" yanıltıcı olur -
   * o durumda blockingPrerequisite doldurulur.
   */
  progress: TargetProgress | null;
  /** Kilitliyse, önce bitirilmesi gereken ilk ön koşul. */
  blockingPrerequisite: BlockingPrerequisite | null;
}

/**
 * Kart sırası: bugün çalışılabilecekler önce, sonra kilitliler, en sonda
 * tamamlanmış kategoriler.
 *
 * computeFocusSuggestions bilinçli olarak veritabanı sırasını (movement_groups.
 * order_index) koruyor - hesap ile sunum ayrı kalsın diye sıralama burada ayrı
 * bir fonksiyon. Kategori sayısı arttıkça (artık 11 zincir) listenin başında
 * aksiyon alınabilir kartların durması gerekiyor; kilitli kart bilgi verir,
 * iş vermez. Aynı kova içindeki kartlar kendi aralarında veritabanı sırasını
 * korur, böylece liste her açılışta aynı görünür.
 */
export function orderSuggestions(suggestions: FocusSuggestion[]): FocusSuggestion[] {
  const rank = (s: FocusSuggestion) => (s.completed ? 2 : s.locked ? 1 : 0);
  return suggestions
    .map((suggestion, index) => ({ suggestion, index }))
    .sort((a, b) => rank(a.suggestion) - rank(b.suggestion) || a.index - b.index)
    .map((entry) => entry.suggestion);
}

/** Tüm kategoriler toplamında kaç basamak açıldığı. */
export interface StepSummary {
  completed: number;
  total: number;
}

export function summarizeSteps(suggestions: FocusSuggestion[]): StepSummary {
  return suggestions.reduce<StepSummary>(
    (acc, s) => ({ completed: acc.completed + s.completedSteps, total: acc.total + s.chainLength }),
    { completed: 0, total: 0 }
  );
}

/**
 * movementsService.getAllMovementsWithPrerequisites() sonucundan, her kategori
 * (Temel Güç dahil 8 kategori) için kullanıcının "sırada çalışması gereken"
 * basamağını hesaplar: zincirdeki hedefi henüz karşılanmamış İLK basamak.
 * Temel Güç hareketlerinin prerequisites'i olmadığından (areAllPrerequisitesMet
 * boş dizide her zaman true döner) bu kategori hiçbir zaman kilitli görünmez -
 * yeni bir kullanıcı için ilk aksiyon adımı doğal olarak Temel Güç olur, çünkü
 * movement_groups.order_index=0 olduğundan liste sırasında da ilk o gelir.
 *
 * Hedef mesafesi (progress) isTargetMet ile AYNI kuraldan türetilir, bu yüzden
 * çubuk dolduğu anda basamak gerçekten tamamlanmış olur ve bir sonraki çağrıda
 * odak bir alt basamağa kayar.
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
    const completedSteps = chain.filter((m) => isTargetMet(m, setLogMap[m.id])).length;
    const focusIndex = chain.findIndex((m) => !isTargetMet(m, setLogMap[m.id]));

    if (focusIndex === -1) {
      // Zincirdeki her basamağın hedefi karşılanmış -> kategori tamamlandı.
      const top = chain[chain.length - 1];
      if (top) {
        suggestions.push({
          groupName,
          movement: top,
          locked: false,
          completed: true,
          stepIndex: chain.length,
          chainLength: chain.length,
          completedSteps,
          progress: null,
          blockingPrerequisite: null,
        });
      }
      continue;
    }

    const focus = chain[focusIndex];
    const prerequisites = focus.prerequisites ?? [];
    const locked = !areAllPrerequisitesMet(prerequisites, setLogMap);

    let blockingPrerequisite: BlockingPrerequisite | null = null;
    if (locked) {
      // Sıra önemli: kullanıcıya order_index'e göre ilk eksik ön koşulu göster,
      // "hepsi birden" demek yerine tek bir sonraki iş ver.
      const ordered = [...prerequisites].sort((a, b) => a.order_index - b.order_index);
      const blocker = ordered.find((p) => !isPrerequisiteMet(p, setLogMap));
      if (blocker) {
        const target = getPrerequisiteTarget(blocker);
        blockingPrerequisite = {
          name: blocker.prerequisite_movement.name,
          targetLabel: formatTarget(target),
          progress: computeTargetProgress(target, setLogMap[blocker.prerequisite_movement.id]),
        };
      }
    }

    suggestions.push({
      groupName,
      movement: focus,
      locked,
      completed: false,
      stepIndex: focusIndex + 1,
      chainLength: chain.length,
      completedSteps,
      progress: locked ? null : computeTargetProgress(focus, setLogMap[focus.id]),
      blockingPrerequisite,
    });
  }

  return suggestions;
}
