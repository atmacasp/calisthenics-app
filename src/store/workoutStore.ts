
import { create } from "zustand";

interface LoggedSet {
  id: string;
  reps?: number;
  duration_seconds?: number;
  added_weight_kg?: number;
}

interface SessionMovement {
  movementId: string;
  name: string;
  sets: LoggedSet[];
}

interface WorkoutState {
  activeSessionId: string | null;
  sessionMovements: SessionMovement[];
  startSession: (sessionId: string) => void;
  addMovement: (movement: { id: string; name: string }) => void;
  addSetToMovement: (movementId: string, set: LoggedSet) => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  activeSessionId: null,
  sessionMovements: [],
  startSession: (sessionId) => set({ activeSessionId: sessionId, sessionMovements: [] }),
  addMovement: (movement) =>
    set((state) => {
      if (state.sessionMovements.some((m) => m.movementId === movement.id)) return state;
      return {
        sessionMovements: [...state.sessionMovements, { movementId: movement.id, name: movement.name, sets: [] }],
      };
    }),
  addSetToMovement: (movementId, newSet) =>
    set((state) => ({
      sessionMovements: state.sessionMovements.map((m) =>
        m.movementId === movementId ? { ...m, sets: [...m.sets, newSet] } : m
      ),
    })),
  reset: () => set({ activeSessionId: null, sessionMovements: [] }),
}));
