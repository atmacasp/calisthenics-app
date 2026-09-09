-- 0016: Hazır programlar - temel programa bacak, ve ikinci bir orta seviye program
--
-- İki eksik vardı:
--
--   1) 0015 ile Squat geldi ama tek hazır program olan "Temel Calisthenics
--      Programı" onu içermiyordu; haftada üç gün antrenman yapan biri bacağa
--      hiç dokunmuyordu.
--   2) Hazır program rafında tek bir başlangıç programı vardı. 0015'in getirdiği
--      zincirlerin (Arşer Şınav / Arşer Barfiks / Bulgar Split Squat) hiçbiri
--      hazır bir programda geçmiyordu.
--
-- Not: program_movements.target_* alanları movements tablosundaki "ustalık
-- hedefinden" bağımsızdır - program kendi hacim reçetesini taşır. Aşağıda Squat
-- tekrarları hafta boyunca 15 -> 20 -> 25 diye artıyor; 25 aynı zamanda Squat'ın
-- ustalık hedefi, yani programı takip eden kullanıcı doğal olarak Pistol Squat
-- zincirinin kilidini açacak yere geliyor.
--
-- Transaction açılmıyor: scripts/migrate.sh her dosyayı tek transaction'da
-- çalıştırıyor.

-- ---------------------------------------------------- 1) TEMEL PROGRAMA BACAK
insert into public.program_movements
  (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, v.day_of_week, v.sets, v.reps, v.seconds, v.rest, v.ord
from (values
  -- gün, set, tekrar, süre, dinlenme, sıra
  (1, 3, 15, null::int, 60, 4),
  (3, 3, 20, null::int, 60, 3),
  (5, 3, 25, null::int, 60, 6)
) as v(day_of_week, sets, reps, seconds, rest, ord)
cross join public.programs p
join public.movements m on m.name = 'Squat (Vücut Ağırlığı)'
where p.name = 'Temel Calisthenics Programı' and p.user_id is null;

-- ------------------------------------------------ 2) ORTA SEVİYE GÜÇ PROGRAMI
-- user_id null => sistem (hazır) programı, herkese görünür.
insert into public.programs (name, description, level, is_premium)
values (
  'Orta Seviye Güç Programı',
  'Haftada 3 gün (Pazartesi/Çarşamba/Cuma). Temel hareketlerin hedeflerini tamamlamış olanlar için: arşer varyasyonları, Bulgar split squat ve ilk beceri basamakları.',
  'intermediate',
  false
);

insert into public.program_movements
  (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, v.day_of_week, v.sets, v.reps, v.seconds, v.rest, v.ord
from (values
  -- Gün 1 (Pazartesi) - İtiş
  ('Arşer Şınav (Archer Push-up)',   1, 3, 6,          null::int, 90, 1),
  ('Dips',                           1, 3, 12,         null::int, 60, 2),
  ('Plank',                          1, 3, null::int,  60,        45, 3),
  -- Gün 2 (Çarşamba) - Çekiş
  ('Arşer Barfiks (Archer Pull-up)', 3, 3, 4,          null::int, 90, 1),
  ('Pull-up (Barfiks)',              3, 3, 8,          null::int, 90, 2),
  ('Hollow Body Tutuş',              3, 3, null::int,  40,        45, 3),
  -- Gün 3 (Cuma) - Bacak & Beceri
  ('Bulgar Split Squat',             5, 3, 10,         null::int, 60, 1),
  ('Squat (Vücut Ağırlığı)',         5, 3, 25,         null::int, 60, 2),
  ('Tuck L-Sit',                     5, 3, null::int,  20,        60, 3),
  ('Planche Lean',                   5, 3, null::int,  30,        60, 4)
) as v(movement_name, day_of_week, sets, reps, seconds, rest, ord)
join public.movements m on m.name = v.movement_name
cross join public.programs p
where p.name = 'Orta Seviye Güç Programı' and p.user_id is null;

-- ------------------------------------------------------------- DOĞRULAMA
-- Hareket adıyla eşleştirme yapıyoruz; ileride aynı adı taşıyan ikinci bir
-- hareket eklenirse satırlar sessizce ikiye katlanırdı. Sayı tutmuyorsa
-- transaction'ı burada patlatıp her şeyi geri alıyoruz.
do $$
declare
  temel_adet int;
  orta_adet int;
begin
  select count(*) into temel_adet
  from public.program_movements pm
  join public.programs p on p.id = pm.program_id
  where p.name = 'Temel Calisthenics Programı' and p.user_id is null;

  select count(*) into orta_adet
  from public.program_movements pm
  join public.programs p on p.id = pm.program_id
  where p.name = 'Orta Seviye Güç Programı' and p.user_id is null;

  -- 0007 on satır kurmuştu, bu migration üç Squat satırı ekliyor.
  if temel_adet <> 13 then
    raise exception 'Temel programda 13 hareket satırı bekleniyordu, % bulundu', temel_adet;
  end if;

  if orta_adet <> 10 then
    raise exception 'Orta programda 10 hareket satırı bekleniyordu, % bulundu', orta_adet;
  end if;
end $$;
