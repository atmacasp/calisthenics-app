/**
 * base64 metnini ham baytlara (ArrayBuffer) çevirir.
 *
 * Neden gerekiyor: React Native'de atob da Buffer da yok, ve fetch ile alınan
 * bir Blob'un içeriğine erişilemediği için Supabase Storage'a Blob göndermek
 * boş dosya üretiyor. Çalışan tek yol ham baytları ArrayBuffer olarak vermek.
 * ImagePicker fotoğrafı base64 olarak verebildiğinden eksik olan tek parça
 * bu çözücüydü; hazır paket eklemek yerine burada duruyor.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Karakter kodundan 6 bitlik değere tablo. indexOf ile arama her karakter için
// 64 adım demek; 2 MB'lık bir fotoğrafın base64'ünde bu fark hissedilir.
const LOOKUP = new Uint8Array(256).fill(255);
for (let i = 0; i < ALPHABET.length; i++) {
  LOOKUP[ALPHABET.charCodeAt(i)] = i;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // "data:image/jpeg;base64,...." önekini at. Önekin kendi harfleri de geçerli
  // base64 karakterleri olduğu için "geçersizi atla" mantığı bunu temizlemez.
  const marker = base64.indexOf("base64,");
  const body = marker === -1 ? base64 : base64.slice(marker + 7);

  // Dolgu (=) ve satır sonları sadece azaltır, bu yüzden bu boy her zaman yeter.
  const bytes = new Uint8Array(Math.floor((body.length * 3) / 4));

  let byteIndex = 0;
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i);
    const value = code < 256 ? LOOKUP[code] : 255;
    if (value === 255) continue; // '=', boşluk, satır sonu

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[byteIndex++] = (buffer >> bits) & 0xff;
    }
  }

  return bytes.buffer.slice(0, byteIndex);
}
