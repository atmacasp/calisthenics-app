-- HAZIR PROGRAM ŞABLONU - bu dosya bir migration DEĞİL, kopyalanacak taslak.
--
-- scripts/ altında duruyor çünkü migrate.sh supabase/migrations/*.sql dosyalarını
-- sırayla çalıştırıyor; şablon oraya konsaydı gerçek bir migration sanılıp
-- koşulurdu.
--
-- Kullanım:
--   1) scripts/movements.sh ile hareket adlarını al (elle yazma - bir harf
--      yanlışsa satır SESSİZCE eklenmiyor)
--   2) bu dosyayı supabase/migrations/00NN_<ad>.sql olarak kopyala
--   3) PROGRAM_ADI / açıklama / seviye ve values listesini doldur
--   4) scripts/migrate.sh
--
-- Dosyaya begin/commit YAZILMAZ; transaction'ı migrate.sh yönetiyor.

-- --------------------------------------------------------------- 1) PROGRAM
-- user_id null => sistem (hazır) programı, herkese görünür.
insert into public.programs (name, description, level, is_premium)
values (
  'PROGRAM_ADI',
  'Haftada N gün. Kimin için, neyi hedefliyor - bir iki cümle.',
  'beginner',   -- beginner | intermediate | advanced
  false
);

-- ------------------------------------------------- 2) ADLAR GERÇEKTEN VAR MI
-- Bu blok, aşağıdaki values listesinde geçen ama veritabanında OLMAYAN hareket
-- adlarını tek tek isimlendirip transaction'ı patlatıyor. Sonradan "satır sayısı
-- tutmadı" demekten iyi: hangi adın yanlış yazıldığını doğrudan söylüyor.
do $$
declare
  eksik text;
begin
  select string_agg(v.name, ', ') into eksik
  from (values
    ('Standart Şınav'),
    ('Pull-up (Barfiks)'),
    ('Squat (Vücut Ağırlığı)'),
    ('Plank')
  ) as v(name)
  where not exists (select 1 from public.movements m where m.name = v.name);

  if eksik is not null then
    raise exception 'Bu hareket adları bulunamadı: %  (scripts/movements.sh ile kontrol et)', eksik;
  end if;
end $$;

-- ------------------------------------------------------------ 3) HAREKETLER
-- day_of_week: 1=Pazartesi ... 7=Pazar
-- target_* alanları programın KENDİ hacim reçetesi; hareketin ustalık hedefini
-- ezmez. İkisi farklı şeyler: ustalık hedefi kilidi açar, program hedefi o gün
-- ne yapılacağını söyler.
insert into public.program_movements
  (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, v.day_of_week, v.sets, v.reps, v.seconds, v.rest, v.ord
from (values
  -- hareket adı, gün, set, tekrar, süre, dinlenme, sıra
  ('Standart Şınav',          1, 3, 12,        null::int, 60, 1),
  ('Pull-up (Barfiks)',       1, 3, 6,         null::int, 90, 2),
  ('Squat (Vücut Ağırlığı)',  1, 3, 20,        null::int, 60, 3),
  ('Plank',                   1, 3, null::int, 45,        45, 4)
) as v(movement_name, day_of_week, sets, reps, seconds, rest, ord)
cross join public.programs p
join public.movements m on m.name = v.movement_name
where p.name = 'PROGRAM_ADI' and p.user_id is null;

-- ------------------------------------------------------------- 4) DOĞRULAMA
-- Ad eşleşmesi ikinci bir riski daha taşıyor: ileride aynı adı taşıyan İKİNCİ
-- bir hareket eklenirse satırlar sessizce ikiye katlanır. Sayı tutmuyorsa
-- transaction burada patlıyor ve her şey geri alınıyor.
do $$
declare
  adet int;
  beklenen int := 4;   -- yukarıdaki values listesinin satır sayısı
begin
  select count(*) into adet
  from public.program_movements pm
  join public.programs p on p.id = pm.program_id
  where p.name = 'PROGRAM_ADI' and p.user_id is null;

  if adet <> beklenen then
    raise exception 'Programda % hareket satırı bekleniyordu, % bulundu', beklenen, adet;
  end if;
end $$;
