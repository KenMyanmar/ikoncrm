import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Printer, MoreHorizontal, Package, Truck, CheckCircle, CreditCard, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PAYMENT_METHOD_LABELS, RISK_FLAG_LABELS } from "./orderConstants";
import { SlaTimerBadge } from "./SlaTimerBadge";
import type { SlaEntry } from "./useSlaTimers";

interface OrderKanbanCardProps {
  order: any;
  itemCount: number;
  sla?: SlaEntry;
  columnKey: string;
  onMarkPacked: (order: any) => void;
  onMarkDelivered: (order: any) => void;
  onReviewPayment: (order: any, mode: "view" | "approve" | "reject") => void;
  onAssignDelivery: (order: any) => void;
}

export function OrderKanbanCard({
  order,
  itemCount,
  sla,
  columnKey: _columnKey,
  onMarkPacked,
  onMarkDelivered,
  onReviewPayment,
  onAssignDelivery,
}: OrderKanbanCardProps) {
  const navigate = useNavigate();
  const o = order;

  const paymentBadgeColor: Record<string, string> = {
    cod: "bg-destructive/10 text-destructive border-destructive/20",
    kbz_pay: "bg-info/10 text-info border-info/20",
    myan_pay: "bg-primary/10 text-primary border-primary/20",
    bank_transfer: "bg-muted text-muted-foreground border-border",
  };

  const riskFlags = (o.risk_flags || []) as string[];
  const riskScore = o.risk_score || 0;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow space-y-2">
      {/* Top row: SLA + payment badge */}
      <div className="flex items-center justify-between gap-1">
        {sla ? <SlaTimerBadge targetAt={sla.targetAt} /> : <span />}
        <Badge variant="outline" className={`text-[9px] ${paymentBadgeColor[o.payment_method] || ""}`}>
          {PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method || "—"}
        </Badge>
      </div>

      {/* Order number */}
      <button
        onClick={() => navigate(`/orders/${o.id}`)}
        className="font-mono text-xs text-primary hover:underline block"
      >
        {o.order_number}
      </button>

      {/* Customer */}
      <p className="text-xs text-foreground truncate">
        {o.customers?.company_name || o.customers?.name || "—"}
      </p>

      {/* Items + total */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{itemCount || 0} item{(itemCount || 0) !== 1 ? "s" : ""}</span>
        <span className="font-medium text-foreground">
          {o.total ? `${Number(o.total).toLocaleString()} MMK` : "—"}
        </span>
      </div>

      {/* Delivery zone */}
      {o.delivery_zone && (
        <p className="text-[10px] text-muted-foreground">
          📍 {o.delivery_zone.replace(/_/g, " ")}
        </p>
      )}

      {/* Risk flags */}
      {riskScore >= 40 && riskFlags.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-warning">
          <AlertTriangle className="h-3 w-3" />
          <span className="truncate">{riskFlags.map(f => RISK_FLAG_LABELS[f] || f).join(", ")}</span>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        {/* Primary action */}
        {o.status === "payment_under_review" && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onReviewPayment(o, "approve")}>
            <CreditCard className="h-3 w-3 mr-1" /> Review
          </Button>
        )}
        {o.status === "awaiting_payment_proof" && (
          <span className="text-[10px] text-muted-foreground">Awaiting proof</span>
        )}
        {(o.status === "confirmed_cod" || o.status === "paid") && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onMarkPacked(o)}>
            <Package className="h-3 w-3 mr-1" /> Pack
          </Button>
        )}
        {o.status === "packed" && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onAssignDelivery(o)}>
            <Truck className="h-3 w-3 mr-1" /> Assign
          </Button>
        )}
        {o.status === "out_for_delivery" && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-success" onClick={() => onMarkDelivered(o)}>
            <CheckCircle className="h-3 w-3 mr-1" /> Delivered
          </Button>
        )}
        {(o.status === "delivered" || o.status === "cancelled" || o.status === "expired" || o.status === "payment_rejected") && (
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => navigate(`/orders/${o.id}`)}>
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
        )}

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => navigate(`/orders/${o.id}`)}>
              <Eye className="h-3.5 w-3.5 mr-2" /> View Details
            </DropdownMenuItem>
            {o.status === "packed" && (
              <DropdownMenuItem onClick={() => window.open(`/orders/${o.id}?print=slip`, "_blank", "width=800,height=600")}>
                <Printer className="h-3.5 w-3.5 mr-2" /> Packing Slip
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
