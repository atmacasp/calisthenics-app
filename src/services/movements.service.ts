
import { supabase } from "../lib/supabase";
import type {
  MovementGroupRow,
  MovementListItem,
  MovementWithGroupAndPrerequisites,
  MovementWithPrerequisites,
} from "../types/movements";

// movement_prerequisites tablosunda movements'a iki farklı FK var (movement_id ve
// prerequisite_movement_id), bu yüzden embed her yerde constraint adıyla netleştiriliyor.
const PREREQUISITE_SELECT = `
  target_sets,
  target_reps,
  target_duration_seconds,
  order_index,
  prerequisite_movement:movements!movement_prerequisites_prerequisite_movement_id_fkey(
    id, name, movement_type, target_type, target_sets, target_reps, target_duration_seconds
  )
`;

export const movementsService = {
  async getGroups(): Promise<MovementGroupRow[]> {
    const { data, error } = await supabase.from("movement_groups").select("*").order("order_index");
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Bir kategorideki progression zincirini döner. Artık her basamağın kendi
   * prerequisites'i de embed ediliyor, böylece zincir ekranı hangi basamağın
   * kilitli olduğunu gösterebiliyor.
   */
  async getMovementsByGroup(groupId: string): Promise<MovementListItem[]> {
    const { data, error } = await supabase
      .from("movements")
      .select(
        `
        *,
        prerequisites:movement_prerequisites!movement_prerequisites_movement_id_fkey(${PREREQUISITE_SELECT})
      `
      )
      .eq("group_id", groupId)
      .order("order_index")
      .order("order_index", { referencedTable: "movement_prerequisites", ascending: true });
    if (error) throw error;
    // Supabase-js'in iç içe FK-disambiguated embed'ler için ürettiği tip, elle yazdığımız
    // domain tipiyle birebir eşleşmiyor; sınırı burada tek noktadan geçiyoruz.
    return (data ?? []) as unknown as MovementListItem[];
  },

  async getMovementById(id: string): Promise<MovementWithPrerequisites | null> {
    const { data, error } = await supabase
      .from("movements")
      .select(
        `
        *,
        movement_groups(name),
        prerequisites:movement_prerequisites!movement_prerequisites_movement_id_fkey(${PREREQUISITE_SELECT})
      `
      )
      .eq("id", id)
      .order("order_index", { referencedTable: "movement_prerequisites", ascending: true })
      .single();
    if (error) throw error;
    return data as unknown as MovementWithPrerequisites;
  },

  /**
   * Hareket Seç ekranındaki kilit kontrolü ve "Bugün Sırada" öneri motoru için
   * TEK sorguda tüm hareketleri, kategorileriyle ve prerequisites'leriyle birlikte
   * döner (kategori order_index -> basamak order_index sırasıyla). 7 kategori için
   * ayrı ayrı getMovementsByGroup çağırmak yerine tek istek atılır.
   */
  async getAllMovementsWithPrerequisites(): Promise<MovementWithGroupAndPrerequisites[]> {
    const { data, error } = await supabase
      .from("movements")
      .select(
        `
        *,
        movement_groups(name, order_index),
        prerequisites:movement_prerequisites!movement_prerequisites_movement_id_fkey(${PREREQUISITE_SELECT})
      `
      )
      .order("order_index", { referencedTable: "movement_groups", ascending: true })
      .order("order_index", { ascending: true })
      .order("order_index", { referencedTable: "movement_prerequisites", ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as MovementWithGroupAndPrerequisites[];
  },
};
