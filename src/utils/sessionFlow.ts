/**
 * Oturumun akışı: "şu an hangi hareket", "ne kadar dinlen", "ne kadarı bitti".
 *
 * setCoach TEK BİR hareketin içini biliyor (sıradaki set, hedefe mesafe).
 * Bu modül bir seviye yukarısı: hareketler arasında gezinme, oturumun toplam
 * ilerlemesi ve setler arasındaki dinlenme. Aktif antrenman ekranı bugüne kadar
 * bu üç kararı da kendi içinde, testsiz veriyordu:
 *
 *   - hangi kart açık kalacağını kullanıcı elle seçiyordu (tek odak yoktu)
 *   - dinlenme her zaman sabit 60 sn ya da programın değeriydi
 *   - "ne kadarı bitti" diye bir şey yoktu, sadece girilen set sayısı vardı
 *
 * Hedefin tanımı setCoach ve targetProgress ile AYNI olmak zorunda:
 * "3 set x 8 tekrar" = her biri en az 8 tekrar olan 3 set. O yüzden burada
 * hedef hesabı yeniden yazılmıyor, buildSetPlan'a soruluyor.
 *
 * Saf tutuluyor (store/servis/React bilmiyor) çünkü oturumun ritmi uygulamanın
 * karakteri ve testle korunması gerekiyor.
 */

import { buildSetPlan, setKindOf, setValueOf, type CoachMovement } from "./setCoach";

/** Programdan gelmeyen hareketlerde setler arası varsayılan dinlenme. */
export const DEFAULT_REST_SECONDS = 60;

/** Hedefin altında kalan setten sonra dinlenmeye eklenen süre. */
export const MISSED_TARGET_EXTRA_SECONDS = 30;

/** Hiçbir kural bunun üstüne çıkamaz; 5 dakikadan uzun bant antrenmanı öldürür. */
export const MAX_REST_SECONDS = 300;

/** SessionMovement bu şekle yapısal olarak uyuyor; utils store'a bağlanmasın diye ayrı tanımlı. */
export interface FlowMovement extends CoachMovement {
  movementId: string;
  name: string;
  /** Programdan geldiyse o hareketin kendi dinlenme süresi. */
  restSeconds?: number | null;
}

export type FocusReason =
  /** Açık hareketin işi bitmedi, odak değişmiyor. */
  | "continue"
  /** Hedef tamamlandı, sıradaki eksik harekete geçildi. */
  | "advanced"
  /** Bütün hareketlerin hedefi tamam. */
  | "complete"
  /** Oturumda hiç hareket yok. */
  | "empty";

export interface Focus {
  movementId: string | null;
  /** movements dizisindeki sıra; hareket yoksa -1. */
  index: number;
  reason: FocusReason;
}

export type FlowState = "done" | "current" | "todo";

export interface OutlineItem {
  movementId: string;
  name: string;
  state: FlowState;
  qualifiedSets: number;
  /** Hedefi olmayan harekette null - ekran "3/3" yerine sadece set sayısı gösterir. */
  requiredSets: number | null;
  loggedSets: number;
}

export interface SessionProgress {
  totalMovements: number;
  completedMovements: number;
  /** Hedefi TUTAN setlerin toplamı. */
  qualifiedSets: number;
  /** Hedeflerin istediği toplam set; hedefsiz hareketler bu sayıya girmez. */
  requiredSets: number;
  /** Girilen her set - tutmayanlar dahil. */
  loggedSets: number;
  /** 0-1. Her hareket kendi tamamlanma oranı kadar katkı verir. */
  ratio: number;
  complete: boolean;
}

export interface RestPlan {
  seconds: number;
  kind: "same-movement" | "next-movement" | "session-complete";
  nextMovementId: string | null;
  /** "Şınav · 3. set" - bant bunu "SIRADAKİ" etiketiyle gösteriyor. */
  upNext: string | null;
  /** Süre neden standart değil; standartsa null. */
  note: string | null;
}

/**
 * Bir hareketin işi bitti mi.
 *
 * Hedefi olan harekette kural kilit motorunun kuralı. Hedefi olmayan (kullanıcının
 * elle eklediği) harekette tek set yeter: yoksa odak orada sonsuza kadar takılırdı.
 */
export function isMovementComplete(movement: FlowMovement): boolean {
  const plan = buildSetPlan(movement);
  if (plan.requiredSets == null) return movement.sets.length > 0;
  return plan.targetComplete;
}

/** Hareketin tamamlanma oranı (0-1). İlerleme çubuğunun set set ilerlemesini bu sağlıyor. */
function completionRatio(movement: FlowMovement): number {
  const plan = buildSetPlan(movement);
  if (plan.requiredSets == null) return movement.sets.length > 0 ? 1 : 0;
  if (plan.requiredSets <= 0) return 1;
  return Math.min(1, plan.qualifiedSets / plan.requiredSets);
}

function indexOfMovement(movements: FlowMovement[], movementId: string | null | undefined): number {
  if (!movementId) return -1;
  return movements.findIndex((m) => m.movementId === movementId);
}

function focusAt(movements: FlowMovement[], index: number, reason: FocusReason): Focus {
  if (index < 0 || index >= movements.length) return { movementId: null, index: -1, reason };
  return { movementId: movements[index].movementId, index, reason };
}

/**
 * Ekran açıldığında (ya da yarım oturum geri yüklendiğinde) hangi hareket açık olmalı.
 *
 * İlk eksik hareket. Hepsi tamamsa ilk harekete düşüyor: kullanıcı hedefi tutmuş
 * bir oturuma geri dönüp ekstra set atabilmeli, boş ekranla karşılaşmamalı.
 */
export function initialFocus(movements: FlowMovement[]): Focus {
  if (movements.length === 0) return { movementId: null, index: -1, reason: "empty" };

  const firstPending = movements.findIndex((m) => !isMovementComplete(m));
  if (firstPending >= 0) return focusAt(movements, firstPending, "continue");

  return { ...focusAt(movements, 0, "complete"), reason: "complete" };
}

/**
 * Bir set kaydedildikten SONRA odak nerede olmalı.
 *
 * Açık hareketin hedefi dolmadıysa yerinde kalıyor. Dolduysa sıradaki eksik
 * harekete geçiyor - önce listede aşağısına bakıyor, orada eksik kalmadıysa
 * başa sarıyor. Baştaki bir hareketi yarım bırakıp ilerleyen kullanıcı oturum
 * sonunda ona geri dönüyor.
 *
 * Kullanıcı bir karta elle dokunduğunda bu fonksiyon çağrılmıyor; odak seçimi
 * kullanıcınındır, motor onunla yarışmaz.
 */
export function focusAfterSet(movements: FlowMovement[], currentId: string | null | undefined): Focus {
  if (movements.length === 0) return { movementId: null, index: -1, reason: "empty" };

  const currentIndex = indexOfMovement(movements, currentId);
  if (currentIndex >= 0 && !isMovementComplete(movements[currentIndex])) {
    return focusAt(movements, currentIndex, "continue");
  }

  const start = currentIndex >= 0 ? currentIndex : -1;
  for (let step = 1; step <= movements.length; step += 1) {
    const index = (start + step + movements.length) % movements.length;
    if (!isMovementComplete(movements[index])) return focusAt(movements, index, "advanced");
  }

  return { movementId: null, index: -1, reason: "complete" };
}

/** Oturumun toplam durumu - ekranın üstündeki çubuk ve sayaç. */
export function sessionProgress(movements: FlowMovement[]): SessionProgress {
  let completedMovements = 0;
  let qualifiedSets = 0;
  let requiredSets = 0;
  let loggedSets = 0;
  let ratioSum = 0;

  for (const movement of movements) {
    const plan = buildSetPlan(movement);
    if (isMovementComplete(movement)) completedMovements += 1;
    qualifiedSets += plan.qualifiedSets;
    if (plan.requiredSets != null) requiredSets += plan.requiredSets;
    loggedSets += movement.sets.length;
    ratioSum += completionRatio(movement);
  }

  return {
    totalMovements: movements.length,
    completedMovements,
    qualifiedSets,
    requiredSets,
    loggedSets,
    ratio: movements.length === 0 ? 0 : ratioSum / movements.length,
    complete: movements.length > 0 && completedMovements === movements.length,
  };
}

/** Üstteki şeridin satırları: hangi hareket bitti, hangisi açık, hangisi bekliyor. */
export function sessionOutline(movements: FlowMovement[], currentId: string | null | undefined): OutlineItem[] {
  return movements.map((movement) => {
    const plan = buildSetPlan(movement);
    const done = isMovementComplete(movement);
    // "current" bittiğini ezmiyor: tamamlanmış bir harekete geri dönüp ekstra set
    // atarken kart hâlâ yeşil kalmalı, yoksa kullanıcı hedefi kaybettim sanıyor.
    const state: FlowState = done ? "done" : movement.movementId === currentId ? "current" : "todo";
    return {
      movementId: movement.movementId,
      name: movement.name,
      state,
      qualifiedSets: plan.qualifiedSets,
      requiredSets: plan.requiredSets,
      loggedSets: movement.sets.length,
    };
  });
}

/** Çubuğun yanındaki tek satır. Yüzde yazmıyor - yüzdeyi zaten çubuk gösteriyor. */
export function sessionHeadline(progress: SessionProgress): string {
  if (progress.totalMovements === 0) return "Hareket ekleyerek başla";
  if (progress.complete) return "Tüm hedefler tamam";
  const remaining = progress.totalMovements - progress.completedMovements;
  return `${remaining} hareket kaldı`;
}

/**
 * Dinlenme süresi ve bittiğinde ne yapılacağı.
 *
 * İki kural var:
 *
 * 1. Dinlenme, BİTTİĞİNDE yapılacak hareketin süresidir. Yeni bir harekete
 *    geçiliyorsa o hareketin kendi rest_seconds'ı kullanılıyor - dinlenme
 *    arkada bıraktığın sete değil, önündeki sete hazırlanmak içindir.
 *
 * 2. Aynı harekette hedefin altında kalan setten sonra süre uzatılıyor. Tutmayan
 *    set genelde yetersiz dinlenmenin ya da limite yaklaşmanın işareti; aynı
 *    süreyle devam etmek bir sonraki seti de düşürüyor.
 *
 * Hedef zaten tamamken atılan ekstra setler bu kuralın dışında: orada "altında
 * kalmak" diye bir şey yok.
 */
export function restPlanFor(movements: FlowMovement[], movementId: string): RestPlan {
  const focus = focusAfterSet(movements, movementId);

  if (focus.movementId == null || focus.index < 0) {
    return { seconds: 0, kind: "session-complete", nextMovementId: null, upNext: null, note: null };
  }

  const next = movements[focus.index];
  const nextPlan = buildSetPlan(next);
  const base = next.restSeconds ?? DEFAULT_REST_SECONDS;
  const sameMovement = focus.movementId === movementId;

  let seconds = Math.min(MAX_REST_SECONDS, Math.max(0, base));
  let note: string | null = null;

  if (sameMovement && missedTarget(next)) {
    seconds = Math.min(MAX_REST_SECONDS, seconds + MISSED_TARGET_EXTRA_SECONDS);
    note = `Hedefin altında kaldın · ${MISSED_TARGET_EXTRA_SECONDS} sn ekledim`;
  }

  return {
    seconds,
    kind: sameMovement ? "same-movement" : "next-movement",
    nextMovementId: focus.movementId,
    upNext: `${next.name} · ${nextPlan.setNumber}. set`,
    note,
  };
}

/** Son set hedefin altında mı kaldı. Hedefi olmayan harekette hep false. */
function missedTarget(movement: FlowMovement): boolean {
  const plan = buildSetPlan(movement);
  if (plan.targetValue == null) return false;
  const last = movement.sets[movement.sets.length - 1];
  const value = setValueOf(last, setKindOf(movement));
  if (value == null) return false;
  return value < plan.targetValue;
}
