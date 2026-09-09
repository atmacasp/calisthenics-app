import { create } from "zustand";

export interface LoggedSet {
  id: string;
  reps?: number;
  duration_seconds?: number;
  added_weight_kg?: number;
}

export interface SessionMovement {
  movementId: string;
  name: string;
  groupName?: string | null;
  targetType?: "reps_sets" | "duration" | null;
  targetSets?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  /** Programdan geldiyse o hareketin kendi dinlenme süresi (program_movements.rest_seconds). */
  restSeconds?: number | null;
  sets: LoggedSet[];
}

interface AddMovementInput {
  id: string;
  name: string;
  groupName?: string | null;
  targetType?: "reps_sets" | "duration" | null;
  targetSets?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  restSeconds?: number | null;
}

interface WorkoutState {
  activeSessionId: string | null;
  sessionMovements: SessionMovement[];
  /** Bu oturum bir programdan başlatıldıysa "Program Adı · Gün Adı" etiketi (bkz. session/[id].tsx rozeti). */
  sessionProgramLabel: string | null;
  startSession: (sessionId: string, programLabel?: string | null) => void;
  /** Yarım kalmış bir oturumu DB'den okunmuş setlerle geri yükler (bkz. workoutService.getSessionState). */
  restoreSession: (sessionId: string, movements: SessionMovement[], programLabel?: string | null) => void;
  addMovement: (movement: AddMovementInput) => void;
  removeMovement: (movementId: string) => void;
  addSetToMovement: (movementId: string, set: LoggedSet) => void;
  /** Yanlış girilen tek bir seti ekrandan kaldırır (DB tarafı workoutService.removeSet). */
  removeSetFromMovement: (movementId: string, setId: string) => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  activeSessionId: null,
  sessionMovements: [],
  sessionProgramLabel: null,
  startSession: (sessionId, programLabel = null) =>
    set({ activeSessionId: sessionId, sessionMovements: [], sessionProgramLabel: programLabel }),
  restoreSession: (sessionId, movements, programLabel = null) =>
    set({ activeSessionId: sessionId, sessionMovements: movements, sessionProgramLabel: programLabel }),
  addMovement: (movement) =>
    set((state) => {
      if (state.sessionMovements.some((m) => m.movementId === movement.id)) return state;
      return {
        sessionMovements: [
          ...state.sessionMovements,
          {
            movementId: movement.id,
            name: movement.name,
            groupName: movement.groupName,
            targetType: movement.targetType,
            targetSets: movement.targetSets,
            targetReps: movement.targetReps,
            targetDurationSeconds: movement.targetDurationSeconds,
            restSeconds: movement.restSeconds,
            sets: [],
          },
        ],
      };
    }),
  removeMovement: (movementId) =>
    set((state) => ({
      sessionMovements: state.sessionMovements.filter((m) => m.movementId !== movementId),
    })),
  addSetToMovement: (movementId, newSet) =>
    set((state) => ({
      sessionMovements: state.sessionMovements.map((m) =>
        m.movementId === movementId ? { ...m, sets: [...m.sets, newSet] } : m
      ),
    })),
  removeSetFromMovement: (movementId, setId) =>
    set((state) => ({
      sessionMovements: state.sessionMovements.map((m) =>
        m.movementId === movementId ? { ...m, sets: m.sets.filter((s) => s.id !== setId) } : m
      ),
    })),
  reset: () => set({ activeSessionId: null, sessionMovements: [], sessionProgramLabel: null }),
}));
