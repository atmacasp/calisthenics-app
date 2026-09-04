-- FOUNDATION HAREKETLERİ
insert into public.movements (group_id, name, description, movement_type, difficulty_level, target_type, target_sets, target_reps, target_duration_seconds, order_index) values
((select id from movement_groups where slug='foundation'), 'Standart Şınav', 'Tam ROM ile göğüs yere değecek şekilde kontrollü şınav.', 'foundation', 2, 'reps_sets', 3, 15, null, 1),
((select id from movement_groups where slug='foundation'), 'Pull-up (Barfiks)', 'Çene barın üzerine çıkacak şekilde tam açıklıkta barfiks.', 'foundation', 3, 'reps_sets', 3, 8, null, 2),
((select id from movement_groups where slug='foundation'), 'Dips', 'Paralel barda omuzlar dirseklerin altına inecek şekilde kontrollü dips.', 'foundation', 3, 'reps_sets', 3, 10, null, 3),
((select id from movement_groups where slug='foundation'), 'Plank', 'Düz gövde hattıyla ön kol plank tutuşu.', 'foundation', 1, 'duration', null, null, 45, 4),
((select id from movement_groups where slug='foundation'), 'Hollow Body Tutuş', 'Sırt üstü, bel yere yapışık halde hollow body pozisyonu.', 'foundation', 2, 'duration', null, null, 30, 5);

-- HANDSTAND hedefleri
update public.movements set target_type='duration', target_duration_seconds=30 where name='Duvarda Pike Pozisyonu' and group_id=(select id from movement_groups where slug='handstand');
update public.movements set target_type='duration', target_duration_seconds=30 where name='Duvara Yaslı Amut (Göğüs Duvara Dönük)' and group_id=(select id from movement_groups where slug='handstand');
update public.movements set target_type='duration', target_duration_seconds=45 where name='Duvara Yaslı Amut (Sırt Duvara Dönük)' and group_id=(select id from movement_groups where slug='handstand');
update public.movements set target_type='reps_sets', target_sets=5, target_reps=1, target_note='5 denemede en az birinde 3 saniye dengeyi yakala' where name='Amuda Kalkış Denemeleri (Kick-up)' and group_id=(select id from movement_groups where slug='handstand');
update public.movements set target_type='duration', target_duration_seconds=60 where name='Serbest Amut' and group_id=(select id from movement_groups where slug='handstand');

-- HSPU hedefleri
update public.movements set target_type='reps_sets', target_sets=3, target_reps=10 where name='Pike Şınav' and group_id=(select id from movement_groups where slug='hspu');
update public.movements set target_type='reps_sets', target_sets=3, target_reps=8 where name='Yükseltilmiş Pike Şınav' and group_id=(select id from movement_groups where slug='hspu');
update public.movements set target_type='reps_sets', target_sets=3, target_reps=5, target_note='İniş en az 5 saniye sürmeli' where name='Duvarda HSPU Negatif' and group_id=(select id from movement_groups where slug='hspu');
update public.movements set target_type='reps_sets', target_sets=3, target_reps=5 where name='Duvarda Tam HSPU' and group_id=(select id from movement_groups where slug='hspu');
update public.movements set target_type='reps_sets', target_sets=3, target_reps=3 where name='Serbest HSPU' and group_id=(select id from movement_groups where slug='hspu');

-- L-SIT hedefleri
update public.movements set target_type='duration', target_duration_seconds=20 where name='Tuck L-Sit' and group_id=(select id from movement_groups where slug='l-sit');
update public.movements set target_type='duration', target_duration_seconds=15, target_note='Her bacak için ayrı ayrı' where name='Tek Bacak Açık L-Sit' and group_id=(select id from movement_groups where slug='l-sit');
update public.movements set target_type='duration', target_duration_seconds=20 where name='Tam L-Sit' and group_id=(select id from movement_groups where slug='l-sit');
update public.movements set target_type='duration', target_duration_seconds=10 where name='V-Sit' and group_id=(select id from movement_groups where slug='l-sit');

-- MUSCLE UP hedefleri
update public.movements set target_type='reps_sets', target_sets=3, target_reps=8 where name='Sıkı Pull-up' and group_id=(select id from movement_groups where slug='muscle-up');
update public.movements set target_type='reps_sets', target_sets=3, target_reps=5 where name='Göğüse Çekiş (High Pull-up)' and group_id=(select id from movement_groups where slug='muscle-up');
update public.movements set target_type='reps_sets', target_sets=3, target_reps=3 where name='Sıçramalı Muscle Up' and group_id=(select id from movement_groups where slug='muscle-up');
update public.movements set target_type='reps_sets', target_sets=3, target_reps=3, target_note='Bacaklarda hiç sıçrama olmadan' where name='Sıkı Muscle Up' and group_id=(select id from movement_groups where slug='muscle-up');

-- BACK LEVER hedefleri
update public.movements set target_type='duration', target_duration_seconds=15 where name='Tuck Back Lever' and group_id=(select id from movement_groups where slug='back-lever');
update public.movements set target_type='duration', target_duration_seconds=15 where name='İleri Tuck Back Lever' and group_id=(select id from movement_groups where slug='back-lever');
update public.movements set target_type='duration', target_duration_seconds=12, target_note='Her bacak için ayrı ayrı' where name='Tek Bacak Back Lever' and group_id=(select id from movement_groups where slug='back-lever');
update public.movements set target_type='duration', target_duration_seconds=10 where name='Straddle Back Lever' and group_id=(select id from movement_groups where slug='back-lever');
update public.movements set target_type='duration', target_duration_seconds=10 where name='Tam Back Lever' and group_id=(select id from movement_groups where slug='back-lever');

-- FRONT LEVER hedefleri
update public.movements set target_type='duration', target_duration_seconds=15 where name='Tuck Front Lever' and group_id=(select id from movement_groups where slug='front-lever');
update public.movements set target_type='duration', target_duration_seconds=15 where name='İleri Tuck Front Lever' and group_id=(select id from movement_groups where slug='front-lever');
update public.movements set target_type='duration', target_duration_seconds=12, target_note='Her bacak için ayrı ayrı' where name='Tek Bacak Front Lever' and group_id=(select id from movement_groups where slug='front-lever');
update public.movements set target_type='duration', target_duration_seconds=10 where name='Straddle Front Lever' and group_id=(select id from movement_groups where slug='front-lever');
update public.movements set target_type='duration', target_duration_seconds=8 where name='Tam Front Lever' and group_id=(select id from movement_groups where slug='front-lever');

-- PLANCHE hedefleri
update public.movements set target_type='duration', target_duration_seconds=30 where name='Planche Lean' and group_id=(select id from movement_groups where slug='planche');
update public.movements set target_type='duration', target_duration_seconds=15 where name='Tuck Planche' and group_id=(select id from movement_groups where slug='planche');
update public.movements set target_type='duration', target_duration_seconds=12 where name='İleri Tuck Planche (Advanced Tuck)' and group_id=(select id from movement_groups where slug='planche');
update public.movements set target_type='duration', target_duration_seconds=10 where name='Tek Bacak Planche (Half-Lay)' and group_id=(select id from movement_groups where slug='planche');
update public.movements set target_type='duration', target_duration_seconds=8 where name='Straddle Planche' and group_id=(select id from movement_groups where slug='planche');
update public.movements set target_type='duration', target_duration_seconds=5 where name='Tam Planche (Full Planche)' and group_id=(select id from movement_groups where slug='planche');

-- ÖN KOŞUL ÖRNEKLERİ (her progression zincirinin ilk basamağı için temel güç şartı)
insert into public.movement_prerequisites (movement_id, prerequisite_movement_id, target_sets, target_reps, target_duration_seconds, order_index) values
((select id from movements where name='Duvarda Pike Pozisyonu' and group_id=(select id from movement_groups where slug='handstand')), (select id from movements where name='Plank' and group_id=(select id from movement_groups where slug='foundation')), null, null, 45, 1),
((select id from movements where name='Duvarda Pike Pozisyonu' and group_id=(select id from movement_groups where slug='handstand')), (select id from movements where name='Standart Şınav' and group_id=(select id from movement_groups where slug='foundation')), 3, 10, null, 2),
((select id from movements where name='Pike Şınav' and group_id=(select id from movement_groups where slug='hspu')), (select id from movements where name='Standart Şınav' and group_id=(select id from movement_groups where slug='foundation')), 3, 15, null, 1),
((select id from movements where name='Pike Şınav' and group_id=(select id from movement_groups where slug='hspu')), (select id from movements where name='Plank' and group_id=(select id from movement_groups where slug='foundation')), null, null, 45, 2),
((select id from movements where name='Tuck L-Sit' and group_id=(select id from movement_groups where slug='l-sit')), (select id from movements where name='Hollow Body Tutuş' and group_id=(select id from movement_groups where slug='foundation')), null, null, 30, 1),
((select id from movements where name='Göğüse Çekiş (High Pull-up)' and group_id=(select id from movement_groups where slug='muscle-up')), (select id from movements where name='Pull-up (Barfiks)' and group_id=(select id from movement_groups where slug='foundation')), 3, 8, null, 1),
((select id from movements where name='Göğüse Çekiş (High Pull-up)' and group_id=(select id from movement_groups where slug='muscle-up')), (select id from movements where name='Dips' and group_id=(select id from movement_groups where slug='foundation')), 3, 8, null, 2),
((select id from movements where name='Tuck Back Lever' and group_id=(select id from movement_groups where slug='back-lever')), (select id from movements where name='Pull-up (Barfiks)' and group_id=(select id from movement_groups where slug='foundation')), 3, 5, null, 1),
((select id from movements where name='Tuck Front Lever' and group_id=(select id from movement_groups where slug='front-lever')), (select id from movements where name='Pull-up (Barfiks)' and group_id=(select id from movement_groups where slug='foundation')), 3, 5, null, 1),
((select id from movements where name='Tuck Front Lever' and group_id=(select id from movement_groups where slug='front-lever')), (select id from movements where name='Hollow Body Tutuş' and group_id=(select id from movement_groups where slug='foundation')), null, null, 30, 2),
((select id from movements where name='Planche Lean' and group_id=(select id from movement_groups where slug='planche')), (select id from movements where name='Standart Şınav' and group_id=(select id from movement_groups where slug='foundation')), 3, 15, null, 1),
((select id from movements where name='Planche Lean' and group_id=(select id from movement_groups where slug='planche')), (select id from movements where name='Plank' and group_id=(select id from movement_groups where slug='foundation')), null, null, 45, 2);
