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

# Şema tipleri (database.types.ts)

Bu dosya ELLE YAZILMAZ, şemadan üretilir:

    scripts/migrate.sh        önce migration'lar
    scripts/gen-types.sh      sonra tipler
    npm run typecheck

Sıra önemli: tipler veritabanındaki hâlden üretiliyor, migration uygulanmadan
çalıştırırsan eski şemanın tiplerini alırsın.

    scripts/gen-types.sh --check    dosya şemayla uyumlu mu (yazmaz)

Eskiden elle yazılıyordu ve sessiz ayrışma riski sürekli açıktı: 0017'de yeni
RPC Functions bloğuna eklenmediği için typecheck patlamıştı. Artık yeni tablo,
sütun ya da RPC eklediğinde tek yapman gereken script'i çalıştırmak.

Makinenin bilemeyeceği daraltmalar (ör. `remap_program_days`'in jsonb
argümanının aslında `Record<string, number>` olması) `scripts/gen-types.mjs`
içindeki OVERRIDES tablosunda duruyor - üretilen dosyayı elle düzeltme, oraya
bir satır ekle.

# Hazır program yazma

Hazır programlar `program_movements`'a hareket ADIYLA bağlanıyor
(`join movements m on m.name = '...'`). Ad bir harf yanlış yazılırsa o satır
SESSİZCE eklenmiyor - hata da vermiyor, program eksik kuruluyor. Bu yüzden:

    scripts/movements.sh              tüm hareketler, kategori ve ustalık hedefiyle
    scripts/movements.sh foundation   tek kategori
    scripts/movements.sh foundation --names
                                      doğrudan values listesine yapıştırılacak satırlar

Adları buradan kopyala, elle yazma. Yeni program yazarken
`scripts/program-template.sql` dosyasını `supabase/migrations/00NN_<ad>.sql`
olarak kopyala; içinde iki koruma var:

1. Insert'ten ÖNCE çalışan blok, listede geçip veritabanında olmayan adları
   tek tek isimlendirip transaction'ı patlatıyor.
2. Sonda satır sayısı doğrulaması: aynı adı taşıyan ikinci bir hareket
   eklenirse satırlar ikiye katlanırdı, sayı tutmazsa her şey geri alınıyor.

Şablon migrations/ altında DEĞİL çünkü migrate.sh oradaki her `.sql` dosyasını
gerçek bir migration sanıp çalıştırır.

`program_movements.target_*` alanları programın KENDİ hacim reçetesidir,
hareketin ustalık hedefinden bağımsızdır: ustalık hedefi bir sonraki basamağın
kilidini açar, program hedefi o gün ne yapılacağını söyler.

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
