import { supabase } from "../lib/supabase";
import { toLocalDateKey, todayLocalKey } from "../utils/date";
import type { DayRemap } from "../utils/programDays";
import type {
  ProgramAdherence,
  ProgramDraft,
  ProgramRow,
  ProgramWithDays,
  TodayProgramPlan,
  UserProgramRow,
} from "../types/programs";

const DAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const DAY_MS = 86400000;

/** Verilen tarihin içinde bulunduğu haftanın Pazartesi 00:00'ı */
function startOfWeek(date: Date): Date {
  const jsDay = date.getDay();
  const offset = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - offset);
  return monday;
}

/**
 * programs / program_movements / user_programs tablolarının servis katmanı.
 *
 * programs.user_id null ise "hazır" (sistem) programdır ve herkese görünür;
 * dolu ise o kullanıcının kendi yazdığı programdır. RLS ikisini de kapsıyor,
 * bu yüzden listPrograms hepsini tek sorguda döner, ayrıştırma UI tarafında.
 */
export const programsService = {
  /** Kullanıcının görebildiği tüm programlar (hazır olanlar + kendininkiler) */
  async listPrograms(): Promise<ProgramRow[]> {
    const { data, error } = await supabase.from("programs").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Bir programın tüm hareketlerini day_of_week'e göre gruplanmış döner
   * (1=Pazartesi ... 7=Pazar), her günün içinde order_index sırasıyla.
   */
  async getProgramWithDays(programId: string): Promise<ProgramWithDays | null> {
    const { data: program, error: programError } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .single();
    if (programError) throw programError;
    if (!program) return null;

    const { data: rows, error: rowsError } = await supabase
      .from("program_movements")
      .select(
        "id, movement_id, day_of_week, target_sets, target_reps, target_duration_seconds, rest_seconds, order_index, movements(name)"
      )
      .eq("program_id", programId)
      .order("day_of_week", { ascending: true })
      .order("order_index", { ascending: true });
    if (rowsError) throw rowsError;

    const daysMap: ProgramWithDays["daysMap"] = {};
    (rows ?? []).forEach((row: any) => {
      const day = row.day_of_week ?? 0;
      if (!daysMap[day]) daysMap[day] = [];
      daysMap[day].push({
        id: row.id,
        movementId: row.movement_id,
        movementName: row.movements?.name ?? "Bilinmeyen hareket",
        targetSets: row.target_sets,
        targetReps: row.target_reps,
        targetDurationSeconds: row.target_duration_seconds,
        restSeconds: row.rest_seconds,
        orderIndex: row.order_index,
      });
    });

    return { ...program, daysMap };
  },

  async getActiveUserProgram(userId: string): Promise<UserProgramRow | null> {
    const { data, error } = await supabase
      .from("user_programs")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Kullanıcıyı bir programa başlatır. Aynı anda tek aktif program olması
   * için önce varsa mevcut aktif programı pasifleştirir.
   */
  async startProgram(userId: string, programId: string): Promise<UserProgramRow> {
    await supabase.from("user_programs").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    const { data, error } = await supabase
      .from("user_programs")
      .insert({ user_id: userId, program_id: programId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async stopProgram(userProgramId: string): Promise<void> {
    const { error } = await supabase.from("user_programs").update({ is_active: false }).eq("id", userProgramId);
    if (error) throw error;
  },

  /**
   * Kullanıcının kendi programını oluşturur (programId yoksa) ya da günceller.
   * Güncellemede program_movements satırları tamamen silinip yeniden yazılır -
   * satır satır diff almaktan çok daha basit ve gün/sıra değişimlerinde daha
   * güvenilir; program_id'ye bağlı geçmiş antrenmanlar bundan etkilenmez.
   */
  async saveProgram(userId: string, draft: ProgramDraft, programId?: string | null): Promise<ProgramRow> {
    const payload = {
      name: draft.name,
      description: draft.description,
      level: draft.level,
    };

    let id = programId ?? null;

    if (id) {
      const { error } = await supabase.from("programs").update(payload).eq("id", id).eq("user_id", userId);
      if (error) throw error;
      const { error: clearError } = await supabase.from("program_movements").delete().eq("program_id", id);
      if (clearError) throw clearError;
    } else {
      const { data, error } = await supabase
        .from("programs")
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      id = data.id;
    }

    const rows: any[] = [];
    Object.entries(draft.days).forEach(([day, movements]) => {
      movements.forEach((movement, index) => {
        rows.push({
          program_id: id,
          movement_id: movement.movementId,
          day_of_week: Number(day),
          target_sets: movement.targetSets,
          target_reps: movement.targetReps,
          target_duration_seconds: movement.targetDurationSeconds,
          rest_seconds: movement.restSeconds,
          order_index: index,
        });
      });
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("program_movements").insert(rows);
      if (error) throw error;
    }

    const { data: saved, error: savedError } = await supabase.from("programs").select("*").eq("id", id).single();
    if (savedError) throw savedError;
    return saved;
  },

  /**
   * Kullanıcının kendi programını siler. program_movements ve user_programs
   * satırları FK cascade ile, geçmiş antrenmanların program bağı ise
   * on delete set null ile temizlenir (antrenman kayıtları korunur).
   */
  async deleteProgram(programId: string, userId: string): Promise<void> {
    const { error } = await supabase.from("programs").delete().eq("id", programId).eq("user_id", userId);
    if (error) throw error;
  },

  /**
   * Aktif takip edilen programın BUGÜNKÜ gününü döner - "bugün ne yapmalıyım"
   * sorusunun cevabı. JS'in Date.getDay()'i (0=Pazar..6=Cumartesi) döner,
   * bunu şemamızın 1=Pazartesi..7=Pazar sistemine çeviriyoruz. Bugün için
   * planlanmış hareket yoksa (movements boş) o gün dinlenme günüdür.
   */
  async getActiveProgramForToday(userId: string): Promise<TodayProgramPlan | null> {
    const active = await programsService.getActiveUserProgram(userId);
    if (!active || !active.program_id) return null;

    const program = await programsService.getProgramWithDays(active.program_id);
    if (!program) return null;

    const jsDay = new Date().getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    return {
      program,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      movements: program.daysMap[dayOfWeek] ?? [],
    };
  },

  /**
   * Program bağlılığı - İlerleme ekranındaki "Program Bağlılığı" kartının verisi.
   *
   * Bu hafta: Pazartesi 00:00'dan beri bu programdan başlatılıp BİTİRİLMİŞ
   * (ended_at dolu) antrenman sayısı / programın haftalık antrenman günü sayısı.
   *
   * Genel uyum: programa başladığından (user_programs.started_at) bu yana geçen
   * hafta sayısı x haftalık antrenman günü = beklenen; tamamlanan / beklenen.
   * Yüzde 100'ün üstüne çıkabilir (program fazlası antrenman yapıldıysa), kartta
   * ilerleme çubuğu zaten 100'de kırpılıyor.
   *
   * Aktif takip edilen program yoksa null döner.
   */
  async getProgramAdherence(userId: string): Promise<ProgramAdherence | null> {
    const active = await programsService.getActiveUserProgram(userId);
    if (!active || !active.program_id) return null;

    const program = await programsService.getProgramWithDays(active.program_id);
    if (!program) return null;

    // Dinlenme günleri (hiç hareketi olmayan günler) haftalık hedefe sayılmaz.
    const trainingDaysPerWeek = Object.values(program.daysMap).filter((movements) => movements.length > 0).length;

    const startedAt = new Date(active.started_at);
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select("id, started_at, ended_at")
      .eq("user_id", userId)
      .eq("program_id", active.program_id)
      .not("ended_at", "is", null)
      .gte("started_at", startedAt.toISOString());
    if (error) throw error;

    const weekStart = startOfWeek(new Date()).getTime();
    const completed = sessions ?? [];
    const completedThisWeek = completed.filter((s: any) => new Date(s.started_at).getTime() >= weekStart).length;

    // Programa başlanan hafta da dahil, en az 1 hafta.
    const weeksElapsed = Math.max(1, Math.ceil((Date.now() - startedAt.getTime()) / (7 * DAY_MS)));
    const totalExpected = trainingDaysPerWeek * weeksElapsed;
    const adherencePercent = totalExpected > 0 ? Math.round((completed.length / totalExpected) * 100) : 0;

    return {
      programId: program.id,
      programName: program.name,
      trainingDaysPerWeek,
      completedThisWeek,
      totalCompleted: completed.length,
      totalExpected,
      adherencePercent,
    };
  },

  /**
   * Bir programı (hazır program dahil) kullanıcının kendi programı olarak
   * kopyalar. Hazır programlar RLS gereği düzenlenemez; kullanıcı bir hazır
   * programı kendine göre uyarlamak istediğinde önce bu kopyayı alır.
   * Kopya takip durumunu devralmaz - kullanıcı isterse kendisi başlatır.
   */
  async duplicateProgram(userId: string, programId: string): Promise<ProgramRow> {
    const source = await programsService.getProgramWithDays(programId);
    if (!source) throw new Error("Program bulunamadı");

    const days: ProgramDraft["days"] = {};
    Object.entries(source.daysMap).forEach(([day, list]) => {
      days[Number(day)] = list
        .filter((pm) => pm.movementId)
        .map((pm) => ({
          movementId: pm.movementId as string,
          targetSets: pm.targetSets,
          targetReps: pm.targetReps,
          targetDurationSeconds: pm.targetDurationSeconds,
          restSeconds: pm.restSeconds,
        }));
    });

    return programsService.saveProgram(userId, {
      name: `${source.name} (kopyam)`,
      description: source.description,
      level: source.level as ProgramDraft["level"],
      days,
    });
  },

  /**
   * Programın antrenman günlerini toplu olarak kaydırır (Pzt/Çrş/Cuma ->
   * Sal/Per/Cmt gibi). Hareketler, hedefler, sıra ve dinlenme süreleri aynen
   * kalır; yalnızca day_of_week değişir.
   *
   * İş tek bir SQL update'i olan remap_program_days RPC'sinde (migration 0017):
   * gün gün güncelleseydik "1'i 3 yap" sonra "3'ü 5 yap" adımları ilk adımda
   * taşınan satırları ikinci kez taşırdı, ayrıca PostgREST üzerinden birden
   * fazla update tek transaction olmadığı için yarım kalma riski vardı.
   *
   * RPC security invoker olduğundan RLS aynen geçerli: kendi programı değilse
   * hata değil 0 satır döner, onu açık bir mesaja çeviriyoruz.
   */
  async remapProgramDays(programId: string, remap: DayRemap): Promise<number> {
    const payload: Record<string, number> = {};
    Object.entries(remap).forEach(([from, to]) => {
      payload[String(from)] = to;
    });

    const { data, error } = await supabase.rpc("remap_program_days", {
      p_program_id: programId,
      p_map: payload,
    });
    if (error) throw error;

    const updated = typeof data === "number" ? data : 0;
    if (updated === 0) {
      throw new Error("Bu program düzenlenemiyor. Önce kendi kopyanı oluştur.");
    }
    return updated;
  },

  /**
   * Programdaki tek bir satırı bir üst basamağa taşır: hareketi değiştirir ve
   * hedefi yeni hareketin kendi hedefiyle günceller. rest_seconds, gün ve sıra
   * korunur - kullanıcının kurduğu düzen bozulmaz.
   *
   * RLS sadece kendi programlarında yazmaya izin verir; başkasının/hazır
   * programda güncelleme hata değil "0 satır" olarak döneceği için sonucu
   * kontrol edip açık bir mesajla hata fırlatıyoruz.
   */
  async upgradeProgramMovement(
    programMovementId: string,
    next: { id: string; target_sets: number | null; target_reps: number | null; target_duration_seconds: number | null }
  ): Promise<void> {
    const { data, error } = await supabase
      .from("program_movements")
      .update({
        movement_id: next.id,
        target_sets: next.target_sets,
        target_reps: next.target_reps,
        target_duration_seconds: next.target_duration_seconds,
      })
      .eq("id", programMovementId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Bu program düzenlenemiyor. Önce kendi kopyanı oluştur.");
    }
  },

  /**
   * Programın bir gününe yeni bir hareket ekler. Hedef, hareketin kendi
   * ustalık hedefinden alınır; sıra o günün sonuna verilir. RLS gereği sadece
   * kullanıcının kendi programında çalışır.
   */
  async addMovementToProgram(
    programId: string,
    dayOfWeek: number,
    movement: { id: string; target_sets: number | null; target_reps: number | null; target_duration_seconds: number | null },
    restSeconds = 60
  ): Promise<void> {
    const { data: last, error: readError } = await supabase
      .from("program_movements")
      .select("order_index")
      .eq("program_id", programId)
      .eq("day_of_week", dayOfWeek)
      .order("order_index", { ascending: false })
      .limit(1);
    if (readError) throw readError;

    const { data, error } = await supabase
      .from("program_movements")
      .insert({
        program_id: programId,
        movement_id: movement.id,
        day_of_week: dayOfWeek,
        target_sets: movement.target_sets,
        target_reps: movement.target_reps,
        target_duration_seconds: movement.target_duration_seconds,
        rest_seconds: restSeconds,
        order_index: (last?.[0]?.order_index ?? -1) + 1,
      })
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Bu program düzenlenemiyor. Önce kendi kopyanı oluştur.");
    }
  },

  /**
   * Bugün (YEREL takvim gününe göre) bu programdan tamamlanmış bir antrenman
   * var mı? "Bugünün antrenmanını bitirdin" durumunu göstermek için.
   *
   * Tarih karşılaştırması SQL'de değil burada yapılıyor: kullanıcı gece
   * 01:00'de antrenman yaptığında UTC'ye göre "dün" görünür, bu yüzden
   * uygulamanın her yerinde olduğu gibi toLocalDateKey kullanılıyor.
   * Son 5 bitmiş oturuma bakmak yeterli - bugünkü mutlaka aralarındadır.
   */
  async getTodayCompletedSession(
    userId: string,
    programId: string
  ): Promise<{ id: string; startedAt: string } | null> {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, started_at")
      .eq("user_id", userId)
      .eq("program_id", programId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(5);
    if (error) throw error;

    const today = todayLocalKey();
    const match = (data ?? []).find((s) => toLocalDateKey(s.started_at) === today);
    return match ? { id: match.id, startedAt: match.started_at } : null;
  },

  /**
   * Bu hafta (Pazartesi 00:00'dan itibaren, YEREL saate gore) bu programdan
   * tamamlanan antrenmanlarin hangi program gunune denk geldigini doner:
   * { 1: sessionId, 3: sessionId } gibi. Program detayinda "bu gunu bitirdin"
   * isaretini basmak icin. Ayni gunde birden fazla antrenman varsa ilki alinir.
   */
  async getWeekCompletionsForProgram(userId: string, programId: string): Promise<Record<number, string>> {
    const monday = startOfWeek(new Date());
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, started_at")
      .eq("user_id", userId)
      .eq("program_id", programId)
      .not("ended_at", "is", null)
      .gte("started_at", monday.toISOString())
      .order("started_at", { ascending: true });
    if (error) throw error;

    const result: Record<number, string> = {};
    (data ?? []).forEach((s) => {
      // Yerel gun anahtarindan haftanin gunu: gece yapilan antrenman UTC'ye
      // gore bir onceki gune kaymasin diye tarih hep yerel okunuyor.
      const local = new Date(`${toLocalDateKey(s.started_at)}T00:00:00`);
      const jsDay = local.getDay();
      const dayOfWeek = jsDay === 0 ? 7 : jsDay;
      if (!result[dayOfWeek]) result[dayOfWeek] = s.id;
    });
    return result;
  },

};
