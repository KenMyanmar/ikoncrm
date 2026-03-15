export const STATUS_LABELS: Record<string, string> = {
  confirmed_cod: "Confirmed (COD)",
  awaiting_payment_proof: "Awaiting Proof",
  payment_under_review: "Under Review",
  paid: "Paid",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_rejected: "Payment Rejected",
  expired: "Expired",
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
};

export const STATUS_COLORS: Record<string, string> = {
  confirmed_cod: "bg-info/10 text-info border-info/20",
  awaiting_payment_proof: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
  payment_under_review: "bg-warning/10 text-warning border-warning/20",
  paid: "bg-success/10 text-success border-success/20",
  packed: "bg-primary/10 text-primary border-primary/20",
  out_for_delivery: "bg-info/10 text-info border-info/20",
  delivered: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  payment_rejected: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-info/10 text-info border-info/20",
  processing: "bg-info/10 text-info border-info/20",
  shipped: "bg-primary/10 text-primary border-primary/20",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  awaiting_proof: "bg-destructive/10 text-destructive",
  under_review: "bg-warning/10 text-warning",
  verified: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "COD",
  kbz_pay: "KBZ Pay",
  myan_pay: "MyanPay",
  bank_transfer: "Bank Transfer",
};

export const TAB_STATUS_MAP: Record<string, string[]> = {
  all: [],
  payment_queue: ["awaiting_payment_proof", "payment_under_review", "payment_rejected"],
  ready_to_pack: ["confirmed_cod", "paid"],
  in_delivery: ["out_for_delivery", "packed"],
  completed: ["delivered"],
  cancelled: ["cancelled"],
};

export const KANBAN_COLUMNS = [
  {
    key: "payment",
    label: "Payment Queue",
    icon: "CreditCard",
    statuses: ["awaiting_payment_proof", "payment_under_review"],
    color: "text-warning",
  },
  {
    key: "warehouse",
    label: "Warehouse",
    icon: "Package",
    statuses: ["confirmed_cod", "paid", "packed"],
    color: "text-primary",
  },
  {
    key: "delivery",
    label: "Delivery",
    icon: "Truck",
    statuses: ["out_for_delivery"],
    color: "text-info",
  },
  {
    key: "done",
    label: "Done Today",
    icon: "CheckCircle",
    statuses: ["delivered"],
    color: "text-success",
  },
  {
    key: "exceptions",
    label: "Exceptions",
    icon: "AlertTriangle",
    statuses: ["payment_rejected", "cancelled", "expired"],
    color: "text-destructive",
  },
] as const;

export const RISK_FLAG_LABELS: Record<string, string> = {
  first_time_cod: "First-time COD buyer",
  high_value_cod: "High value COD > 1M MMK",
  frequent_canceller: "Frequent cancellations",
  delivery_failures: "Previous delivery failures",
  very_high_value: "Very high value order > 5M MMK",
  remote_cod: "Remote zone COD",
};

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatSlaTime(targetAt: string): { label: string; status: "green" | "amber" | "red" } {
  const now = Date.now();
  const target = new Date(targetAt).getTime();
  const remaining = target - now;

  if (remaining <= 0) {
    const overdue = Math.abs(remaining);
    const mins = Math.floor(overdue / 60000);
    const secs = Math.floor((overdue % 60000) / 1000);
    return {
      label: `OVERDUE +${mins}:${secs.toString().padStart(2, "0")}`,
      status: "red",
    };
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const hrs = Math.floor(mins / 60);
  const label = hrs > 0 ? `${hrs}:${(mins % 60).toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}` : `${mins}:${secs.toString().padStart(2, "0")}`;

  // If less than 50% of the original time remains, show amber
  // We approximate by treating < 15 min as amber for simplicity
  const status = mins < 15 ? "amber" : "green";

  return { label, status };
}
