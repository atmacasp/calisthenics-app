import { create } from "zustand";

interface OnboardingState {
  full_name: string;
  height_cm: number;
  weight_kg: number;
  unit_preference: "metric" | "imperial";
  setInfo: (info: { full_name: string; height_cm: number; weight_kg: number; unit_preference: "metric" | "imperial" }) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  full_name: "",
  height_cm: 0,
  weight_kg: 0,
  unit_preference: "metric",
  setInfo: (info) => set(info),
}));
