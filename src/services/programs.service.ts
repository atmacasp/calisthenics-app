
import { supabase } from "../lib/supabase";
import type { ProgramRow, ProgramWithDays, TodayProgramPlan, UserProgramRow } from "../types/programs";

const DAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

/**
 * programs / program_movements / user_programs tablolarının servis katmanı.
 */
export const programsService = {
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
};
