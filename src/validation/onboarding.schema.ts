import { z } from "zod";

export const onboardingInfoSchema = z.object({
  full_name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  height: z.coerce.number().positive("Geçerli bir boy girin"),
  weight: z.coerce.number().positive("Geçerli bir kilo girin"),
  unit_preference: z.enum(["metric", "imperial"]),
});

export const onboardingLevelSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]),
});

export type OnboardingInfoData = z.infer<typeof onboardingInfoSchema>;
export type OnboardingLevelData = z.infer<typeof onboardingLevelSchema>;
