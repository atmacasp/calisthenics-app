import type { Database } from "./database.types";

export type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutSetRow = Database["public"]["Tables"]["workout_sets"]["Row"];

/** Geçmiş antrenmanlar listesindeki bir satır - workoutsService.listSessions sonucu */
export interface WorkoutSessionSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  movementCount: number;
  setCount: number;
  /** Antrenmanı ayırt etmeye yarayan asıl bilgi: çalışılan hareketler (sırayla) */
  movementNames: string[];
  /** Oturum bir programdan başlatıldıysa programın adı */
  programName: string | null;
}

/** Bir antrenman detayındaki tek bir hareket + o harekete ait setler */
export interface SessionMovementDetail {
  movementId: string;
  movementName: string;
  groupName: string | null;
  sets: {
    id: string;
    setNumber: number;
    reps: number | null;
    durationSeconds: number | null;
    addedWeightKg: number | null;
  }[];
}

/** workoutsService.getSessionDetail sonucu */
export interface WorkoutSessionDetail {
  id: string;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  movements: SessionMovementDetail[];
}
