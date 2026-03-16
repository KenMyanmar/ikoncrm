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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Truck, AlertTriangle } from "lucide-react";

interface DeliveryAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
  orderIds?: string[];
  onSuccess?: () => void;
}

function getDefaultDeliveryDate(): string {
  const now = new Date();
  const target = now.getHours() >= 14 ? new Date(now.getTime() + 86400000) : now;
  return target.toISOString().split("T")[0];
}

export function DeliveryAssignDialog({ open, onOpenChange, order, orderIds, onSuccess }: DeliveryAssignDialogProps) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("normal");
  const [expectedDate, setExpectedDate] = useState(getDefaultDeliveryDate);

  const isBatch = orderIds && orderIds.length > 0;
  const effectiveIds = isBatch ? orderIds : order ? [order.id] : [];

  const { data: drivers } = useQuery({
    queryKey: ["delivery-drivers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_profiles")
        .select("id, full_name, role")
        .in("role", ["delivery", "admin", "manager", "super_admin"])
        .eq("is_active", true);
      return data || [];
    },
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!driverId) throw new Error("Please select a driver");
      if (effectiveIds.length === 0) throw new Error("No orders to assign");

      const driverName = drivers?.find(d => d.id === driverId)?.full_name || "driver";

      for (const orderId of effectiveIds) {
        // Insert delivery assignment
        const { error: aErr } = await supabase.from("delivery_assignments").insert({
          order_id: orderId,
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
        } as any).eq("id", orderId);
        if (oErr) throw oErr;

        // Status history
        await supabase.from("order_status_history").insert({
          order_id: orderId,
          from_status: "packed",
          to_status: "out_for_delivery",
          changed_by: staff?.id,
          changed_by_role: staff?.role,
          reason: isBatch
            ? `Batch assigned to ${driverName} (${priority})`
            : `Assigned to ${driverName} (${priority})`,
        } as any);

        // Tracking log entry
        const { data: assignmentData } = await supabase
          .from("delivery_assignments")
          .select("id")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (assignmentData) {
          await supabase.from("delivery_tracking_log").insert({
            assignment_id: assignmentData.id,
            status: "assigned",
            note: `Assigned to ${driverName} by ${staff?.full_name}`,
          } as any);
        }

        // Notify driver
        await (supabase as any).from("staff_notifications").insert({
          staff_id: driverId,
          type: "order_assigned",
          title: isBatch ? `Batch delivery: ${effectiveIds.length} orders` : `New delivery assigned`,
          body: `Priority: ${priority}`,
          link: "/my-deliveries",
        });
      }

      // Activity log
      if (staff) {
        if (isBatch) {
          await logActivity(staff.id, "order_batch_assigned_delivery", "order", undefined, undefined, {
            driver: driverName,
            priority,
            count: effectiveIds.length,
            orderIds: effectiveIds,
          });
        } else {
          await logActivity(staff.id, "order_assigned_delivery", "order", order?.id, order?.order_number, {
            driver: driverName,
            priority,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-assignment"] });
      toast.success(isBatch ? `${effectiveIds.length} orders assigned!` : "Delivery assigned!");
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Assign Delivery</DialogTitle>
          <DialogDescription>
            {isBatch ? `Assigning ${effectiveIds.length} orders` : order?.order_number}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">Delivery Driver</Label>
            {drivers && drivers.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  No delivery drivers found. Add staff with 'delivery' role in Staff Management.
                  Admins/managers can also be assigned.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger><SelectValue placeholder="Select driver…" /></SelectTrigger>
                <SelectContent>
                  {(drivers || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name} {d.role !== "delivery" ? `(${d.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            {isBatch ? `Assign ${effectiveIds.length} Orders` : "Assign & Send Out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
