-- 0012: Hareket öğretim içeriği
--
-- Hareket detay ekranı şu ana kadar tek cümlelik bir açıklama ve "görsel yakında"
-- yazan boş bir kutu gösteriyordu. Görsel tedarik etmek içerik/telif işi ve kısa
-- vadede çözülmüyor; asıl eksik olan ise nasıl yapılacağının anlatılması.
--
-- Üç dizi kolon ekleniyor. Dizi (text[]) tercih edildi çünkü ekran bunları
-- numaralı adım / madde listesi olarak çiziyor - tek bir metin bloğunu ekranda
-- parçalamak zorunda kalmıyoruz.
--
-- İçerik şimdilik kullanıcının BUGÜN ulaşabileceği 12 harekete yazıldı:
-- 5 Temel Güç hareketi + 7 zincirin ilk basamağı. Diğer basamaklar boş kalıyor,
-- ekran boş alanları hiç çizmiyor (bölüm görünmüyor), ilerledikçe doldurulacak.
--
-- Metinlerde $$...$$ (dollar quoting) kullanılıyor: Türkçe içerikteki kesme
-- işareti tek tırnak kaçışı gerektirmesin diye.

alter table public.movements
  add column if not exists how_to text[],
  add column if not exists cues text[],
  add column if not exists mistakes text[];

-- ---------------------------------------------------------------- TEMEL GÜÇ

update public.movements set
  how_to = ARRAY[
    $$Eller omuz genişliğinden biraz açık, parmak uçları öne baksın.$$,
    $$Topuktan başa kadar tek bir düz hat kur; kalçayı sık, karnını içeri çek.$$,
    $$Dirsekleri gövdeye yaklaşık 45 derece açıyla bükerek göğsün yere bir yumruk kalana dek in.$$,
    $$Avuçlarınla yeri iterek kontrollü şekilde başlangıç pozisyonuna dön.$$
  ],
  cues = ARRAY[
    $$Nefes: inerken al, iterken ver.$$,
    $$Omuzları kulaklardan uzaklaştır, kürek kemiklerini sabit tut.$$
  ],
  mistakes = ARRAY[
    $$Kalçanın çökmesi ya da havaya kalkması - vücut düz bir hat olmalı.$$,
    $$Dirseklerin yanlara 90 derece açılması; omuz eklemini gereksiz zorlar.$$,
    $$Tam açıklık yapmadan yarım inmek.$$
  ]
where name = 'Standart Şınav'
  and group_id = (select id from movement_groups where slug = 'foundation');

update public.movements set
  how_to = ARRAY[
    $$Barı omuz genişliğinde, avuç içleri ileri bakacak şekilde kavra.$$,
    $$Kollar tam açık, gövde sakin şekilde asıl (ölü asılma).$$,
    $$Önce kürek kemiklerini aşağı-geri çek, sonra dirsekleri bükerek çenen barın üstüne çıkana dek çek.$$,
    $$Kontrollü şekilde tam açıklığa geri in.$$
  ],
  cues = ARRAY[
    $$Barı kendine çekmek yerine kendini bara çekmeyi düşün.$$,
    $$Kalçayı sık, bacakları hafif önde tut - sallanmayı keser.$$
  ],
  mistakes = ARRAY[
    $$Sallanarak veya tekme atarak momentum almak.$$,
    $$Aşağıda kolları tam açmamak - yarım tekrar sayılmaz.$$,
    $$Omuzları kulaklara doğru bırakıp asılı kalmak.$$
  ]
where name = 'Pull-up (Barfiks)'
  and group_id = (select id from movement_groups where slug = 'foundation');

update public.movements set
  how_to = ARRAY[
    $$Paralel barlarda kollar tam açık, gövde dik olacak şekilde destek pozisyonuna geç.$$,
    $$Omuzları aşağı-geri kilitle, kalçayı sık.$$,
    $$Dirsekleri geriye doğru bükerek omuzların dirsek hizasının biraz altına inene dek alçal.$$,
    $$Barları iterek başlangıç pozisyonuna dön.$$
  ],
  cues = ARRAY[
    $$Dirsekler yanlara açılmasın, gövdeye yakın kalsın.$$,
    $$Bilekleri nötr tut; ağrı olursa paralet kullan.$$
  ],
  mistakes = ARRAY[
    $$Gereğinden derine inip omuz eklemini zorlamak.$$,
    $$Omuzların kulaklara doğru yükselmesi.$$,
    $$Sallanarak momentum kullanmak.$$
  ]
where name = 'Dips'
  and group_id = (select id from movement_groups where slug = 'foundation');

update public.movements set
  how_to = ARRAY[
    $$Ön kollar yerde, dirsekler omuzların tam altında.$$,
    $$Ayak parmak uçlarına bas; topuktan başa düz bir hat kur.$$,
    $$Karnı ve kalçayı sıkarak pozisyonu koru, nefesini tutma.$$
  ],
  cues = ARRAY[
    $$Kaburgaları aşağı çek, beli çukurlaştırma.$$,
    $$Bakış yere; boyun gövdeyle aynı hatta kalsın.$$
  ],
  mistakes = ARRAY[
    $$Kalçanın çökmesi - bel çukurlaşır, yük omurgaya biner.$$,
    $$Kalçanın çok yukarı kalkması - hareket kolaylaşır ama karın çalışmaz.$$,
    $$Başı geriye atmak.$$
  ]
where name = 'Plank'
  and group_id = (select id from movement_groups where slug = 'foundation');

update public.movements set
  how_to = ARRAY[
    $$Sırt üstü uzan, kollar başının üzerinde uzatılmış olsun.$$,
    $$Beli yere yapıştır, kaburgaları aşağı çek.$$,
    $$Omuzları ve bacakları yerden birkaç santim kaldır; gövde hafif muz şeklini alsın.$$,
    $$Bel yerden ayrılmadan pozisyonu koru.$$
  ],
  cues = ARRAY[
    $$Bel kalkıyorsa bacakları biraz daha yukarı al - açı büyüdükçe hareket kolaylaşır.$$,
    $$Nefes almayı sürdür, pozisyonu nefes tutarak taşıma.$$
  ],
  mistakes = ARRAY[
    $$Belin yerden ayrılması - en sık ve en önemli hata.$$,
    $$Çeneyi göğse yapıştırıp boynu zorlamak.$$
  ]
where name = 'Hollow Body Tutuş'
  and group_id = (select id from movement_groups where slug = 'foundation');

-- -------------------------------------------------- ZİNCİRLERİN İLK BASAMAKLARI

update public.movements set
  how_to = ARRAY[
    $$Ayaklarını duvara dayayıp ellerinin üzerinde geri yürüyerek kalçanı omuz hizasının üstüne getir.$$,
    $$Gövde ile bacaklar arasında yaklaşık dik açı oluşsun.$$,
    $$Kolları tam aç, omuzlarını kulaklara doğru iterek aktif tut.$$
  ],
  cues = ARRAY[
    $$Ağırlığı parmak uçlarına ver, avuç içinle yeri kavra.$$,
    $$Kalçayı sık, beli nötr tut.$$
  ],
  mistakes = ARRAY[
    $$Dirsekleri bükmek.$$,
    $$Belin çukurlaşıp kaburgaların açılması.$$
  ]
where name = 'Duvarda Pike Pozisyonu'
  and group_id = (select id from movement_groups where slug = 'handstand');

update public.movements set
  how_to = ARRAY[
    $$Eller ve ayaklar yerde, kalçan havada olacak şekilde ters V (pike) pozisyonu al.$$,
    $$Başını ellerinin biraz önündeki bir noktaya doğru indir.$$,
    $$Dirsekleri bükerek başının tepesi yere yaklaşana dek in, sonra yeri iterek çık.$$
  ],
  cues = ARRAY[
    $$Dirsekler yanlara değil, hafif geriye doğru açılsın.$$,
    $$Kalçayı yüksek tut - gövde ne kadar dikse omuz o kadar çalışır.$$
  ],
  mistakes = ARRAY[
    $$Kalçanın düşüp hareketin normal şınava dönüşmesi.$$,
    $$Boynu zorlayarak baştan itmeye çalışmak.$$
  ]
where name = 'Pike Şınav'
  and group_id = (select id from movement_groups where slug = 'hspu');

update public.movements set
  how_to = ARRAY[
    $$Paralel barlara ya da yere ellerinle yüklen, kolları tam aç.$$,
    $$Omuzlarını aşağı bastır - kulaklardan uzaklaştır.$$,
    $$Dizleri göğsüne çekip ayaklarını yerden kes.$$,
    $$Kollar düz, omuzlar kilitli şekilde pozisyonu koru.$$
  ],
  cues = ARRAY[
    $$Yükselme omuzu aşağı itmekten gelir, kolu bükmekten değil.$$,
    $$Karnı sık, sırtı hafif yuvarlak tut.$$
  ],
  mistakes = ARRAY[
    $$Omuzların kulaklara doğru kaçması.$$,
    $$Dirsek bükerek pozisyonu taşımaya çalışmak.$$
  ]
where name = 'Tuck L-Sit'
  and group_id = (select id from movement_groups where slug = 'l-sit');

update public.movements set
  how_to = ARRAY[
    $$Barı omuz genişliğinde kavra, ölü asılmadan başla.$$,
    $$Hiç sallanmadan, tek düzlemde çenen barın üstüne çıkana dek çek.$$,
    $$Tepede bir saniye dur, sonra en az iki saniyede kontrollü in.$$
  ],
  cues = ARRAY[
    $$Gövde dik ve sabit; bacaklar hafif önde, hollow pozisyonda.$$,
    $$İnişi acele etme - güç en çok orada birikir.$$
  ],
  mistakes = ARRAY[
    $$Momentum kullanmak; bu basamağın amacı kontrolü ölçmek.$$,
    $$Tepede omuzların öne yuvarlanması.$$
  ]
where name = 'Sıkı Pull-up'
  and group_id = (select id from movement_groups where slug = 'muscle-up');

update public.movements set
  how_to = ARRAY[
    $$Alçak bir barda çalış; ilk denemelerde yanında biri olsun.$$,
    $$Bara asıl, dizleri göğsüne çek ve kalçanı barın üstünden geçirerek ters asılı pozisyona gel.$$,
    $$Kollar düz, dizler göğüste; gövdeni yavaşça yere paralel hâle getir.$$,
    $$Çıkarken aynı yoldan kontrollü şekilde geri dön.$$
  ],
  cues = ARRAY[
    $$Kürek kemiklerini aşağı-geri kilitle.$$,
    $$Kalçayı sık, beli nötr tut.$$
  ],
  mistakes = ARRAY[
    $$Dirsek bükmek - yük omuzdan kola kayar.$$,
    $$Belin aşırı çukurlaşması.$$,
    $$Pozisyona kontrolsüz düşmek.$$
  ]
where name = 'Tuck Back Lever'
  and group_id = (select id from movement_groups where slug = 'back-lever');

update public.movements set
  how_to = ARRAY[
    $$Bara asıl, kürek kemiklerini aşağı-geri kilitle.$$,
    $$Dizleri göğsüne çek, kalçanı yukarı getirerek sırtını yere paralel yaklaştır.$$,
    $$Kollar düz, gövde yere paralel; dizler göğüste kalsın.$$
  ],
  cues = ARRAY[
    $$Barı aşağı doğru itmeyi düşün - düz kolla çekiş buradan gelir.$$,
    $$Hollow body pozisyonunu koru, bel çukurlaşmasın.$$
  ],
  mistakes = ARRAY[
    $$Dirsek bükmek.$$,
    $$Kalçanın düşüp gövdenin dikleşmesi.$$
  ]
where name = 'Tuck Front Lever'
  and group_id = (select id from movement_groups where slug = 'front-lever');

update public.movements set
  how_to = ARRAY[
    $$Şınav pozisyonuna geç; elleri bel hizasına yakın koy, parmak uçlarını dışa çevir.$$,
    $$Kollar tam açıkken omuzlarını ellerinin ilerisine taşıyacak şekilde öne eğil.$$,
    $$Kürek kemiklerini ayır (sırtı hafif yuvarlat), kalçayı sık ve pozisyonu koru.$$
  ],
  cues = ARRAY[
    $$Ne kadar öne eğilirsen o kadar zor - açıyı haftalar içinde kademeli artır.$$,
    $$Bilek ağrısı olursa paralet kullan ya da yumruk üstünde çalış.$$
  ],
  mistakes = ARRAY[
    $$Dirseklerin bükülmesi.$$,
    $$Kalçanın çökmesi - gövde düz kalmalı.$$
  ]
where name = 'Planche Lean'
  and group_id = (select id from movement_groups where slug = 'planche');
