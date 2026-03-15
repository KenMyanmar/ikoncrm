import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, STATUS_COLORS, formatRelativeTime } from "./orderConstants";
import { Badge } from "@/components/ui/badge";

interface OrderStatusTimelineProps {
  orderId: string;
}

export function OrderStatusTimeline({ orderId }: OrderStatusTimelineProps) {
  const { data: history } = useQuery({
    queryKey: ["order-status-history", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_status_history")
        .select("*, staff:changed_by(full_name)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!orderId,
  });

  if (!history?.length) return <p className="text-sm text-muted-foreground">No status history yet.</p>;

  return (
    <div className="space-y-0">
      {history.map((entry: any, i: number) => (
        <div key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-primary" : "bg-border"}`} />
            {i < history.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {entry.from_status && (
                <>
                  <Badge variant="outline" className="text-[10px] py-0">{STATUS_LABELS[entry.from_status] || entry.from_status}</Badge>
                  <span className="text-muted-foreground text-xs">→</span>
                </>
              )}
              <Badge variant="secondary" className={`text-[10px] py-0 ${STATUS_COLORS[entry.to_status] || ""}`}>
                {STATUS_LABELS[entry.to_status] || entry.to_status}
              </Badge>
            </div>
            {entry.reason && <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {(entry as any).staff?.full_name || entry.changed_by_role || "System"} · {formatRelativeTime(entry.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
