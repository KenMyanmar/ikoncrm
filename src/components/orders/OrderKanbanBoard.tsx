import { useMemo } from "react";
import { CreditCard, Package, Truck, CheckCircle, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KANBAN_COLUMNS } from "./orderConstants";
import { OrderKanbanCard } from "./OrderKanbanCard";
import type { SlaEntry } from "./useSlaTimers";

const ICONS: Record<string, React.ElementType> = {
  CreditCard,
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
};

interface OrderKanbanBoardProps {
  orders: any[];
  itemCounts: Record<string, number>;
  slaMap: Record<string, SlaEntry>;
  onMarkPacked: (order: any) => void;
  onMarkDelivered: (order: any) => void;
  onReviewPayment: (order: any, mode: "view" | "approve" | "reject") => void;
  onAssignDelivery: (order: any) => void;
}

export function OrderKanbanBoard({
  orders,
  itemCounts,
  slaMap,
  onMarkPacked,
  onMarkDelivered,
  onReviewPayment,
  onAssignDelivery,
}: OrderKanbanBoardProps) {
  const columns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return KANBAN_COLUMNS.map((col) => {
      let filtered = orders.filter((o) => col.statuses.includes(o.status));
      // Done column: only today's deliveries
      if (col.key === "done") {
        filtered = filtered.filter((o) => o.delivered_at && new Date(o.delivered_at) >= today);
      }

      // Sort: payment by created_at asc, warehouse by created_at asc, delivery by shipped_at, done by delivered_at desc
      if (col.key === "payment") {
        filtered.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        // Push breached SLA to top
        filtered.sort((a: any, b: any) => {
          const aSla = slaMap[a.id];
          const bSla = slaMap[b.id];
          if (aSla?.isBreached && !bSla?.isBreached) return -1;
          if (!aSla?.isBreached && bSla?.isBreached) return 1;
          return 0;
        });
      } else if (col.key === "done") {
        filtered.sort((a: any, b: any) => new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime());
      } else {
        filtered.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }

      return { ...col, orders: filtered };
    });
  }, [orders, slaMap]);

  // Count SLA issues per column
  const slaCountsPerColumn = useMemo(() => {
    const counts: Record<string, { overdue: number; warning: number }> = {};
    columns.forEach((col) => {
      let overdue = 0;
      let warning = 0;
      col.orders.forEach((o: any) => {
        const sla = slaMap[o.id];
        if (!sla) return;
        const now = Date.now();
        const target = new Date(sla.targetAt).getTime();
        if (now > target) overdue++;
        else if (sla.warningAt && now > new Date(sla.warningAt).getTime()) warning++;
      });
      counts[col.key] = { overdue, warning };
    });
    return counts;
  }, [columns, slaMap]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
      {columns.map((col) => {
        const Icon = ICONS[col.icon];
        const slaCounts = slaCountsPerColumn[col.key];

        return (
          <div
            key={col.key}
            className="flex-shrink-0 w-[280px] min-w-[280px] snap-start bg-muted/30 rounded-lg border border-border"
          >
            {/* Column header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className={`h-4 w-4 ${col.color}`} />}
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                </div>
                <span className="bg-muted text-muted-foreground text-[10px] font-mono rounded-full px-2 py-0.5">
                  {col.orders.length}
                </span>
              </div>
              {(slaCounts.overdue > 0 || slaCounts.warning > 0) && (
                <div className="flex gap-2 mt-1 text-[10px]">
                  {slaCounts.overdue > 0 && (
                    <span className="text-destructive font-medium">{slaCounts.overdue} overdue</span>
                  )}
                  {slaCounts.warning > 0 && (
                    <span className="text-warning font-medium">{slaCounts.warning} warning</span>
                  )}
                </div>
              )}
            </div>

            {/* Cards */}
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-2 space-y-2">
                {col.orders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No orders</p>
                ) : (
                  col.orders.map((o: any) => (
                    <OrderKanbanCard
                      key={o.id}
                      order={o}
                      itemCount={itemCounts[o.id] || 0}
                      sla={slaMap[o.id]}
                      columnKey={col.key}
                      onMarkPacked={onMarkPacked}
                      onMarkDelivered={onMarkDelivered}
                      onReviewPayment={onReviewPayment}
                      onAssignDelivery={onAssignDelivery}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
