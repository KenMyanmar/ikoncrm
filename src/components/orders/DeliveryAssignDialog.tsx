import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Truck } from "lucide-react";

interface DeliveryAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export function DeliveryAssignDialog({ open, onOpenChange, order }: DeliveryAssignDialogProps) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: drivers } = useQuery({
    queryKey: ["delivery-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_profiles").select("id, full_name").eq("role", "delivery").eq("is_active", true);
      return data || [];
    },
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!driverId) throw new Error("Please select a driver");
      const { error: aErr } = await supabase.from("delivery_assignments").insert({
        order_id: order.id,
        driver_id: driverId,
        delivery_notes: notes || null,
      } as any);
      if (aErr) throw aErr;
      const { error: oErr } = await supabase.from("orders").update({
        status: "out_for_delivery",
        shipped_at: new Date().toISOString(),
      } as any).eq("id", order.id);
      if (oErr) throw oErr;
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: order.status,
        to_status: "out_for_delivery",
        changed_by: staff?.id,
        changed_by_role: staff?.role,
        reason: `Assigned to ${drivers?.find(d => d.id === driverId)?.full_name || "driver"}`,
      } as any);
      if (staff) {
        const driverName = drivers?.find(d => d.id === driverId)?.full_name || "driver";
        await logActivity(staff.id, "order_assigned_delivery", "order", order.id, order.order_number, { driver: driverName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["delivery-assignment"] });
      toast.success("Delivery assigned!");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Assign Delivery</DialogTitle>
          <DialogDescription>{order?.order_number}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Delivery Driver</label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select driver…" /></SelectTrigger>
              <SelectContent>
                {(drivers || []).map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Delivery Notes (optional)</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Special instructions…" />
          </div>
          <Button className="w-full" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !driverId}>
            <Truck className="h-4 w-4 mr-2" />
            Assign & Send Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
