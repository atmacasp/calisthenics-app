import type { Database } from "./database.types";

export type ProgramRow = Database["public"]["Tables"]["programs"]["Row"];
export type ProgramMovementRow = Database["public"]["Tables"]["program_movements"]["Row"];
export type UserProgramRow = Database["public"]["Tables"]["user_programs"]["Row"];

export type ProgramLevel = "beginner" | "intermediate" | "advanced";

/** Bir program günündeki tek bir hareket (movement adı embed edilmiş) */
export interface ProgramMovementWithName {
  id: string;
  movementId: string | null;
  movementName: string;
  targetSets: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  restSeconds: number;
  orderIndex: number;
}

/**
 * programsService.getProgramWithDays sonucu - gün numarasına göre gruplanmış
 * hareketler (day_of_week: 1=Pazartesi ... 7=Pazar).
 */
export interface ProgramWithDays extends ProgramRow {
  daysMap: Record<number, ProgramMovementWithName[]>;
}

/** programsService.getActiveProgramForToday sonucu - "bugün ne yapmalıyım" sorusunun cevabı */
export interface TodayProgramPlan {
  program: ProgramWithDays;
  dayOfWeek: number;
  dayName: string;
  /** Bugün için planlanmış hareketler. Boşsa bugün o programda dinlenme günüdür. */
  movements: ProgramMovementWithName[];
}

/**
 * programsService.getProgramAdherence sonucu - "programı ne kadar takip
 * edebiliyorum" sorusunun cevabı. İlerleme ekranındaki Program Bağlılığı kartı
 * bunu gösterir. Aktif takip edilen program yoksa servis null döner.
 */
export interface ProgramAdherence {
  programId: string;
  programName: string;
  /** Programın haftada kaç antrenman günü tanımladığı (dinlenme günleri hariç) */
  trainingDaysPerWeek: number;
  /** Bu hafta (Pzt başlangıçlı) bu programdan tamamlanan antrenman sayısı */
  completedThisWeek: number;
  /** Programa başladığından beri tamamlanan toplam antrenman sayısı */
  totalCompleted: number;
  /** Programa başladığından beri beklenen toplam antrenman sayısı */
  totalExpected: number;
  /** totalCompleted / totalExpected yüzdesi (0 = hiç, 100+ = programın önünde) */
  adherencePercent: number;
}

/** Program oluşturucudaki tek bir hareket satırı (henüz DB'ye yazılmamış) */
export interface ProgramDraftMovement {
  movementId: string;
  targetSets: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  restSeconds: number;
}

/**
 * programsService.saveProgram girdisi. days: 1=Pazartesi ... 7=Pazar; boş
 * bırakılan günler dinlenme günü olur. Sıralama dizideki sıradan üretilir.
 */
export interface ProgramDraft {
  name: string;
  description: string | null;
  level: ProgramLevel | null;
  days: Record<number, ProgramDraftMovement[]>;
}
