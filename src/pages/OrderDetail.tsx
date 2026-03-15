import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Package, Truck, Printer, AlertTriangle, Clock, Shield, Edit, Percent, Lock, Send, Mail } from "lucide-react";
import { useState } from "react";
import { STATUS_LABELS, STATUS_COLORS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS, RISK_FLAG_LABELS, formatRelativeTime } from "@/components/orders/orderConstants";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { PaymentVerificationDialog } from "@/components/orders/PaymentVerificationDialog";
import { DeliveryAssignDialog } from "@/components/orders/DeliveryAssignDialog";
import { PackingSlipWindow } from "@/components/orders/PackingSlipWindow";
import { SlaTimerBadge } from "@/components/orders/SlaTimerBadge";
import { OrderNotes } from "@/components/orders/OrderNotes";
import { OrderEditItemsDialog } from "@/components/orders/OrderEditItemsDialog";
import { ApplyDiscountDialog } from "@/components/orders/ApplyDiscountDialog";
import { CommunicationLog } from "@/components/orders/CommunicationLog";
import { SendMessageDialog } from "@/components/orders/SendMessageDialog";
import { DeliveryTrackingCard } from "@/components/orders/DeliveryTrackingCard";

const EDITABLE_STATUSES = ["confirmed_cod", "awaiting_payment_proof", "payment_under_review", "paid"];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [editItemsDialog, setEditItemsDialog] = useState(false);
  const [discountDialog, setDiscountDialog] = useState(false);
  const [showPackingSlip, setShowPackingSlip] = useState(searchParams.get("print") === "slip");
  const [sendMessageDialog, setSendMessageDialog] = useState(false);
  const [preselectedTemplate, setPreselectedTemplate] = useState("");

  const { data: order } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("*, customers(name, company_name, email, phone), customer_addresses!orders_delivery_address_id_fkey(address_line, township, city, region, contact_phone, delivery_notes)")
        .eq("id", id!).single();
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

  const { data: slaEntries } = useQuery({
    queryKey: ["order-sla", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("sla_tracking")
        .select("*")
        .eq("order_id", id!)
        .order("entered_at", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const markPackedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ status: "packed", packed_at: new Date().toISOString() } as any).eq("id", id!);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: id!, from_status: order?.status, to_status: "packed", changed_by: staff?.id, changed_by_role: staff?.role, reason: `Marked as packed by ${staff?.full_name}` } as any);
      if (staff) await logActivity(staff.id, "order_packed", "order", id!, order?.order_number);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-order", id] }); toast.success("Order marked as packed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ status: "delivered", delivered_at: new Date().toISOString() } as any).eq("id", id!);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: id!, from_status: order?.status, to_status: "delivered", changed_by: staff?.id, changed_by_role: staff?.role, reason: `Marked as delivered by ${staff?.full_name}` } as any);
      if (staff) await logActivity(staff.id, "order_delivered", "order", id!, order?.order_number);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-order", id] }); toast.success("Order marked as delivered"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (showPackingSlip && id) {
    return <PackingSlipWindow orderId={id} onClose={() => setShowPackingSlip(false)} />;
  }

  if (!order) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const address = (order as any).customer_addresses;
  const riskFlags = (order.risk_flags || []) as string[];
  const riskScore = order.risk_score || 0;
  const activeSla = (slaEntries || []).find((s: any) => !s.resolved_at);
  const isEditable = EDITABLE_STATUSES.includes(order.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{order.order_number}</h1>
              <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[order.status] || ""}`}>{STATUS_LABELS[order.status] || order.status}</Badge>
              <Badge variant="outline" className={`text-[10px] ${PAYMENT_STATUS_COLORS[order.payment_status] || ""}`}>{order.payment_status}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">{formatRelativeTime(order.created_at)}</p>
              {activeSla && <SlaTimerBadge targetAt={activeSla.target_at} />}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {order.status === "payment_under_review" && (
            <>
              <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => setPaymentDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setPaymentDialog(true)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </>
          )}
          {(order.status === "confirmed_cod" || order.status === "paid") && (
            <Button size="sm" onClick={() => markPackedMutation.mutate()} disabled={markPackedMutation.isPending}>
              <Package className="h-4 w-4 mr-1" /> Mark Packed
            </Button>
          )}
          {order.status === "packed" && (
            <>
              <Button size="sm" onClick={() => setDeliveryDialog(true)}><Truck className="h-4 w-4 mr-1" /> Assign Delivery</Button>
              <Button size="sm" variant="outline" onClick={() => setShowPackingSlip(true)}><Printer className="h-4 w-4 mr-1" /> Packing Slip</Button>
            </>
          )}
          {order.status === "out_for_delivery" && (
            <>
              <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => markDeliveredMutation.mutate()} disabled={markDeliveredMutation.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Mark Delivered
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setPreselectedTemplate("out_for_delivery"); setSendMessageDialog(true); }}>
                <Send className="h-4 w-4 mr-1" /> Send Update
              </Button>
            </>
          )}
          {order.status === "payment_rejected" && (
            <Button size="sm" variant="outline" onClick={() => { setPreselectedTemplate("payment_rejected"); setSendMessageDialog(true); }}>
              <Mail className="h-4 w-4 mr-1" /> Notify Customer
            </Button>
          )}
          {order.status === "delivered" && (
            <Button size="sm" variant="outline" onClick={() => { setPreselectedTemplate("order_delivered"); setSendMessageDialog(true); }}>
              <Mail className="h-4 w-4 mr-1" /> Send Confirmation
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Items Ordered</CardTitle>
              {isEditable ? (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditItemsDialog(true)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit Items
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </CardHeader>
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
                      <TableCell>{Number(item.unit_price).toLocaleString()} MMK</TableCell>
                      <TableCell className="font-medium">{Number(item.total).toLocaleString()} MMK</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t mt-2 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{Number(order.subtotal || 0).toLocaleString()} MMK</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{Number(order.shipping_cost).toLocaleString()} MMK</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-2">
                    <span className={Number(order.discount) > 0 ? "text-destructive" : ""}>
                      {Number(order.discount) > 0 ? `-${Number(order.discount).toLocaleString()}` : "0"} MMK
                    </span>
                    {isEditable && (
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setDiscountDialog(true)}>
                        <Percent className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{Number(order.total || 0).toLocaleString()} MMK</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Payment Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Method</span><p className="font-medium">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || "—"}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><Badge variant="outline" className={`text-[10px] ${PAYMENT_STATUS_COLORS[order.payment_status] || ""}`}>{order.payment_status}</Badge></p></div>
                {order.payment_reference && <div className="col-span-2"><span className="text-muted-foreground">Reference</span><p className="font-mono text-xs">{order.payment_reference}</p></div>}
                {order.payment_verified_by && <div><span className="text-muted-foreground">Verified At</span><p className="text-xs">{order.payment_verified_at ? formatRelativeTime(order.payment_verified_at) : "—"}</p></div>}
                {order.payment_rejection_reason && <div className="col-span-2"><span className="text-muted-foreground">Rejection Reason</span><p className="text-xs text-destructive">{order.payment_rejection_reason}</p></div>}
              </div>
              {order.payment_proof_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Proof</p>
                  <img src={order.payment_proof_url} alt="Payment proof" className="rounded-lg border max-h-48 object-cover cursor-pointer" onClick={() => setPaymentDialog(true)} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <OrderStatusTimeline orderId={id!} />
            </CardContent>
          </Card>

          {/* Communications */}
          <CommunicationLog orderId={id!} onSendMessage={() => { setPreselectedTemplate(""); setSendMessageDialog(true); }} />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{(order as any).customers?.company_name || (order as any).customers?.name || "—"}</p>
              <p className="text-muted-foreground">{(order as any).customers?.email}</p>
              <p className="text-muted-foreground">{(order as any).customers?.phone}</p>
              {order.contact_name && <p className="text-xs mt-2"><span className="text-muted-foreground">Contact:</span> {order.contact_name} {order.contact_phone && `· ${order.contact_phone}`}</p>}
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Delivery</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {address ? (
                <>
                  <p>{address.address_line}</p>
                  <p className="text-muted-foreground">{[address.township, address.city, address.region].filter(Boolean).join(", ")}</p>
                  {address.contact_phone && <p className="text-muted-foreground">Tel: {address.contact_phone}</p>}
                  {address.delivery_notes && <p className="text-xs mt-2 p-2 bg-muted rounded">{address.delivery_notes}</p>}
                </>
              ) : (
                <p className="text-muted-foreground">No delivery address</p>
              )}
              {order.delivery_zone && <Badge variant="outline" className="text-[10px] mt-2">{order.delivery_zone}</Badge>}
            </CardContent>
          </Card>

          {/* Delivery Tracking */}
          {["out_for_delivery", "delivered"].includes(order.status) && (
            <DeliveryTrackingCard orderId={id!} />
          )}

          {/* SLA Performance */}
          {slaEntries && slaEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-info" /> SLA Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(slaEntries as any[]).map((sla: any) => {
                  const isActive = !sla.resolved_at;
                  const isOverdue = isActive && new Date(sla.target_at).getTime() < Date.now();
                  const resolved = sla.resolved_at;
                  const durationMs = resolved
                    ? new Date(resolved).getTime() - new Date(sla.entered_at).getTime()
                    : Date.now() - new Date(sla.entered_at).getTime();
                  const durationMin = Math.round(durationMs / 60000);

                  return (
                    <div key={sla.id} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        {resolved && !sla.is_breached && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                        {resolved && sla.is_breached && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        {isActive && !isOverdue && <Clock className="h-3.5 w-3.5 text-info" />}
                        {isActive && isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                        <span className="capitalize text-foreground">{sla.queue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <SlaTimerBadge targetAt={sla.target_at} />
                        ) : (
                          <span className={`text-[10px] ${sla.is_breached ? "text-destructive" : "text-success"}`}>
                            {durationMin} min
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Risk Assessment */}
          {riskScore > 0 && (
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-warning" />
                  Risk Assessment — Score: {riskScore}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {riskFlags.map((flag) => (
                  <div key={flag} className="flex items-center gap-2 text-xs">
                    <span className={`h-2 w-2 rounded-full ${riskScore >= 60 ? "bg-destructive" : "bg-warning"}`} />
                    <span className="text-foreground">{RISK_FLAG_LABELS[flag] || flag}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Team Notes */}
          <OrderNotes orderId={id!} />

          {/* Customer Notes */}
          {order.customer_notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Customer Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{order.customer_notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      <PaymentVerificationDialog open={paymentDialog} onOpenChange={setPaymentDialog} order={order} mode="view" />
      <DeliveryAssignDialog open={deliveryDialog} onOpenChange={setDeliveryDialog} order={order} />
      {editItemsDialog && <OrderEditItemsDialog open={editItemsDialog} onOpenChange={setEditItemsDialog} orderId={id!} currentItems={items || []} order={order} />}
      {discountDialog && <ApplyDiscountDialog open={discountDialog} onOpenChange={setDiscountDialog} orderId={id!} order={order} />}
      <SendMessageDialog open={sendMessageDialog} onOpenChange={setSendMessageDialog} order={order} preselectedTemplate={preselectedTemplate} />
    </div>
  );
}
