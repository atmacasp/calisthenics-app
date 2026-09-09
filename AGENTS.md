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
