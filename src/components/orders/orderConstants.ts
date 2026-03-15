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
