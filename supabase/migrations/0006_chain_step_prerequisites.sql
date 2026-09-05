
-- Şu ana kadar sadece her zincirin İLK basamağı Temel Güç hareketlerine bağlıydı.
-- Bu migration, aynı kilit/kilit-açma mekanizmasını (movement_prerequisites +
-- areAllPrerequisitesMet/isTargetMet) zincir İÇİNDEKİ basamaklara da uygular:
-- her basamak (order_index = N), kendi kategorisindeki bir önceki basamağın
-- (order_index = N-1) HEDEFİNE bağlanır. target_sets/reps/duration_seconds
-- kolonları bilinçli olarak NULL bırakılıyor; getPrerequisiteTarget() override
-- yoksa otomatik olarak önceki basamağın kendi target_* alanlarına düşüyor,
-- böylece hedefler tek yerde (movements tablosunda) tanımlı kalıyor.
--
-- Foundation kategorisi (temel hareketler) bu zincir mantığının dışında tutuluyor;
-- onlar zaten ilk basamaklara doğrudan ön koşul olarak bağlı, kendi aralarında
-- sıralı bir kilit ilişkisi yok.
insert into public.movement_prerequisites (movement_id, prerequisite_movement_id, order_index)
select
  cur.id,
  prev.id,
  -- Bu basamağın zaten var olan ön koşulları varsa (ör. zincirin ilk basamağı),
  -- yeni satırı onların sonuna ekle; yoksa 1'den başlat.
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
  and prev.movement_type = 'progression';
