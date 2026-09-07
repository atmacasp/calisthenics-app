
-- İlk gerçek program: Programlar özelliğinin "ilk adımı". Sadece Temel Güç
-- hareketleri kullanılıyor (hiçbirinin ön koşulu yok, her kullanıcı hemen
-- başlayabilir). program_movements.target_* alanları movements tablosundaki
-- "ustalık hedefinden" BAĞIMSIZDIR - bir program kendi hacim/yoğunluk
-- reçetesini taşır, movement'ın kendi progression hedefini değiştirmez.
insert into public.programs (name, description, level, is_premium)
values (
  'Temel Calisthenics Programı',
  'Haftada 3 gün (Pazartesi/Çarşamba/Cuma), sadece Temel Güç hareketleriyle - calisthenics yolculuğuna sağlam bir temelle başla.',
  'beginner',
  false
);

-- Gün 1 (Pazartesi) - İtiş & Kor
insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 1, 3, 12, null, 60, 1
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Standart Şınav';

insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 1, 3, 8, null, 60, 2
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Dips';

insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 1, 3, null, 40, 45, 3
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Plank';

-- Gün 2 (Çarşamba) - Çekiş & Kor
insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 3, 3, 6, null, 90, 1
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Pull-up (Barfiks)';

insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 3, 3, null, 25, 45, 2
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Hollow Body Tutuş';

-- Gün 3 (Cuma) - Tam Vücut
insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 5, 3, 15, null, 60, 1
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Standart Şınav';

insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 5, 3, 8, null, 90, 2
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Pull-up (Barfiks)';

insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 5, 3, 10, null, 60, 3
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Dips';

insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 5, 3, null, 30, 45, 4
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Hollow Body Tutuş';

insert into public.program_movements (program_id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index)
select p.id, m.id, 5, 3, null, 45, 45, 5
from public.programs p, public.movements m
where p.name = 'Temel Calisthenics Programı' and m.name = 'Plank';
