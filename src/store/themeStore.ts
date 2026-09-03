import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  setPreference: (p) => set({ preference: p }),
}));
