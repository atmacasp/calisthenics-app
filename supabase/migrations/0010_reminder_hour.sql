-- Antrenman hatırlatıcısının saati. Bildirimin açık/kapalı olması zaten
-- profiles.notifications_enabled ile tutuluyor.
alter table public.profiles
  add column if not exists reminder_hour int default 18 check (reminder_hour between 0 and 23);
