import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";

export type ServerMapping = {
  id: string;
  business_type_id: string;
  category_id: string;
  sort_order: number;
  is_active: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
    depth: number | null;
    parent_id: string | null;
    parent: { id: string; name: string; slug: string } | null;
  } | null;
};

/** Working-set row used by the curator UI. `_deleted` is a local flag, never sent to DB. */
export type WorkingMapping = {
  id?: string;
  business_type_id: string;
  category_id: string;
  sort_order: number;
  is_active: boolean;
  _deleted: boolean;
  // denormalized for UI rendering only
  _category_name: string;
  _parent_name: string | null;
  _category_depth: number;
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  subs: { id: string; name: string; slug: string }[];
};

export function useBusinessTypeMappings(businessTypeId: string | undefined) {
  const { staff } = useStaff();
  return useQuery({
    queryKey: ["business-type-subcategories", businessTypeId],
    enabled: !!staff && !!businessTypeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_type_subcategories")
        .select(
          `id, business_type_id, category_id, sort_order, is_active,
           category:categories(id, name, slug, depth, parent_id,
             parent:categories!parent_id(id, name, slug))`
        )
        .eq("business_type_id", businessTypeId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ServerMapping[];
    },
  });
}

/**
 * Fetches the available category tree for the curator's left pane.
 * Filters `is_active = true` on BOTH main categories and their sub-categories
 * (Migration 15's delete protection makes "inactive main with active subs" rare,
 * but we still don't want a stale heading rendered above zero chips).
 */
export function useAvailableSubcategories() {
  const { staff } = useStaff();
  return useQuery({
    queryKey: ["curator-available-categories"],
    enabled: !!staff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, depth, parent_id, is_active")
        .eq("is_active", true)
        .in("depth", [0, 1])
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      const mains = rows.filter((r: any) => r.depth === 0);
      const subs = rows.filter((r: any) => r.depth === 1);
      const tree: CategoryNode[] = mains.map((m: any) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        subs: subs
          .filter((s: any) => s.parent_id === m.id)
          .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug })),
      }));
      return tree;
    },
  });
}

export function useSaveMappings(businessTypeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (working: WorkingMapping[]) => {
      if (!businessTypeId) throw new Error("Missing business type id");

      // 1. Delete first to free up (business_type_id, category_id) unique constraint
      const toDeleteIds = working
        .filter((m) => m._deleted && m.id)
        .map((m) => m.id!) as string[];
      if (toDeleteIds.length > 0) {
        const { error } = await supabase
          .from("business_type_subcategories")
          .delete()
          .in("id", toDeleteIds);
        if (error) throw error;
      }

      // 2. Upsert everything still alive
      const toUpsert = working
        .filter((m) => !m._deleted)
        .map((m) => ({
          ...(m.id ? { id: m.id } : {}),
          business_type_id: businessTypeId,
          category_id: m.category_id,
          sort_order: m.sort_order,
          is_active: m.is_active,
        }));
      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from("business_type_subcategories")
          .upsert(toUpsert, { onConflict: "id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-type-subcategories", businessTypeId] });
      queryClient.invalidateQueries({ queryKey: ["business-type-landing"] });
    },
  });
}