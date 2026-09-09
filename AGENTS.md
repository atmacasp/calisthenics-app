# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Her değişiklikten sonra

Kod değişikliği biter bitmez, cihazda test etmeden ÖNCE şu ikisi çalıştırılır:

    npm run typecheck    -> tsc --noEmit; tip hatasıyla cihaza gitme
    npm test             -> ilerleme motorunun kuralları korunuyor mu

src/utils/ altındaki saf fonksiyonlar (hedef/kilit/terfi motoru) uygulamanın
kalbi; testleri src/utils/__tests__/ altında. Bu kurallardan birini bilerek
değiştiriyorsan testi de güncelle. Kazara bozuyorsan test seni durdurur.
