# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Her değişiklikten sonra

Kod değişikliği biter bitmez, cihazda test etmeden ÖNCE şu ikisi çalıştırılır:

    npm run typecheck    -> tsc --noEmit; tip hatasıyla cihaza gitme
    npm test             -> ilerleme motorunun kuralları korunuyor mu

src/utils/ altındaki saf fonksiyonlar (hedef/kilit/terfi motoru) uygulamanın
kalbi; testleri src/utils/__tests__/ altında. Bu kurallardan birini bilerek
değiştiriyorsan testi de güncelle. Kazara bozuyorsan test seni durdurur.

# Migration'lar

Supabase CLI Termux'ta çalışmıyor. Migration'lar SQL Editor'e elle
yapıştırılmaz - `scripts/migrate.sh` ile uygulanır:

    scripts/migrate.sh --status    -> hangisi uygulanmış, hangisi bekliyor
    scripts/migrate.sh             -> bekleyenleri sırayla uygular

Script her dosyayı tek transaction'da çalıştırıp migrations.applied tablosuna
yazar. Bu yüzden migration DOSYALARINA begin/commit YAZILMAZ; transaction'ı
script yönetir. (Elle yapıştırırken sondaki commit unutulunca her şey sessizce
geri alınıyordu - 0015'te bu oldu.)

SUPABASE_DB_URL, Dashboard > Connect > Session pooler URI'sidir ve repo dışında
~/.config/calisthenics/db.env içinde durur.

Yeni bir RPC (SQL fonksiyonu) eklendiğinde src/types/database.types.ts'teki
Functions bloğuna da yazılmalı - supabase istemcisi Database tipiyle kurulu
olduğu için fonksiyon adları tipli; eksikse supabase.rpc(...) typecheck'te patlar.

# Görseller (kategori ve hareket fotoğrafları)

Fotoğraflar Supabase Storage'daki public bucket'ta, tek klasörde durur:

    <kategori-slug>.jpg              -> movement_groups.image_url (kütüphane kartı)
    <kategori-slug>-<order_index>.jpg -> movements.image_url (progression basamağı)

Kompozisyon 2:1 yatay ve sporcu SAĞ tarafta olmalı: kartta görselin sol yarısı
zemine eriyen bir geçişin altında kalıyor, ortaya konan özne yarısı kesik
görünüyor.

Bir kategorinin hareket görselleri yüklendikten sonra tek komutla bağlanır
(base URL elle yazılmaz, mevcut bir kategori görselinden türetilir; sondaki
?v=<epoch> CDN önbelleğini kırar):

    psql "$SUPABASE_DB_URL" -c "
    with base as (
      select regexp_replace(split_part(image_url, '?', 1), '[^/]+$', '') as prefix
      from movement_groups where image_url is not null limit 1
    )
    update movements m
    set image_url = base.prefix || g.slug || '-' || m.order_index || '.jpg?v=' || extract(epoch from now())::bigint
    from movement_groups g, base
    where m.group_id = g.id and g.slug = 'foundation';"

Eksik dosya sorun değil: 404 dönen görselde kart kategorinin renk/ikon
zeminine düşüyor (GroupCard/StepCard onError ile yakalıyor).
