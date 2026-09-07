
import type { Database } from "./database.types";

export type ProgramRow = Database["public"]["Tables"]["programs"]["Row"];
export type ProgramMovementRow = Database["public"]["Tables"]["program_movements"]["Row"];
export type UserProgramRow = Database["public"]["Tables"]["user_programs"]["Row"];

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
