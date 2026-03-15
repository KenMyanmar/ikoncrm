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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Truck } from "lucide-react";

interface DeliveryAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

function getDefaultDeliveryDate(): string {
  const now = new Date();
  // If past 2pm, default to tomorrow
  const target = now.getHours() >= 14 ? new Date(now.getTime() + 86400000) : now;
  return target.toISOString().split("T")[0];
}

export function DeliveryAssignDialog({ open, onOpenChange, order }: DeliveryAssignDialogProps) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("normal");
  const [expectedDate, setExpectedDate] = useState(getDefaultDeliveryDate);

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
      const driverName = drivers?.find(d => d.id === driverId)?.full_name || "driver";

      // Insert delivery assignment
      const { error: aErr } = await supabase.from("delivery_assignments").insert({
        order_id: order.id,
        driver_id: driverId,
        delivery_notes: notes || null,
        estimated_arrival: expectedDate ? new Date(expectedDate).toISOString() : null,
      } as any);
      if (aErr) throw aErr;

      // Update order
      const { error: oErr } = await supabase.from("orders").update({
        status: "out_for_delivery",
        shipped_at: new Date().toISOString(),
        priority: priority,
        estimated_delivery: expectedDate || null,
      } as any).eq("id", order.id);
      if (oErr) throw oErr;

      // Status history
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: order.status,
        to_status: "out_for_delivery",
        changed_by: staff?.id,
        changed_by_role: staff?.role,
        reason: `Assigned to ${driverName} (${priority})`,
      } as any);

      // Tracking log entry
      await supabase.from("delivery_tracking_log").insert({
        assignment_id: (await supabase.from("delivery_assignments").select("id").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).single()).data?.id,
        status: "assigned",
        note: `Assigned to ${driverName} by ${staff?.full_name}`,
      } as any);

      // Notify driver
      const address = order.customer_addresses;
      const addressStr = address ? `${address.address_line}, ${address.township || ""}` : "Address pending";
      await (supabase as any).from("staff_notifications").insert({
        staff_id: driverId,
        type: "order_assigned",
        title: `New delivery: ${order.order_number}`,
        body: `${addressStr} — ${Number(order.total || 0).toLocaleString()} MMK (${order.payment_method || "N/A"})`,
        link: "/my-deliveries",
      });

      // Activity log
      if (staff) {
        await logActivity(staff.id, "order_assigned_delivery", "order", order.id, order.order_number, { driver: driverName, priority });
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
            <Label className="mb-1 block">Delivery Driver</Label>
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
            <Label className="mb-1 block">Expected Delivery Date</Label>
            <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
          </div>

          <div>
            <Label className="mb-2 block">Priority</Label>
            <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="normal" id="p-normal" />
                <Label htmlFor="p-normal" className="font-normal cursor-pointer">Normal</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="urgent" id="p-urgent" />
                <Label htmlFor="p-urgent" className="font-normal cursor-pointer text-warning">Urgent</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="same_day" id="p-sameday" />
                <Label htmlFor="p-sameday" className="font-normal cursor-pointer text-destructive">Same-Day</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-1 block">Delivery Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Special instructions…" />
          </div>

          <Button className="w-full h-12" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !driverId}>
            <Truck className="h-4 w-4 mr-2" />
            Assign & Send Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
