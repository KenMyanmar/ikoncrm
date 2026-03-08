import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [notes, setNotes] = useState("");

  const { data: order } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, customers(name, company_name, email, phone)").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ["admin-order-items", id],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("orders").update({ status: newStatus } as any).eq("id", id!);
      if (error) throw error;
      if (staff) await logActivity(staff.id, `status_${newStatus}`, "order", id!, order?.order_number);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-order", id] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const notesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ internal_notes: notes } as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notes saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!order) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Status Pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={order.status === s ? "default" : "outline"}
                    className={order.status === s ? "bg-accent text-accent-foreground" : ""}
                    onClick={() => statusMutation.mutate(s)}
                    disabled={statusMutation.isPending}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Order Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items || []).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.product_name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.sku || "—"}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{Number(item.unit_price).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{Number(item.total).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{(order as any).customers?.company_name || (order as any).customers?.name || "—"}</p>
              <p className="text-muted-foreground">{(order as any).customers?.email}</p>
              <p className="text-muted-foreground">{(order as any).customers?.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>{Number(order.subtotal || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{Number(order.shipping_cost).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{Number(order.tax).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{Number(order.discount).toLocaleString()}</span></div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{Number(order.total || 0).toLocaleString()} {order.currency}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Internal Notes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={notes || order.internal_notes || ""} onChange={e => setNotes(e.target.value)} rows={3} />
              <Button size="sm" variant="outline" className="w-full" onClick={() => notesMutation.mutate()}>Save Notes</Button>
            </CardContent>
          </Card>

          <DeliveryAssignmentCard orderId={id!} staffRole={staff?.role || ""} />
        </div>
      </div>
    </div>
  );
}

function DeliveryAssignmentCard({ orderId, staffRole }: { orderId: string; staffRole: string }) {
  const queryClient = useQueryClient();
  const canAssign = ["super_admin", "admin", "manager"].includes(staffRole);

  const { data: assignment } = useQuery({
    queryKey: ["delivery-assignment", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_assignments")
        .select("*, staff_profiles!delivery_assignments_driver_id_fkey(full_name, email)")
        .eq("order_id", orderId)
        .maybeSingle();
      return data;
    },
  });

  const { data: drivers } = useQuery({
    queryKey: ["delivery-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_profiles").select("id, full_name").eq("role", "delivery").eq("is_active", true);
      return data || [];
    },
    enabled: canAssign,
  });

  const assignMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase.from("delivery_assignments").insert({ order_id: orderId, driver_id: driverId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["delivery-assignment", orderId] }); toast.success("Delivery assigned"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!canAssign && !assignment) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Delivery Assignment</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {assignment ? (
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Driver:</span> {(assignment as any).staff_profiles?.full_name || "—"}</p>
            <p><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{assignment.status}</Badge></p>
            {assignment.delivered_at && <p className="text-xs text-muted-foreground">Delivered: {new Date(assignment.delivered_at).toLocaleString()}</p>}
          </div>
        ) : canAssign ? (
          <div className="space-y-2">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
              onChange={e => { if (e.target.value) assignMutation.mutate(e.target.value); }}
              disabled={assignMutation.isPending}
            >
              <option value="" disabled>Select delivery driver...</option>
              {(drivers || []).map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
