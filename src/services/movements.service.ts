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
      .select("*, movement_groups(name)")
      .eq("id", id)
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
