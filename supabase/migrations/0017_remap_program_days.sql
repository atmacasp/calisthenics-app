-- 0017: Program günlerini toplu kaydırma
--
-- Kullanıcı bir hazır programı kopyaladığında çoğu zaman şablona dokunmak
-- istemiyor, sadece hangi günlere denk geleceğini değiştirmek istiyor
-- (Pzt/Çrş/Cuma -> Sal/Per/Cmt gibi). Bunu istemciden gün gün UPDATE ile
-- yapmak iki sebeple yanlış:
--
--   1) Zincirleme kayma: önce "gün 1 olanları 3 yap", sonra "gün 3 olanları
--      5 yap" çalıştırılırsa, ilk adımda 3'e taşınan satırlar ikinci adımda
--      tekrar taşınır. Tek bir UPDATE ise satırların ESKİ değerini görür.
--   2) Atomiklik: PostgREST üzerinden birden fazla update tek transaction
--      olmuyor; ortada bir hata olursa program yarı taşınmış kalır.
--
-- security invoker (varsayılan) bilerek korunuyor: fonksiyon çağıranın
-- yetkisiyle çalışır, dolayısıyla program_movements_write_own politikası aynen
-- geçerli - kullanıcı yalnızca kendi programını kaydırabilir. Başkasının ya da
-- hazır bir programda çağrılırsa hata değil 0 satır döner, istemci bunu
-- "düzenlenemiyor" mesajına çeviriyor.
--
-- p_map: {"1": 2, "3": 4, "5": 6} - anahtar eski gün, değer yeni gün.
-- Haritada olmayan günlere dokunulmaz. Geçersiz gün değerlerini
-- program_movements.day_of_week üzerindeki check kısıtı zaten reddeder.

create or replace function public.remap_program_days(p_program_id uuid, p_map jsonb)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count int;
begin
  update public.program_movements pm
  set day_of_week = (p_map ->> pm.day_of_week::text)::int
  where pm.program_id = p_program_id
    and p_map ? pm.day_of_week::text;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.remap_program_days(uuid, jsonb) from public;
revoke all on function public.remap_program_days(uuid, jsonb) from anon;
grant execute on function public.remap_program_days(uuid, jsonb) to authenticated;
