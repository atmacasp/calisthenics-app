-- HANDSTAND
insert into public.movements (group_id, name, description, difficulty_level, order_index) values
((select id from movement_groups where slug='handstand'), 'Duvarda Pike Pozisyonu', 'Ayaklar duvarda, eller yerde pike pozisyonunu koru. Omuz ve öncü kaslarını hazırlar.', 2, 1),
((select id from movement_groups where slug='handstand'), 'Duvara Yaslı Amut (Göğüs Duvara Dönük)', 'Göğüs duvara bakacak şekilde amuda kalk, dengeyi hissetmeye başla.', 3, 2),
((select id from movement_groups where slug='handstand'), 'Duvara Yaslı Amut (Sırt Duvara Dönük)', 'Sırt duvara dönük, hollow body pozisyonunda amudu tut.', 5, 3),
((select id from movement_groups where slug='handstand'), 'Amuda Kalkış Denemeleri (Kick-up)', 'Duvarsız amuda kalkmayı dene, dengeyi bulmaya çalış.', 6, 4),
((select id from movement_groups where slug='handstand'), 'Serbest Amut', 'Hiçbir desteğe dayanmadan amut pozisyonunu koru.', 8, 5);

-- HSPU
insert into public.movements (group_id, name, description, difficulty_level, order_index) values
((select id from movement_groups where slug='hspu'), 'Pike Şınav', 'Pike pozisyonunda şınav çekerek omuz itme gücü kazan.', 3, 1),
((select id from movement_groups where slug='hspu'), 'Yükseltilmiş Pike Şınav', 'Ayaklar bir kutu/sehpa üzerinde, açıyı dikleştirerek zorluğu artır.', 4, 2),
((select id from movement_groups where slug='hspu'), 'Duvarda HSPU Negatif', 'Amut pozisyonunda yavaşça inip yardımla çıkarak eksantrik gücü geliştir.', 5, 3),
((select id from movement_groups where slug='hspu'), 'Duvarda Tam HSPU', 'Amut pozisyonunda tam repertuar şınav çek.', 7, 4),
((select id from movement_groups where slug='hspu'), 'Serbest HSPU', 'Duvar desteği olmadan amutta şınav çek.', 9, 5);

-- L-SIT
insert into public.movements (group_id, name, description, difficulty_level, order_index) values
((select id from movement_groups where slug='l-sit'), 'Tuck L-Sit', 'Dizler göğse çekili, ayaklar yerden kesik pozisyonda tut.', 3, 1),
((select id from movement_groups where slug='l-sit'), 'Tek Bacak Açık L-Sit', 'Bir bacak uzatılmış, diğeri tuck pozisyonunda tut.', 4, 2),
((select id from movement_groups where slug='l-sit'), 'Tam L-Sit', 'Her iki bacak düz uzatılmış halde pozisyonu koru.', 6, 3),
((select id from movement_groups where slug='l-sit'), 'V-Sit', 'Bacaklar gövdeyle V şekli oluşturacak şekilde yukarı kaldırılır.', 8, 4);

-- MUSCLE UP
insert into public.movements (group_id, name, description, difficulty_level, order_index) values
((select id from movement_groups where slug='muscle-up'), 'Sıkı Pull-up', 'Tam açıklıkta, kontrollü barfiks çek.', 3, 1),
((select id from movement_groups where slug='muscle-up'), 'Göğüse Çekiş (High Pull-up)', 'Barı göğüs seviyesine kadar çekerek geçiş gücünü hazırla.', 5, 2),
((select id from movement_groups where slug='muscle-up'), 'Sıçramalı Muscle Up', 'Bacak sıçraması yardımıyla muscle up geçişini dene.', 6, 3),
((select id from movement_groups where slug='muscle-up'), 'Sıkı Muscle Up', 'Hiçbir sıçrama olmadan tam kontrollü muscle up.', 8, 4);

-- BACK LEVER
insert into public.movements (group_id, name, description, difficulty_level, order_index) values
((select id from movement_groups where slug='back-lever'), 'Tuck Back Lever', 'Dizler göğse çekili halde ters pozisyonda asılı kal.', 4, 1),
((select id from movement_groups where slug='back-lever'), 'İleri Tuck Back Lever', 'Kalçalar daha açık, tuck pozisyonu genişletilmiş halde tut.', 5, 2),
((select id from movement_groups where slug='back-lever'), 'Tek Bacak Back Lever', 'Bir bacak uzatılmış, diğeri tuck pozisyonunda tut.', 6, 3),
((select id from movement_groups where slug='back-lever'), 'Straddle Back Lever', 'Bacaklar açık şekilde uzatılmış halde pozisyonu koru.', 7, 4),
((select id from movement_groups where slug='back-lever'), 'Tam Back Lever', 'Bacaklar bitişik ve tam uzatılmış halde pozisyonu koru.', 8, 5);

-- FRONT LEVER
insert into public.movements (group_id, name, description, difficulty_level, order_index) values
((select id from movement_groups where slug='front-lever'), 'Tuck Front Lever', 'Dizler göğse çekili halde yatay pozisyonda asılı kal.', 4, 1),
((select id from movement_groups where slug='front-lever'), 'İleri Tuck Front Lever', 'Kalçalar daha açık, tuck pozisyonu genişletilmiş halde tut.', 5, 2),
((select id from movement_groups where slug='front-lever'), 'Tek Bacak Front Lever', 'Bir bacak uzatılmış, diğeri tuck pozisyonunda tut.', 6, 3),
((select id from movement_groups where slug='front-lever'), 'Straddle Front Lever', 'Bacaklar açık şekilde uzatılmış halde pozisyonu koru.', 7, 4),
((select id from movement_groups where slug='front-lever'), 'Tam Front Lever', 'Bacaklar bitişik ve tam uzatılmış halde pozisyonu koru.', 9, 5);

-- PLANCHE
insert into public.movements (group_id, name, description, difficulty_level, order_index) values
((select id from movement_groups where slug='planche'), 'Planche Lean', 'Eller kalça hizasında, öne doğru ağırlık aktararak omuz açısını hazırla.', 2, 1),
((select id from movement_groups where slug='planche'), 'Tuck Planche', 'Dizler göğse çekili halde yerden tamamen kalkarak dengeyi bul.', 4, 2),
((select id from movement_groups where slug='planche'), 'İleri Tuck Planche (Advanced Tuck)', 'Kalçalar daha açık, ağırlık merkezi öne kaymış halde tuck pozisyonunu genişlet.', 5, 3),
((select id from movement_groups where slug='planche'), 'Tek Bacak Planche (Half-Lay)', 'Bir bacak uzatılmış, diğeri tuck pozisyonunda tutularak straddle geçişine hazırlan.', 6, 4),
((select id from movement_groups where slug='planche'), 'Straddle Planche', 'Bacaklar açık şekilde uzatılmış halde pozisyonu koru.', 8, 5),
((select id from movement_groups where slug='planche'), 'Tam Planche (Full Planche)', 'Bacaklar bitişik ve tam uzatılmış halde pozisyonu koru — calisthenics''in en üst seviye hareketlerinden biri.', 10, 6);
