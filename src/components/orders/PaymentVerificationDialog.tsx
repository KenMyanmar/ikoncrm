import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveTemplate } from "./templateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, ZoomIn } from "lucide-react";
import { PAYMENT_METHOD_LABELS, formatRelativeTime } from "./orderConstants";

interface PaymentVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  mode: "view" | "approve" | "reject";
}

const REJECT_REASONS = [
  "Screenshot unclear",
  "Amount mismatch",
  "Wrong account",
  "Duplicate screenshot",
  "Other",
];

export function PaymentVerificationDialog({ open, onOpenChange, order, mode }: PaymentVerificationDialogProps) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [showReject, setShowReject] = useState(mode === "reject");
  const [rejectPreset, setRejectPreset] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [imageZoomed, setImageZoomed] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({
        status: "paid",
        payment_status: "verified",
        payment_verified_by: staff?.id,
        payment_verified_at: new Date().toISOString(),
      } as any).eq("id", order.id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: order.status,
        to_status: "paid",
        changed_by: staff?.id,
        changed_by_role: staff?.role,
        reason: `Payment verified by ${staff?.full_name}`,
      } as any);
      if (staff) await logActivity(staff.id, "order_approved_payment", "order", order.id, order.order_number);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] });
      toast.success("Payment approved! Order ready for packing.");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const reason = rejectReason || rejectPreset;
      if (!reason) throw new Error("Please provide a rejection reason");
      const { error } = await supabase.from("orders").update({
        status: "payment_rejected",
        payment_status: "rejected",
        payment_rejection_reason: reason,
      } as any).eq("id", order.id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: order.status,
        to_status: "payment_rejected",
        changed_by: staff?.id,
        changed_by_role: staff?.role,
        reason: `Payment rejected: ${reason}`,
      } as any);
      if (staff) await logActivity(staff.id, "order_rejected_payment", "order", order.id, order.order_number, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] });
      toast.success("Payment rejected. Customer will be notified.");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Payment Verification</DialogTitle>
          <DialogDescription>{order.order_number} — {order.customers?.company_name || order.customers?.name || "Unknown"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Method</span>
              <p className="font-medium">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Amount</span>
              <p className="font-medium">{Number(order.total || 0).toLocaleString()} MMK</p>
            </div>
            {order.payment_reference && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Reference</span>
                <p className="font-mono text-xs">{order.payment_reference}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-muted-foreground">Submitted</span>
              <p>{formatRelativeTime(order.created_at)}</p>
            </div>
          </div>

          {order.payment_proof_url ? (
            <div className="relative">
              <p className="text-sm text-muted-foreground mb-1">Payment Screenshot</p>
              <div
                className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${imageZoomed ? "fixed inset-4 z-50 bg-background/95 flex items-center justify-center" : "max-h-64"}`}
                onClick={() => setImageZoomed(!imageZoomed)}
              >
                <img
                  src={order.payment_proof_url}
                  alt="Payment proof"
                  className={imageZoomed ? "max-h-[90vh] object-contain" : "w-full object-cover max-h-64"}
                />
              </div>
              {!imageZoomed && (
                <button
                  onClick={() => setImageZoomed(true)}
                  className="absolute top-8 right-2 bg-background/80 rounded-full p-1"
                >
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
              No payment proof uploaded
            </div>
          )}

          {!showReject ? (
            <div className="flex gap-2">
              {(mode === "approve" || mode === "view") && order.status === "payment_under_review" && (
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Payment
                </Button>
              )}
              {(mode === "reject" || mode === "view") && order.status === "payment_under_review" && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowReject(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium">Reason for rejection</p>
              <Select value={rejectPreset} onValueChange={(v) => { setRejectPreset(v); if (v !== "Other") setRejectReason(v); }}>
                <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                <SelectContent>
                  {REJECT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {rejectPreset === "Other" && (
                <Textarea placeholder="Enter rejection reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} />
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending || (!rejectReason && !rejectPreset)}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
