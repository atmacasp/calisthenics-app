/**
 * "Neden ilerlemiyorum?"
 *
 * Kilit motoru (targetProgress) "bu hareketi yapabilir misin" sorusunu çözdü,
 * setCoach "şu an ne yapmalısın"ı, sessionFlow "oturumun neresindesin"i. Geriye
 * antrenmanların ARASINDAKİ soru kaldı: aynı basamakta haftalardır sayılar
 * kıpırdamıyorsa ne değişmeli.
 *
 * Motor bir hareketin son antrenmanlarına bakıp üç şeyden birini söylüyor:
 * ilerliyorsun, saplandın, ya da düşüyorsun - ve saplanma varsa ne denenebileceğini.
 *
 * ÖNEMLİ: buradaki eşikler bilimsel sabitler değil, ayarlanabilir sezgisel
 * değerler. Hepsi tek yerde ve isimli; değiştirmek bir satır.
 *
 * "Hedef karşılandı mı" sorusunu kendi başına cevaplamıyor - setCoach'un
 * buildSetPlan'ına soruyor. Böylece kilit ekranı, koç satırı ve bu motor aynı
 * hedef tanımında kalıyor.
 */

import { buildSetPlan, setKindOf, setValueOf, type CoachMovement, type CoachSet } from "./setCoach";

/** Saplanma kararı için bakılan antrenman sayısı. */
export const STALL_WINDOW = 3;

/** Hedefin bu oranına ulaşmış kullanıcı "çok yakın" sayılıyor. */
export const NEAR_TARGET_RATIO = 0.8;

/** Bu oranın altı "bu basamak şu an fazla zor" demek. */
export const TOO_HARD_RATIO = 0.5;

export interface ReadinessSession {
  sessionId: string;
  /** Oturumun tarihi (ISO). Motor sırayı dizinin kendisinden alıyor; bu alan görüntü için. */
  date: string;
  sets: CoachSet[];
}

export interface ReadinessInput {
  targetType?: "reps_sets" | "duration" | null;
  targetSets?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  /** ESKİDEN YENİYE sıralı olmalı; son eleman en yeni antrenman. */
  sessions: ReadinessSession[];
}

export type ReadinessState =
  /** Karar vermeye yetecek antrenman yok. */
  | "insufficient-data"
  /** Hedef zaten karşılanmış; burada saplanma diye bir şey yok. */
  | "target-met"
  /** Pencerenin başına göre ilerleme var. */
  | "progressing"
  /** Pencere boyunca kıpırdama yok. */
  | "stalled"
  /** Pencerenin başına göre düşüş var. */
  | "regressing";

export interface SessionScore {
  /** Hedef değeri TUTAN set sayısı - kilit motorunun saydığı şey. */
  qualifiedSets: number;
  /** O antrenmandaki en iyi tek set (tekrar ya da saniye). */
  bestValue: number;
  /** Toplam tekrar/saniye - hacim. Karara girmiyor, gösterim için. */
  totalValue: number;
}

export interface ReadinessVerdict {
  state: ReadinessState;
  /** Karara giren antrenman sayısı. */
  sessionsUsed: number;
  /** Pencerenin ilk ve son antrenmanının skoru; veri yoksa null. */
  first: SessionScore | null;
  last: SessionScore | null;
  /** Tek satır başlık. */
  headline: string;
  /** Başlığın altındaki açıklama; yoksa null. */
  detail: string | null;
  /** Saplanma/düşüş varsa ne denenmeli; yoksa null. */
  advice: string | null;
}

function asCoachMovement(input: ReadinessInput, sets: CoachSet[]): CoachMovement {
  return {
    targetType: input.targetType,
    targetSets: input.targetSets,
    targetReps: input.targetReps,
    targetDurationSeconds: input.targetDurationSeconds,
    sets,
  };
}

function unitOf(input: ReadinessInput): string {
  return setKindOf(asCoachMovement(input, [])) === "duration" ? "saniye" : "tekrar";
}

/** Bir antrenmanın o harekete ait skoru. */
export function scoreSession(input: ReadinessInput, session: ReadinessSession): SessionScore {
  const movement = asCoachMovement(input, session.sets);
  const kind = setKindOf(movement);
  const values = session.sets.map((s) => setValueOf(s, kind) ?? 0);

  return {
    qualifiedSets: buildSetPlan(movement).qualifiedSets,
    bestValue: values.length === 0 ? 0 : Math.max(...values),
    totalValue: values.reduce((sum, v) => sum + v, 0),
  };
}

/**
 * İki antrenmanı karşılaştırır: pozitif = ilerleme, negatif = düşüş, 0 = aynı.
 *
 * Önce TUTAN SET sayısına bakıyor, eşitse en iyi sete. Sıralamanın bu olması
 * şart: 8/7/6 -> 8/8/7 ilerlemedir, en iyi set değişmese bile hedefe bir set
 * daha yaklaşılmıştır. Tersi sıralamada bu ilerleme görünmezdi.
 */
export function compareSessions(a: SessionScore, b: SessionScore): number {
  if (a.qualifiedSets !== b.qualifiedSets) return a.qualifiedSets - b.qualifiedSets;
  return a.bestValue - b.bestValue;
}

/**
 * Değişimi, GERÇEKTEN değişen şeyin diliyle anlatır.
 *
 * İlerleme her zaman en iyi sette görünmüyor: 8/7/6 -> 8/8/7 ilerlemedir ama
 * en iyi set 8'de durur. Bunu "8 → 8 tekrar" diye yazmak kendi kendini yalanlardı.
 */
function describeChange(first: SessionScore, last: SessionScore, unit: string): string {
  if (first.qualifiedSets !== last.qualifiedSets) {
    return `Hedefi tutan set: ${first.qualifiedSets} → ${last.qualifiedSets}`;
  }
  return `${first.bestValue} → ${last.bestValue} ${unit}`;
}

function targetValueOf(input: ReadinessInput): number | null {
  return buildSetPlan(asCoachMovement(input, [])).targetValue;
}

/**
 * Saplanma/düşüş durumunda ne denenmeli.
 *
 * Ölçüt hedefe olan mesafe: hedefin yakınındaki kullanıcının sorunu genelde
 * son bir-iki tekrar, uzaktakinin sorunu basamağın kendisi. Hedefi olmayan
 * harekette mesafe bilinemediği için genel öneri veriliyor.
 */
function adviceFor(input: ReadinessInput, last: SessionScore, regressing: boolean): string {
  if (regressing) {
    return "Düşüş genelde yorgunluktur: bir antrenman ara ver ya da bu hareketi hafif geç.";
  }

  const target = targetValueOf(input);
  if (target == null || target <= 0) {
    return "Aynı basamakta kalıp hacmi artır: bir set daha ekle ya da setler arası dinlenmeyi uzat.";
  }

  const ratio = last.bestValue / target;
  if (ratio >= NEAR_TARGET_RATIO) {
    return "Hedefe çok yakınsın. Setler arası dinlenmeyi uzat, ilk seti dinç gir.";
  }
  if (ratio >= TOO_HARD_RATIO) {
    return "Aynı basamakta hacmi artır ya da tempoyu yavaşlat (negatif/izometrik çalış).";
  }
  return "Bu basamak şu an fazla zor görünüyor. Ön koşula dönüp oradan yükselmeyi dene.";
}

/**
 * Bir hareketin son antrenmanlarına bakıp durumu söyler.
 *
 * Pencere son STALL_WINDOW antrenman. Hedef bir kez bile karşılanmışsa saplanma
 * aranmıyor: orada söylenecek şey "sıradaki basamak", "daha çok çalış" değil.
 */
export function analyzeReadiness(input: ReadinessInput): ReadinessVerdict {
  const sessions = input.sessions;
  const unit = unitOf(input);

  const empty: ReadinessVerdict = {
    state: "insufficient-data",
    sessionsUsed: 0,
    first: null,
    last: null,
    headline: "Henüz bu hareketi çalışmadın",
    detail: null,
    advice: null,
  };

  if (sessions.length === 0) return empty;

  const scores = sessions.map((s) => scoreSession(input, s));

  // Hedef bir kez tutmuşsa mesele saplanma değil, ilerlemek.
  const everMet = sessions.some((s) => buildSetPlan(asCoachMovement(input, s.sets)).targetComplete);
  if (everMet) {
    return {
      state: "target-met",
      sessionsUsed: sessions.length,
      first: scores[0],
      last: scores[scores.length - 1],
      headline: "Hedefi tamamladın",
      detail: "Sıradaki basamağa geçebilirsin.",
      advice: null,
    };
  }

  if (sessions.length < STALL_WINDOW) {
    const need = STALL_WINDOW - sessions.length;
    return {
      state: "insufficient-data",
      sessionsUsed: sessions.length,
      first: scores[0],
      last: scores[scores.length - 1],
      headline: "Değerlendirmek için veri az",
      detail: `${need} antrenman daha sonra ilerleyip ilerlemediğini söyleyebilirim.`,
      advice: null,
    };
  }

  const window = scores.slice(-STALL_WINDOW);
  const first = window[0];
  const last = window[window.length - 1];
  const direction = compareSessions(last, first);

  if (direction > 0) {
    return {
      state: "progressing",
      sessionsUsed: STALL_WINDOW,
      first,
      last,
      headline: "İlerliyorsun",
      detail: `Son ${STALL_WINDOW} antrenmanda ${describeChange(first, last, unit)}.`,
      advice: null,
    };
  }

  if (direction < 0) {
    return {
      state: "regressing",
      sessionsUsed: STALL_WINDOW,
      first,
      last,
      headline: "Son antrenmanlarda düşüş var",
      detail: `${describeChange(first, last, unit)}.`,
      advice: adviceFor(input, last, true),
    };
  }

  return {
    state: "stalled",
    sessionsUsed: STALL_WINDOW,
    first,
    last,
    headline: `${STALL_WINDOW} antrenmandır aynı yerdesin`,
    detail: `En iyi setin ${last.bestValue} ${unit} olarak duruyor.`,
    advice: adviceFor(input, last, false),
  };
}
