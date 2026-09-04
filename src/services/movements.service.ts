import { supabase } from "../lib/supabase";

export const movementsService = {
  async getGroups() {
    const { data, error } = await supabase
      .from("movement_groups")
      .select("*")
      .order("order_index");
    if (error) throw error;
    return data;
  },
  async getMovementsByGroup(groupId: string) {
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .eq("group_id", groupId)
      .order("order_index");
    if (error) throw error;
    return data;
  },
  async getMovementById(id: string) {
    const { data, error } = await supabase
      .from("movements")
      .select(`
        *,
        movement_groups(name),
        prerequisites:movement_prerequisites!movement_prerequisites_movement_id_fkey(
          target_sets,
          target_reps,
          target_duration_seconds,
          order_index,
          prerequisite_movement:movements!movement_prerequisites_prerequisite_movement_id_fkey(id, name, movement_type, target_type, target_sets, target_reps, target_duration_seconds)
        )
      `)
      .eq("id", id)
      .order("order_index", { referencedTable: "movement_prerequisites", ascending: true })
      .single();
    if (error) throw error;
    return data;
  },
  async getAllMovementsFlat() {
    const { data, error } = await supabase
      .from("movements")
      .select("id, name, group_id, movement_groups(name, order_index)")
      .order("group_id");
    if (error) throw error;
    return data;
  },
};
