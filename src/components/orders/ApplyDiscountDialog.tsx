import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  order: any;
}

export function ApplyDiscountDialog({ open, onOpenChange, orderId, order }: Props) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(Number(order?.discount || 0));
  const [reason, setReason] = useState("");

  const canApplyDiscount = ["admin", "super_admin", "manager"].includes(staff?.role || "");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!canApplyDiscount) throw new Error("Only admin/manager can apply discounts");
      const newTotal = Math.max(0, Number(order.subtotal || 0) + Number(order.shipping_cost || 0) - amount);

      const { error } = await supabase.from("orders").update({
        discount: amount,
        total: newTotal,
      } as any).eq("id", orderId);
      if (error) throw error;

      await (supabase as any).from("order_edits").insert({
        order_id: orderId,
        edited_by: staff!.id,
        edit_type: "discount_applied",
        description: `Discount ${amount.toLocaleString()} MMK applied${reason ? `: ${reason}` : ""}`,
        old_value: { discount: order.discount, total: order.total },
        new_value: { discount: amount, total: newTotal },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      toast.success("Discount applied");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Apply Discount</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Discount Amount (MMK)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="text-xs" />
          </div>
          <p className="text-xs text-muted-foreground">
            New total: <span className="font-bold text-foreground">
              {Math.max(0, Number(order?.subtotal || 0) + Number(order?.shipping_cost || 0) - amount).toLocaleString()} MMK
            </span>
          </p>
          {!canApplyDiscount && (
            <p className="text-xs text-destructive">Only admin or manager roles can apply discounts.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !canApplyDiscount || amount <= 0}>
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
