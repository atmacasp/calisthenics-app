
import type { Database } from "./database.types";

export type MovementRow = Database["public"]["Tables"]["movements"]["Row"];
export type MovementGroupRow = Database["public"]["Tables"]["movement_groups"]["Row"];

export type MovementType = MovementRow["movement_type"];
export type TargetType = NonNullable<MovementRow["target_type"]>;

/** Bir hedefi tanımlamak için gereken minimum alan seti (movement'ın kendi hedefi ya da bir prerequisite override'ı için ortak şekil) */
export interface TargetSpec {
  target_type: MovementRow["target_type"];
  target_sets: number | null;
  target_reps: number | null;
  target_duration_seconds: number | null;
}

/** movement_prerequisites!..._prerequisite_movement_id_fkey ile embed edilen hareketin alanları */
export interface PrerequisiteMovementRef {
  id: string;
  name: string;
  movement_type: MovementType;
  target_type: MovementRow["target_type"];
  target_sets: number | null;
  target_reps: number | null;
  target_duration_seconds: number | null;
}

/** movement_prerequisites tablosundan bir satır + embed edilen prerequisite_movement */
export interface MovementPrerequisite {
  target_sets: number | null;
  target_reps: number | null;
  target_duration_seconds: number | null;
  order_index: number;
  prerequisite_movement: PrerequisiteMovementRef;
}

/** movements.service.getMovementById sonucu */
export interface MovementWithPrerequisites extends MovementRow {
  movement_groups: { name: string } | null;
  prerequisites: MovementPrerequisite[];
}

/** movements.service.getMovementsByGroup sonucundaki her satır (progression zinciri listesi) */
export interface MovementListItem extends MovementRow {
  prerequisites: MovementPrerequisite[];
}

/** workout_sets tablosundan hedef kontrolü için gereken minimum alanlar */
export interface SetLogEntry {
  reps: number | null;
  duration_seconds: number | null;
}

/** movement_id -> session_id -> o session'da o harekete atılan setler */
export type MovementSetLogMap = Record<string, Record<string, SetLogEntry[]>>;

/** movements.service.getAllMovementsFlat sonucundaki her satır (Hareket Seç ekranı - arama/gruplama için) */
export interface MovementFlatItem {
  id: string;
  name: string;
  order_index: number;
  difficulty_level: MovementRow["difficulty_level"];
  movement_groups: { name: string; order_index: number } | null;
}
