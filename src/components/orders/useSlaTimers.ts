import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SlaEntry {
  id: string;
  orderId: string;
  queue: string;
  targetAt: string;
  warningAt: string | null;
  enteredAt: string;
  isBreached: boolean;
}

export function useSlaTimers(orderIds: string[]) {
  const [slaMap, setSlaMap] = useState<Record<string, SlaEntry>>({});
  const [tick, setTick] = useState(0);

  const fetchSla = useCallback(async () => {
    if (!orderIds.length) {
      setSlaMap({});
      return;
    }
    const { data } = await (supabase as any)
      .from("sla_tracking")
      .select("id, order_id, queue, target_at, warning_at, entered_at, is_breached")
      .in("order_id", orderIds)
      .is("resolved_at", null);

    const map: Record<string, SlaEntry> = {};
    (data || []).forEach((row: any) => {
      // Keep the most urgent (earliest target_at) per order
      const existing = map[row.order_id];
      if (!existing || new Date(row.target_at) < new Date(existing.targetAt)) {
        map[row.order_id] = {
          id: row.id,
          orderId: row.order_id,
          queue: row.queue,
          targetAt: row.target_at,
          warningAt: row.warning_at,
          enteredAt: row.entered_at,
          isBreached: row.is_breached,
        };
      }
    });
    setSlaMap(map);
  }, [orderIds.join(",")]);

  // Fetch every 60s
  useEffect(() => {
    fetchSla();
    const interval = setInterval(fetchSla, 60000);
    return () => clearInterval(interval);
  }, [fetchSla]);

  // Client-side tick every 10s for countdown updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  return { slaMap, tick };
}
