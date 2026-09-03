import { z } from "zod";

const passwordRules = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı")
  .regex(/[A-Z]/, "Şifre en az bir büyük harf içermeli")
  .regex(/[a-z]/, "Şifre en az bir küçük harf içermeli")
  .regex(/[0-9]/, "Şifre en az bir rakam içermeli")
  .regex(/[^A-Za-z0-9]/, "Şifre en az bir sembol içermeli (örn. !@#$%)");

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Geçerli bir e-posta adresi girin"),
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
