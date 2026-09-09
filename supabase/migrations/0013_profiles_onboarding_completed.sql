-- 0013: profiles.onboarding_completed migration geçmişine alındı
--
-- Bu kolon projenin ilk günlerinde Supabase panelinden elle eklenmiş ve hiçbir
-- migration'a yazılmamış. Kod hem yazıyor ((onboarding)/level.tsx) hem okuyor
-- (app/index.tsx); canlı veritabanında var, ama migration'lardan sıfırdan kurulan
-- bir veritabanında YOK - o durumda onboarding sonsuz döner.
--
-- "if not exists" sayesinde mevcut veritabanında hiçbir şey değişmez; sadece
-- migration geçmişi gerçeğe uyar. Tip tarafı da database.types.ts'te düzeltildi.
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;
