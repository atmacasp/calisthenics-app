import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { base64ToArrayBuffer } from "../utils/base64";
import { profileService } from "./profile.service";

export const AVATAR_BUCKET = "avatars";

/** Bucket'ta tanımlı sınırla aynı (migration 0014). Sunucuya boşuna gidip 413 yemeyelim. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Her kullanıcının tek bir avatar dosyası var: "<user_id>/avatar.<uzantı>".
 * Uzantı kaynağa göre değişebildiği için yükledikten sonra diğer uzantılardaki
 * eski dosya siliniyor - yoksa png'den jpg'ye geçen kullanıcının diskinde iki
 * dosya kalırdı.
 */
const EXTENSIONS = ["jpg", "png", "webp"] as const;

type Extension = (typeof EXTENSIONS)[number];

const MIME_BY_EXTENSION: Record<Extension, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type PickedAvatar = {
  bytes: ArrayBuffer;
  contentType: string;
  extension: Extension;
};

function resolveExtension(mimeType: string | undefined): Extension {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function avatarPath(userId: string, extension: Extension) {
  return `${userId}/avatar.${extension}`;
}

export const avatarService = {
  /**
   * Galeriden kare kırpılmış bir fotoğraf seçtirir ve baytlarını döner.
   * Kullanıcı vazgeçerse null.
   */
  async pickFromLibrary(): Promise<PickedAvatar | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Fotoğraflara erişim izni verilmedi. Telefon ayarlarından izin verebilirsin.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    if (!asset?.base64) {
      throw new Error("Fotoğraf okunamadı, başka bir görsel dener misin?");
    }

    const extension = resolveExtension(asset.mimeType);
    const bytes = base64ToArrayBuffer(asset.base64);

    if (bytes.byteLength > MAX_BYTES) {
      throw new Error("Fotoğraf 2 MB sınırını aşıyor. Daha küçük bir görsel seç.");
    }

    return { bytes, contentType: MIME_BY_EXTENSION[extension], extension };
  },

  /** Storage'a yükler, profiles.avatar_url'i günceller ve yeni URL'i döner. */
  async upload(userId: string, picked: PickedAvatar): Promise<string> {
    const path = avatarPath(userId, picked.extension);

    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, picked.bytes, {
      contentType: picked.contentType,
      upsert: true,
    });
    if (error) throw error;

    const stale = EXTENSIONS.filter((ext) => ext !== picked.extension).map((ext) => avatarPath(userId, ext));
    await supabase.storage.from(AVATAR_BUCKET).remove(stale);

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

    // Dosya yolu sabit olduğu için CDN ve cihazdaki resim önbelleği eski
    // görseli döndürür. Sürüm damgası URL'i değiştirip bunu kırıyor.
    const url = `${data.publicUrl}?v=${Date.now()}`;
    await profileService.updateProfile(userId, { avatar_url: url });
    return url;
  },

  /** Fotoğrafı hem diskten hem profilden kaldırır. */
  async remove(userId: string): Promise<void> {
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove(EXTENSIONS.map((ext) => avatarPath(userId, ext)));
    if (error) throw error;

    await profileService.updateProfile(userId, { avatar_url: null });
  },
};
