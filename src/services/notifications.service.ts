import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import { programsService } from "./programs.service";

const CHANNEL_ID = "workout-reminders";
const DAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const DAY_SHORT = ["", "Pzt", "Sal", "Çrş", "Prş", "Cum", "Cmt", "Paz"];

/**
 * Android + Expo Go'da expo-notifications'ı IMPORT ETMEK bile uygulamayı
 * düşürüyor: modül yüklenirken push token otomatik kaydı çalışıyor ve
 * "removed from Expo Go with the release of SDK 53" hatasını fırlatıyor.
 * (Expo bunu main dalında düzeltti ama henüz yayınlanmadı.)
 *
 * Bu yüzden modül statik değil, tembel yükleniyor: Expo Go/Android'de hiç
 * require edilmiyor. Development build'de her şey normal çalışır.
 */
const NOTIFICATIONS_BLOCKED = isRunningInExpoGo() && Platform.OS === "android";

type NotificationsModule = typeof import("expo-notifications");
let cachedModule: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (NOTIFICATIONS_BLOCKED) return null;
  if (!cachedModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require("expo-notifications") as NotificationsModule;
  }
  return cachedModule;
}

/** Bu ortamda hatırlatıcı kurulabilir mi (Expo Go/Android'de kurulamaz). */
export const remindersSupported = !NOTIFICATIONS_BLOCKED;

/**
 * Şemamızda gün 1=Pazartesi..7=Pazar; Expo'nun haftalık tetikleyicisinde
 * 1=Pazar..7=Cumartesi. Dönüşüm tek yerde kalsın diye burada.
 */
function toExpoWeekday(schemaDay: number) {
  return schemaDay === 7 ? 1 : schemaDay + 1;
}

export interface ReminderSyncResult {
  scheduled: number;
  /** Haftalık hatırlatıcı kurulan günler (şema numarasıyla). Boşsa günlük hatırlatıcı kuruldu. */
  days: number[];
  permissionDenied?: boolean;
  unsupported?: boolean;
}

/** Kurulan hatırlatıcıları kullanıcıya bir cümleyle anlatır. */
export function describeReminders(result: ReminderSyncResult, hour: number): string {
  if (result.unsupported) {
    return "Expo Go'da hatırlatıcı kurulamıyor. Development build'de otomatik olarak çalışacak.";
  }
  if (result.permissionDenied) return "Bildirim izni verilmedi.";
  if (result.scheduled === 0) return "Hatırlatıcı kurulu değil.";
  const time = `${String(hour).padStart(2, "0")}:00`;
  if (result.days.length === 0) return `Her gün ${time}'da hatırlatılacak.`;
  return `${result.days.map((d) => DAY_SHORT[d]).join(", ")} günleri ${time}'da hatırlatılacak.`;
}

export const notificationsService = {
  /** Uygulama açıkken de bildirim görünsün. Modül yüklenemiyorsa sessizce geçer. */
  configureHandler() {
    const N = getNotifications();
    if (!N) return;
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  },

  /** İzni sorgular; requestIfNeeded true ise ve izin yoksa kullanıcıya sorar. */
  async checkPermission(requestIfNeeded: boolean): Promise<boolean> {
    const N = getNotifications();
    if (!N) return false;
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!requestIfNeeded) return false;
    if (current.canAskAgain === false) return false;
    const asked = await N.requestPermissionsAsync();
    return asked.granted;
  },

  async ensureChannel() {
    const N = getNotifications();
    if (!N || Platform.OS !== "android") return;
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Antrenman hatırlatıcıları",
      importance: N.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  },

  async cancelAll() {
    const N = getNotifications();
    if (!N) return;
    await N.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Hatırlatıcıların tek doğruluk kaynağı: her çağrıda mevcut tümü silinip
   * güncel duruma göre yeniden kurulur. Böylece program değişince, gün
   * eklenince ya da saat değişince artık geçerli olmayan bildirim kalmaz.
   *
   * requestPermission yalnızca kullanıcı hatırlatıcıyı KENDİ açtığında true
   * olmalı - açılışta sessizce senkronize ederken izin penceresi açmayız.
   *
   * Aktif program varsa her antrenman gününe haftalık, yoksa her güne günlük
   * bir hatırlatıcı kurulur.
   */
  async syncReminders(
    userId: string,
    options: { enabled: boolean; hour: number; requestPermission?: boolean }
  ): Promise<ReminderSyncResult> {
    const N = getNotifications();
    if (!N) return { scheduled: 0, days: [], unsupported: true };

    await notificationsService.cancelAll();
    if (!options.enabled) return { scheduled: 0, days: [] };

    const granted = await notificationsService.checkPermission(options.requestPermission ?? false);
    if (!granted) return { scheduled: 0, days: [], permissionDenied: true };
    await notificationsService.ensureChannel();

    const active = await programsService.getActiveUserProgram(userId);
    const program = active?.program_id ? await programsService.getProgramWithDays(active.program_id) : null;

    const trainingDays = program
      ? Object.entries(program.daysMap)
          .filter(([, movements]) => movements.length > 0)
          .map(([day]) => Number(day))
          .filter((day) => day >= 1 && day <= 7)
          .sort((a, b) => a - b)
      : [];

    if (!program || trainingDays.length === 0) {
      await N.scheduleNotificationAsync({
        content: {
          title: "Antrenman zamanı",
          body: "Seriyi bugün de sürdürelim mi?",
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DAILY,
          hour: options.hour,
          minute: 0,
          channelId: CHANNEL_ID,
        },
      });
      return { scheduled: 1, days: [] };
    }

    for (const day of trainingDays) {
      const count = program.daysMap[day].length;
      await N.scheduleNotificationAsync({
        content: {
          title: `${program.name} · ${DAY_NAMES[day]}`,
          body: `Bugün ${count} hareket planlı. Hazır mısın?`,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(day),
          hour: options.hour,
          minute: 0,
          channelId: CHANNEL_ID,
        },
      });
    }

    return { scheduled: trainingDays.length, days: trainingDays };
  },
};
