-- 0015: Üç yeni progression zinciri + bacak temeli
--
-- Neden: uygulamanın hareket havuzu yedi ileri seviye BECERİ zincirinden
-- (handstand, hspu, l-sit, muscle up, back/front lever, planche) ve beş temel
-- hareketten ibaretti. İki gerçek boşluk vardı:
--
--   1) Alt vücut hiç yoktu. Kalistenik uygulamasında squat olmaması bir eksik.
--   2) "Temel Güç" ile "Planche" arasında ara güç basamağı yoktu; tek kol şınav
--      ve tek kol barfiks gibi klasik güç hedefleri havuzda geçmiyordu.
--
-- Bu migration üç yeni zincir ve bir yeni temel hareket ekliyor. Kod tarafında
-- değişiklik GEREKMİYOR: kilit/hedef motoru (areAllPrerequisitesMet, isTargetMet,
-- computeFocusSuggestions) kategoriden bağımsız çalışıyor, ekranlar da grupları
-- tablodan okuyor.
--
-- Mevcut kullanıcıların kilit durumu değişmiyor: yeni satırlar eklenirken hiçbir
-- eski hareketin ön koşulu değiştirilmiyor. Yalnızca Temel Güç kategorisine bir
-- hareket (Squat) eklendiği için, o kategorinin "Sırada Bu Var" önerisi tüm
-- eskileri tamamlamış bir kullanıcıda Squat'a kayar - bu istenen davranış.

-- Transaction'ı bilerek AÇMIYORUZ: scripts/migrate.sh her dosyayı zaten tek
-- transaction'da çalıştırıyor (--single-transaction). Dosyanın kendi begin/commit'i
-- olduğunda, biri eksik yapıştırılırsa her şey sessizce geri alınıyor - bir kez
-- başımıza geldi.

-- ------------------------------------------------------------ YENİ KATEGORİLER
insert into public.movement_groups (slug, name, description, order_index) values
  ('pistol-squat', 'Pistol Squat',
   'Tek bacak üzerinde tam derinlikte squat: bacak gücü, denge ve ayak bileği hareketliliği.', 8),
  ('one-arm-pushup', 'Tek Kol Şınav',
   'İtme gücünü tek kola indirgeyen klasik güç hedefi.', 9),
  ('one-arm-pullup', 'Tek Kol Barfiks',
   'Çekme gücünün zirvesi: tek kolla tam açıklıkta barfiks.', 10);

-- ------------------------------------------------------------ TEMEL: SQUAT
-- Yeni zincirlerin ön koşulu olacak tek temel hareket. movement_type='foundation'
-- olduğu için kilit mantığının dışında kalır, herkese açıktır.
insert into public.movements
  (group_id, name, description, movement_type, difficulty_level, target_type, target_sets, target_reps, target_duration_seconds, order_index)
values
  ((select id from movement_groups where slug='foundation'),
   'Squat (Vücut Ağırlığı)',
   'Kalça diz hizasının altına inecek şekilde, topuklar yerde tam derinlikte squat.',
   'foundation', 1, 'reps_sets', 3, 25, null, 6);

-- ------------------------------------------------------------ PISTOL SQUAT
insert into public.movements
  (group_id, name, description, difficulty_level, target_type, target_sets, target_reps, target_duration_seconds, target_note, order_index)
values
  ((select id from movement_groups where slug='pistol-squat'),
   'Bulgar Split Squat',
   'Arka ayak yükseltide, öndeki bacakla tam derinlikte in ve kalk.',
   2, 'reps_sets', 3, 10, null, 'Her bacak için ayrı ayrı', 1),
  ((select id from movement_groups where slug='pistol-squat'),
   'Destekli Pistol',
   'Bir eli direğe/kapı kasasına tutunarak tek bacakla tam derinliğe in.',
   3, 'reps_sets', 3, 8, null, 'Her bacak için ayrı ayrı', 2),
  ((select id from movement_groups where slug='pistol-squat'),
   'Kutuya Pistol (Box Pistol)',
   'Tek bacakla bir sandalye/kutuya otur ve destek almadan kalk.',
   4, 'reps_sets', 3, 6, null, 'Her bacak için ayrı ayrı', 3),
  ((select id from movement_groups where slug='pistol-squat'),
   'Negatif Pistol',
   'Tek bacakla yavaşça en dibe in, kalkarken iki bacağı da kullan.',
   5, 'reps_sets', 3, 5, null, 'İniş en az 5 saniye sürmeli', 4),
  ((select id from movement_groups where slug='pistol-squat'),
   'Tam Pistol Squat',
   'Serbest duruşta tek bacakla tam derinliğe inip aynı bacakla kalk.',
   6, 'reps_sets', 3, 5, null, 'Her bacak için ayrı ayrı', 5);

-- ------------------------------------------------------------ TEK KOL ŞINAV
insert into public.movements
  (group_id, name, description, difficulty_level, target_type, target_sets, target_reps, target_duration_seconds, target_note, order_index)
values
  ((select id from movement_groups where slug='one-arm-pushup'),
   'Arşer Şınav (Archer Push-up)',
   'Bir kol bükülü iterken diğeri yana açık ve düz kalır; yükü tek kola kaydırır.',
   4, 'reps_sets', 3, 8, null, 'Her kol için ayrı ayrı', 1),
  ((select id from movement_groups where slug='one-arm-pushup'),
   'Yükseltilmiş Tek Kol Şınav',
   'Elini sehpa/basamak gibi bir yükseltiye koyarak tek kolla şınav çek.',
   5, 'reps_sets', 3, 6, null, 'Her kol için ayrı ayrı', 2),
  ((select id from movement_groups where slug='one-arm-pushup'),
   'Tek Kol Şınav Negatifi',
   'Tek kolla yavaşça yere in, yukarı çıkarken iki kolu birden kullan.',
   6, 'reps_sets', 3, 5, null, 'İniş en az 4 saniye sürmeli', 3),
  ((select id from movement_groups where slug='one-arm-pushup'),
   'Bacaklar Açık Tek Kol Şınav',
   'Ayakları genişçe açarak dengeyi kolaylaştır, tam açıklıkta tek kolla it.',
   7, 'reps_sets', 3, 5, null, 'Her kol için ayrı ayrı', 4),
  ((select id from movement_groups where slug='one-arm-pushup'),
   'Tam Tek Kol Şınav',
   'Ayaklar omuz genişliğinde, gövde dönmeden tek kolla tam şınav.',
   8, 'reps_sets', 3, 3, null, 'Her kol için ayrı ayrı', 5);

-- ------------------------------------------------------------ TEK KOL BARFİKS
insert into public.movements
  (group_id, name, description, difficulty_level, target_type, target_sets, target_reps, target_duration_seconds, target_note, order_index)
values
  ((select id from movement_groups where slug='one-arm-pullup'),
   'Arşer Barfiks (Archer Pull-up)',
   'Geniş tutuşta bir kola doğru çekilirken diğer kol düz kalır.',
   5, 'reps_sets', 3, 5, null, 'Her kol için ayrı ayrı', 1),
  ((select id from movement_groups where slug='one-arm-pullup'),
   'Tek Kol Ölü Asılış',
   'Tek kolla bara asıl; omuz paketli, gövde sallanmadan tut.',
   5, 'duration', null, null, 20, 'Her kol için ayrı ayrı', 2),
  ((select id from movement_groups where slug='one-arm-pullup'),
   'Tek Kol Negatif',
   'Çeneni barın üstüne çıkar, tek kolla yavaşça aşağı in.',
   7, 'reps_sets', 3, 3, null, 'İniş en az 5 saniye sürmeli', 3),
  ((select id from movement_groups where slug='one-arm-pullup'),
   'Lastik Destekli Tek Kol Barfiks',
   'Direnç lastiğiyle yükü hafifleterek tek kolla tam çekiş yap.',
   8, 'reps_sets', 3, 3, null, 'Her kol için ayrı ayrı', 4),
  ((select id from movement_groups where slug='one-arm-pullup'),
   'Tam Tek Kol Barfiks',
   'Hiçbir destek olmadan tek kolla tam açıklıkta barfiks.',
   10, 'reps_sets', 3, 1, null, 'Her kol için ayrı ayrı', 5);

-- ------------------------------------------------------------ İLK BASAMAK ÖN KOŞULLARI
-- Her yeni zincirin ilk basamağı Temel Güç hareketlerine bağlanıyor.
-- target_* kolonları burada BİLEREK doldurulmuş: zincire giriş için temel
-- hareketin kendi hedefinden daha yükseğini istiyoruz (ör. Standart Şınav'ın
-- kendi hedefi 3x15 ama arşer şınava geçmek için 3x20).
insert into public.movement_prerequisites
  (movement_id, prerequisite_movement_id, target_sets, target_reps, target_duration_seconds, order_index)
values
  ((select id from movements where name='Bulgar Split Squat' and group_id=(select id from movement_groups where slug='pistol-squat')),
   (select id from movements where name='Squat (Vücut Ağırlığı)' and group_id=(select id from movement_groups where slug='foundation')),
   3, 25, null, 1),

  ((select id from movements where name='Arşer Şınav (Archer Push-up)' and group_id=(select id from movement_groups where slug='one-arm-pushup')),
   (select id from movements where name='Standart Şınav' and group_id=(select id from movement_groups where slug='foundation')),
   3, 20, null, 1),
  ((select id from movements where name='Arşer Şınav (Archer Push-up)' and group_id=(select id from movement_groups where slug='one-arm-pushup')),
   (select id from movements where name='Plank' and group_id=(select id from movement_groups where slug='foundation')),
   null, null, 60, 2),

  ((select id from movements where name='Arşer Barfiks (Archer Pull-up)' and group_id=(select id from movement_groups where slug='one-arm-pullup')),
   (select id from movements where name='Pull-up (Barfiks)' and group_id=(select id from movement_groups where slug='foundation')),
   3, 12, null, 1),
  ((select id from movements where name='Arşer Barfiks (Archer Pull-up)' and group_id=(select id from movement_groups where slug='one-arm-pullup')),
   (select id from movements where name='Hollow Body Tutuş' and group_id=(select id from movement_groups where slug='foundation')),
   null, null, 45, 2);

-- ------------------------------------------------------------ ZİNCİR İÇİ ÖN KOŞULLAR
-- 0006'daki sorgunun aynısı. Orada olduğu gibi target_* NULL bırakılıyor:
-- getPrerequisiteTarget() override yoksa önceki basamağın kendi hedefine düşüyor,
-- böylece hedef tek yerde (movements tablosunda) tanımlı kalıyor.
-- "on conflict do nothing" sayesinde eski zincirlerdeki satırlar tekrarlanmıyor,
-- yalnızca yeni basamaklar için satır üretiliyor.
insert into public.movement_prerequisites (movement_id, prerequisite_movement_id, order_index)
select
  cur.id,
  prev.id,
  coalesce(
    (select max(mp.order_index) from public.movement_prerequisites mp where mp.movement_id = cur.id),
    0
  ) + 1
from public.movements cur
join public.movements prev
  on prev.group_id = cur.group_id
  and prev.order_index = cur.order_index - 1
join public.movement_groups g on g.id = cur.group_id
where g.slug <> 'foundation'
  and cur.movement_type = 'progression'
  and prev.movement_type = 'progression'
on conflict (movement_id, prerequisite_movement_id) do nothing;

-- ------------------------------------------------------------ ÖĞRETİM İÇERİĞİ
-- 0012'deki yaklaşımın devamı: içerik kullanıcının BUGÜN ulaşabileceği
-- hareketlere yazılıyor (yeni temel hareket + üç zincirin ilk basamağı).
-- Diğer basamaklar boş kalıyor; ekran boş bölümü hiç çizmiyor.

update public.movements set
  how_to = ARRAY[
    $$Ayaklar omuz genişliğinde, parmak uçları hafif dışa dönük dursun.$$,
    $$Kalçayı geriye ve aşağıya götürerek in; göğsü dik, sırtı düz tut.$$,
    $$Kalça diz hizasının altına inene kadar devam et, topuklar yerden kalkmasın.$$,
    $$Topuklardan iterek kalk ve tepede kalçayı sık.$$
  ],
  cues = ARRAY[
    $$Ağırlık ayağın orta-arka kısmında olsun, parmak uçlarına kaçmasın.$$,
    $$Dizler ayak parmaklarının baktığı yöne doğru açılsın, içeri çökmesin.$$,
    $$İnerken nefes al, kalkarken ver.$$
  ],
  mistakes = ARRAY[
    $$Yarım derinlik: kalça diz hizasının üstünde kalıyorsa hareket tamamlanmamıştır.$$,
    $$Topuk kalkması - genelde ayak bileği hareketliliği eksikliğidir, esnetme ile çalış.$$,
    $$Belin öne kırılması (butt wink): derinliği azaltıp core'u sıkarak düzelt.$$
  ]
where name='Squat (Vücut Ağırlığı)' and group_id=(select id from movement_groups where slug='foundation');

update public.movements set
  how_to = ARRAY[
    $$Normalden belirgin geniş bir şınav pozisyonu al.$$,
    $$Bir kolu bükerek o tarafa doğru in; diğer kol yana açık ve dümdüz kalsın.$$,
    $$Göğsün bükülü kolun eline yaklaşana kadar in.$$,
    $$Bükülü koldan iterek kalk, sonra diğer tarafa geç.$$
  ],
  cues = ARRAY[
    $$Kalça yere paralel kalsın, tek tarafa devrilmesin.$$,
    $$Düz kalan kol destek değil denge içindir; ona yaslanma.$$,
    $$Tekrarları iki kola eşit böl.$$
  ],
  mistakes = ARRAY[
    $$Düz kolla itmek - o zaman hareket geniş şınava dönüşür.$$,
    $$Gövdenin dönmesi; kalçayı kare tutarak engelle.$$,
    $$Kalçanın yukarı kalkması, yani ROM'un kısalması.$$
  ]
where name='Arşer Şınav (Archer Push-up)' and group_id=(select id from movement_groups where slug='one-arm-pushup');

update public.movements set
  how_to = ARRAY[
    $$Bara omuz genişliğinden belirgin geniş, avuç içleri öne bakacak şekilde asıl.$$,
    $$Bir kola doğru çekil; çektiğin taraftaki dirsek bükülürken diğer kol düz kalsın.$$,
    $$Çeneni çektiğin elin hizasına getir.$$,
    $$Kontrollü in ve diğer tarafa geç.$$
  ],
  cues = ARRAY[
    $$Kürek kemiklerini önce aşağı-geri paketle, sonra çekmeye başla.$$,
    $$Düz kalan kol yalnızca dengeler; onunla itme.$$,
    $$Sallanma (kipping) olmadan çal.$$
  ],
  mistakes = ARRAY[
    $$İki kolun da bükülmesi - yük tek kola geçmemiş olur.$$,
    $$Yarım açıklık: aşağıda kollar tam açılmalı.$$,
    $$Bacaklarla sıçrayarak ivme almak.$$
  ]
where name='Arşer Barfiks (Archer Pull-up)' and group_id=(select id from movement_groups where slug='one-arm-pullup');

update public.movements set
  how_to = ARRAY[
    $$Arka ayağını arkanda bir sehpa/sandalyeye koy, ön ayağını bir adım öne al.$$,
    $$Gövdeni dik tutarak arka dizin yere yaklaşana kadar in.$$,
    $$Ön ayağın topuğundan iterek kalk.$$,
    $$Seti bitirince bacak değiştir.$$
  ],
  cues = ARRAY[
    $$Ön diz ayak bileğinin çok önüne geçmesin; gerekirse ön ayağı biraz daha öne al.$$,
    $$Yük ön bacakta olsun, arka bacak sadece dengeliyor.$$,
    $$İnerken kontrollü ol, çökme.$$
  ],
  mistakes = ARRAY[
    $$Adımın kısa olması - dizde baskı yaratır, kalçayı çalıştırmaz.$$,
    $$Gövdenin öne yatması.$$,
    $$İki bacağı farklı sayıda çalışmak; her seti iki tarafa da uygula.$$
  ]
where name='Bulgar Split Squat' and group_id=(select id from movement_groups where slug='pistol-squat');
