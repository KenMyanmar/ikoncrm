import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  staffId: string,
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  details?: Record<string, unknown>
) {
  await supabase.from("activity_log").insert({
    staff_id: staffId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? undefined,
    entity_name: entityName ?? undefined,
    details: (details || {}) as any,
  } as any);
}
