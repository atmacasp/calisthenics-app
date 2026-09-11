-- 0018: varsayılanı olan ama NOT NULL olmayan sütunlar
--
-- Uygulama bu 24 sütunu hep dolu kabul ediyordu; elle yazılmış
-- database.types.ts de öyle yazıyordu. Veritabanı ise etmiyordu: hepsinin
-- DEFAULT'u var ama NOT NULL'u yok, yani açıkça null yazan bir insert
-- (ya da elle çalıştırılan bir SQL) sütunu boşaltabilirdi. order_index null
-- olunca sıralama, rest_seconds null olunca dinlenme sayacı bozulurdu.
--
-- Bu ayrışmayı scripts/gen-types.sh ortaya çıkardı: şemadan üretilen tipler
-- 24 sütunda "| null" diyordu, elle yazılan dosya demiyordu. İkisinden biri
-- yanlıştı - yanlış olan veritabanıydı.
--
-- Önce varsa null satırlar varsayılana çekiliyor, sonra kısıt konuyor; bu
-- sırayla migration mevcut veriyle de güvenle çalışıyor.
--
-- Transaction açılmıyor: scripts/migrate.sh her dosyayı tek transaction'da
-- çalıştırıyor.

-- body_weight_logs
update public.body_weight_logs set logged_at = default where logged_at is null;
alter table public.body_weight_logs alter column logged_at set not null;
update public.body_weight_logs set created_at = default where created_at is null;
alter table public.body_weight_logs alter column created_at set not null;

-- movement_groups
update public.movement_groups set order_index = default where order_index is null;
alter table public.movement_groups alter column order_index set not null;

-- movement_prerequisites
update public.movement_prerequisites set order_index = default where order_index is null;
alter table public.movement_prerequisites alter column order_index set not null;

-- movements
update public.movements set order_index = default where order_index is null;
alter table public.movements alter column order_index set not null;
update public.movements set created_at = default where created_at is null;
alter table public.movements alter column created_at set not null;

-- profiles
update public.profiles set unit_preference = default where unit_preference is null;
alter table public.profiles alter column unit_preference set not null;
update public.profiles set level = default where level is null;
alter table public.profiles alter column level set not null;
-- onboarding_completed'ın hikâyesi ayrı: ilk günlerde Supabase panelinden elle
-- eklendiği için canlı veritabanında NULL kabul ediyor, 0013 ise "add column
-- if not exists" olduğu için ona hiç dokunamadı. Sıfırdan kurulan bir
-- veritabanında zaten NOT NULL; bu iki satır canlıyı ona eşitliyor.
update public.profiles set onboarding_completed = default where onboarding_completed is null;
alter table public.profiles alter column onboarding_completed set not null;
update public.profiles set theme = default where theme is null;
alter table public.profiles alter column theme set not null;
update public.profiles set language = default where language is null;
alter table public.profiles alter column language set not null;
update public.profiles set notifications_enabled = default where notifications_enabled is null;
alter table public.profiles alter column notifications_enabled set not null;
update public.profiles set current_streak = default where current_streak is null;
alter table public.profiles alter column current_streak set not null;
update public.profiles set longest_streak = default where longest_streak is null;
alter table public.profiles alter column longest_streak set not null;
update public.profiles set created_at = default where created_at is null;
alter table public.profiles alter column created_at set not null;
update public.profiles set updated_at = default where updated_at is null;
alter table public.profiles alter column updated_at set not null;
update public.profiles set reminder_hour = default where reminder_hour is null;
alter table public.profiles alter column reminder_hour set not null;

-- program_movements
update public.program_movements set rest_seconds = default where rest_seconds is null;
alter table public.program_movements alter column rest_seconds set not null;
update public.program_movements set order_index = default where order_index is null;
alter table public.program_movements alter column order_index set not null;

-- programs
update public.programs set is_premium = default where is_premium is null;
alter table public.programs alter column is_premium set not null;
update public.programs set created_at = default where created_at is null;
alter table public.programs alter column created_at set not null;

-- user_programs
update public.user_programs set started_at = default where started_at is null;
alter table public.user_programs alter column started_at set not null;
update public.user_programs set is_active = default where is_active is null;
alter table public.user_programs alter column is_active set not null;

-- workout_sessions
update public.workout_sessions set started_at = default where started_at is null;
alter table public.workout_sessions alter column started_at set not null;

-- workout_sets
update public.workout_sets set completed_at = default where completed_at is null;
alter table public.workout_sets alter column completed_at set not null;

-- ------------------------------------------------------------- DOĞRULAMA
-- Geriye varsayılanı olup NOT NULL olmayan sütun kalmamalı. Kalırsa yeni bir
-- sütun eklenmiş ve bu listeye yazılmamış demektir.
do $$
declare
  kalan text;
begin
  select string_agg(c.table_name || '.' || c.column_name, ', ') into kalan
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema
   and t.table_name = c.table_name
   and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public'
    and c.is_nullable = 'YES'
    and c.column_default is not null;

  if kalan is not null then
    raise exception 'Hâlâ varsayılanı olup NOT NULL olmayan sütunlar var: %', kalan;
  end if;
end $$;
