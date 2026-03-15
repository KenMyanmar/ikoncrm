import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Truck, CheckCircle, XCircle, Eye, Printer, ShoppingCart, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { STATUS_LABELS, STATUS_COLORS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS, TAB_STATUS_MAP, formatRelativeTime } from "@/components/orders/orderConstants";
import { PaymentVerificationDialog } from "@/components/orders/PaymentVerificationDialog";
import { DeliveryAssignDialog } from "@/components/orders/DeliveryAssignDialog";

export default function OrderList() {
  const navigate = useNavigate();
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: any; mode: "view" | "approve" | "reject" }>({ open: false, order: null, mode: "view" });
  const [deliveryDialog, setDeliveryDialog] = useState<{ open: boolean; order: any }>({ open: false, order: null });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ["order-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { count: pendingPayment } = await supabase.from("orders").select("*", { count: "exact", head: true })
        .in("status", ["awaiting_payment_proof", "payment_under_review"]);
      const { count: readyToPack } = await supabase.from("orders").select("*", { count: "exact", head: true })
        .in("status", ["confirmed_cod", "paid"]);
      const { count: outForDelivery } = await supabase.from("orders").select("*", { count: "exact", head: true })
        .eq("status", "out_for_delivery");
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count: deliveredToday } = await supabase.from("orders").select("*", { count: "exact", head: true })
        .eq("status", "delivered").gte("delivered_at", today.toISOString());
      return {
        total: total || 0,
        pendingPayment: pendingPayment || 0,
        readyToPack: readyToPack || 0,
        outForDelivery: outForDelivery || 0,
        deliveredToday: deliveredToday || 0,
      };
    },
  });

  // Orders query
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", tab, search],
    queryFn: async () => {
      let query = supabase.from("orders")
        .select("*, customers(name, company_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      const statusFilter = TAB_STATUS_MAP[tab];
      if (statusFilter && statusFilter.length > 0) query = query.in("status", statusFilter);
      if (search) query = query.or(`order_number.ilike.%${search}%,contact_name.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // Item counts
  const { data: itemCounts } = useQuery({
    queryKey: ["order-item-counts", orders?.map((o: any) => o.id)],
    queryFn: async () => {
      if (!orders?.length) return {};
      const ids = orders.map((o: any) => o.id);
      const { data } = await supabase.from("order_items").select("order_id, quantity").in("order_id", ids);
      const counts: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        counts[item.order_id] = (counts[item.order_id] || 0) + item.quantity;
      });
      return counts;
    },
    enabled: !!orders?.length,
  });

  // Quick actions mutations
  const markPackedMutation = useMutation({
    mutationFn: async (order: any) => {
      const { error } = await supabase.from("orders").update({ status: "packed", packed_at: new Date().toISOString() } as any).eq("id", order.id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({
        order_id: order.id, from_status: order.status, to_status: "packed",
        changed_by: staff?.id, changed_by_role: staff?.role, reason: `Marked as packed by ${staff?.full_name}`,
      } as any);
      if (staff) await logActivity(staff.id, "order_packed", "order", order.id, order.order_number);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); queryClient.invalidateQueries({ queryKey: ["order-stats"] }); toast.success("Order marked as packed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async (order: any) => {
      const { error } = await supabase.from("orders").update({ status: "delivered", delivered_at: new Date().toISOString() } as any).eq("id", order.id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({
        order_id: order.id, from_status: order.status, to_status: "delivered",
        changed_by: staff?.id, changed_by_role: staff?.role, reason: `Marked as delivered by ${staff?.full_name}`,
      } as any);
      if (staff) await logActivity(staff.id, "order_delivered", "order", order.id, order.order_number);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); queryClient.invalidateQueries({ queryKey: ["order-stats"] }); toast.success("Order marked as delivered"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openPackingSlip = (orderId: string) => {
    window.open(`/orders/${orderId}?print=slip`, "_blank", "width=800,height=600");
  };

  const statCards = [
    { label: "Total Orders", value: stats?.total || 0, icon: ShoppingCart, color: "text-foreground" },
    { label: "Pending Payment", value: stats?.pendingPayment || 0, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/5" },
    { label: "Ready to Pack", value: stats?.readyToPack || 0, icon: Package, color: "text-warning", bg: "bg-warning/5" },
    { label: "Out for Delivery", value: stats?.outForDelivery || 0, icon: Truck, color: "text-info", bg: "bg-info/5" },
    { label: "Delivered Today", value: stats?.deliveredToday || 0, icon: CheckCircle, color: "text-success", bg: "bg-success/5" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Orders</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className={s.bg || ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Tabs value={tab} onValueChange={setTab} className="flex-1">
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="payment_queue" className="text-xs">Payment Queue</TabsTrigger>
                <TabsTrigger value="ready_to_pack" className="text-xs">Ready to Pack</TabsTrigger>
                <TabsTrigger value="in_delivery" className="text-xs">In Delivery</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : !orders?.length ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
                ) : (
                  orders.map((o: any) => (
                    <TableRow key={o.id} className="group">
                      <TableCell>
                        <button onClick={() => navigate(`/orders/${o.id}`)} className="font-mono text-xs text-primary hover:underline">
                          {o.order_number}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{o.customers?.company_name || o.customers?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{itemCounts?.[o.id] || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{o.total ? `${Number(o.total).toLocaleString()} MMK` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="text-[10px] w-fit">{PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method || "—"}</Badge>
                          <Badge variant="secondary" className={`text-[10px] w-fit ${PAYMENT_STATUS_COLORS[o.payment_status] || ""}`}>{o.payment_status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[o.status] || ""}`}>
                          {STATUS_LABELS[o.status] || o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(o.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end opacity-70 group-hover:opacity-100">
                          {o.status === "payment_under_review" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-success" onClick={e => { e.stopPropagation(); setPaymentDialog({ open: true, order: o, mode: "approve" }); }}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={e => { e.stopPropagation(); setPaymentDialog({ open: true, order: o, mode: "reject" }); }}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {(o.status === "awaiting_payment_proof" || o.status === "payment_rejected") && o.payment_proof_url && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={e => { e.stopPropagation(); setPaymentDialog({ open: true, order: o, mode: "view" }); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(o.status === "confirmed_cod" || o.status === "paid") && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={e => { e.stopPropagation(); markPackedMutation.mutate(o); }}>
                              <Package className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {o.status === "packed" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={e => { e.stopPropagation(); setDeliveryDialog({ open: true, order: o }); }}>
                                <Truck className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={e => { e.stopPropagation(); openPackingSlip(o.id); }}>
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {o.status === "out_for_delivery" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-success" onClick={e => { e.stopPropagation(); markDeliveredMutation.mutate(o); }}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={e => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaymentVerificationDialog
        open={paymentDialog.open}
        onOpenChange={open => setPaymentDialog(p => ({ ...p, open }))}
        order={paymentDialog.order}
        mode={paymentDialog.mode}
      />
      <DeliveryAssignDialog
        open={deliveryDialog.open}
        onOpenChange={open => setDeliveryDialog(p => ({ ...p, open }))}
        order={deliveryDialog.order}
      />
    </div>
  );
}
