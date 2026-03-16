import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Truck, Phone, CheckCircle, AlertTriangle, MapPin, Camera, Copy, Package, Navigation } from "lucide-react";

const FAILED_REASONS = [
  "Customer not available",
  "Wrong address",
  "Customer refused delivery",
  "Cannot access location",
  "Package damaged",
  "Other",
];

export default function MyDeliveries() {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("today");
  const [completionDialog, setCompletionDialog] = useState<any>(null);
  const [failedDialog, setFailedDialog] = useState<any>(null);
  const [recipientName, setRecipientName] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [codCollected, setCodCollected] = useState(false);
  const [failedReason, setFailedReason] = useState("");
  const [failedDetails, setFailedDetails] = useState("");

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["my-deliveries", staff?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_assignments")
        .select("*, orders(id, order_number, total, currency, status, payment_method, contact_name, contact_phone, customer_notes, delivery_zone, priority, customer_addresses:delivery_address_id(address_line, township, city, region, contact_phone, delivery_notes))")
        .eq("driver_id", staff!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!staff?.id,
  });

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    if (!assignments) return [];
    if (tab === "today") return assignments.filter((a: any) => {
      const created = (a.assigned_at || a.created_at || "").split("T")[0];
      return created === today && !["delivered", "returned"].includes(a.status);
    });
    if (tab === "upcoming") return assignments.filter((a: any) => {
      const created = (a.assigned_at || a.created_at || "").split("T")[0];
      return created > today && !["delivered", "returned"].includes(a.status);
    });
    return assignments.filter((a: any) => ["delivered", "returned"].includes(a.status));
  }, [assignments, tab, today]);

  const stats = useMemo(() => {
    if (!assignments) return { assigned: 0, inRoute: 0, done: 0 };
    const todayItems = assignments.filter((a: any) => (a.assigned_at || a.created_at || "").split("T")[0] === today);
    return {
      assigned: todayItems.filter((a: any) => a.status === "assigned").length,
      inRoute: todayItems.filter((a: any) => ["in_transit", "arrived"].includes(a.status)).length,
      done: todayItems.filter((a: any) => a.status === "delivered").length,
    };
  }, [assignments, today]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extras, orderId, orderNumber }: { id: string; status: string; extras?: any; orderId?: string; orderNumber?: string }) => {
      const updates: any = { status, ...extras };
      if (status === "in_transit") updates.picked_up_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();

      const { error } = await supabase.from("delivery_assignments").update(updates).eq("id", id);
      if (error) throw error;

      // Tracking log
      const trackingNote = status === "in_transit"
        ? "Package picked up from warehouse"
        : status === "arrived"
        ? "Arrived at delivery location"
        : status === "delivered"
        ? `Delivered to ${extras?.recipient_name || "customer"}`
        : extras?.failed_reason || null;

      await supabase.from("delivery_tracking_log").insert({
        assignment_id: id,
        status,
        note: trackingNote,
        photo_url: extras?.proof_image_url || null,
      } as any);

      // If delivered, update order
      if (status === "delivered" && orderId) {
        const orderUpdates: any = { status: "delivered", delivered_at: new Date().toISOString() };
        if (extras?.codCollected) orderUpdates.payment_status = "collected";
        await supabase.from("orders").update(orderUpdates).eq("id", orderId);
        await supabase.from("order_status_history").insert({
          order_id: orderId,
          from_status: "out_for_delivery",
          to_status: "delivered",
          changed_by: staff?.id,
          changed_by_role: staff?.role,
          reason: `Delivered by ${staff?.full_name}. Received by: ${extras?.recipient_name || "N/A"}`,
        } as any);
        if (staff) await logActivity(staff.id, "order_delivered", "order", orderId, orderNumber, { recipient: extras?.recipient_name });
      }

      // If failed, notify admin + create CRM task
      if (status === "failed" && orderId) {
        // Notify admins
        const { data: admins } = await supabase
          .from("staff_profiles")
          .select("id")
          .in("role", ["admin", "manager", "super_admin"])
          .eq("is_active", true);

        for (const admin of admins || []) {
          await (supabase as any).from("staff_notifications").insert({
            staff_id: admin.id,
            type: "delivery_failed",
            title: `Delivery failed: ${orderNumber}`,
            body: extras?.failed_reason || "Unknown reason",
            link: `/orders/${orderId}`,
          });
        }

        // Create CRM task
        await supabase.from("crm_tasks").insert({
          title: `Reattempt delivery: ${orderNumber}`,
          description: `Failed reason: ${extras?.failed_reason}`,
          queue: "delivery",
          priority: "high",
          order_id: orderId,
        } as any);

        if (staff) await logActivity(staff.id, "delivery_failed", "order", orderId, orderNumber, { reason: extras?.failed_reason });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      toast.success("Status updated");
      setCompletionDialog(null);
      setFailedDialog(null);
      resetForms();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForms = () => {
    setRecipientName("");
    setDriverNotes("");
    setCodCollected(false);
    setFailedReason("");
    setFailedDetails("");
  };

  const handlePhotoUpload = async (assignmentId: string, orderId: string, orderNumber: string, file: File) => {
    const path = `${orderId}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("delivery-proofs").upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("delivery-proofs").getPublicUrl(path);
    updateStatus.mutate({
      id: assignmentId,
      status: "delivered",
      orderId,
      orderNumber,
      extras: { proof_image_url: publicUrl, recipient_name: recipientName, driver_notes: driverNotes, codCollected },
    });
  };

  const copyAddress = (address: any) => {
    const full = [address.address_line, address.township, address.city, address.region].filter(Boolean).join(", ");
    navigator.clipboard.writeText(full);
    toast.success("Address copied");
  };

  const getNextAction = (a: any) => {
    const order = a.orders;
    switch (a.status) {
      case "assigned":
        return (
          <Button className="w-full h-12 text-base" onClick={() => updateStatus.mutate({ id: a.id, status: "in_transit", orderId: order?.id })}>
            <Package className="h-5 w-5 mr-2" /> Start Delivery
          </Button>
        );
      case "in_transit":
        return (
          <Button className="w-full h-12 text-base" variant="secondary" onClick={() => updateStatus.mutate({ id: a.id, status: "arrived", orderId: order?.id })}>
            <Navigation className="h-5 w-5 mr-2" /> I've Arrived
          </Button>
        );
      case "arrived":
        return (
          <Button className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground text-base" onClick={() => { setCodCollected(order?.payment_method === "cod"); setCompletionDialog(a); }}>
            <CheckCircle className="h-5 w-5 mr-2" /> Complete Delivery
          </Button>
        );
      default:
        return null;
    }
  };

  const getBorderColor = (a: any) => {
    const order = a.orders;
    if (order?.payment_method === "cod") return "border-l-4 border-l-destructive";
    if (order?.priority === "same_day") return "border-l-4 border-l-warning";
    if (order?.priority === "urgent") return "border-l-4 border-l-orange-500";
    return "border-l-4 border-l-success";
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">My Deliveries</h1>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-foreground">{stats.assigned}</p><p className="text-xs text-muted-foreground">Assigned</p></CardContent></Card>
        <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-primary">{stats.inRoute}</p><p className="text-xs text-muted-foreground">In Route</p></CardContent></Card>
        <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-success">{stats.done}</p><p className="text-xs text-muted-foreground">Done</p></CardContent></Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Delivery Cards */}
      <div className="space-y-3">
        {filtered.map((a: any) => {
          const order = a.orders;
          const address = order?.customer_addresses;
          const isCod = order?.payment_method === "cod";
          const phone = order?.contact_phone || address?.contact_phone;

          return (
            <Card key={a.id} className={`${getBorderColor(a)} overflow-hidden`}>
              <CardContent className="py-4 space-y-3">
                {/* COD Banner */}
                {isCod && (
                  <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md flex items-center gap-2">
                    <span className="text-sm">💰 COD — Collect</span>
                    <span className="text-lg font-bold ml-auto">{Number(order.total || 0).toLocaleString()} {order.currency}</span>
                  </div>
                )}

                {/* Order Info + Priority */}
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-sm text-foreground">{order?.order_number || "—"}</span>
                  <div className="flex items-center gap-1.5">
                    {order?.priority === "same_day" && <Badge variant="destructive" className="text-[10px]">Same-Day ⚡</Badge>}
                    {order?.priority === "urgent" && <Badge className="text-[10px] bg-orange-500">Urgent</Badge>}
                    <Badge className={`text-[10px] ${a.status === "delivered" ? "bg-success/10 text-success" : a.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {a.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                {/* Address + Copy */}
                {address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium">{address.address_line}</p>
                      <p className="text-muted-foreground text-xs">{[address.township, address.city, address.region].filter(Boolean).join(", ")}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => copyAddress(address)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Phone */}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${phone}`} className="text-sm text-primary font-medium">{phone}</a>
                    <span className="text-xs text-muted-foreground">({order?.contact_name || "Customer"})</span>
                  </div>
                )}

                {/* Delivery notes */}
                {(a.delivery_notes || address?.delivery_notes) && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    📝 {a.delivery_notes || address?.delivery_notes}
                  </p>
                )}

                {/* Amount (non-COD) */}
                {!isCod && order?.total && (
                  <p className="text-sm text-muted-foreground">{Number(order.total).toLocaleString()} {order.currency}</p>
                )}

                {/* Proof (completed) */}
                {a.proof_image_url && (
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <a href={a.proof_image_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View Proof</a>
                    {a.recipient_name && <span className="text-xs text-muted-foreground">• {a.recipient_name}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <div className="flex-1">{getNextAction(a)}</div>
                  {!["delivered", "returned", "failed"].includes(a.status) && (
                    <Button variant="destructive" size="icon" className="h-12 w-12 shrink-0" onClick={() => setFailedDialog(a)}>
                      <AlertTriangle className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No deliveries {tab === "today" ? "for today" : tab === "upcoming" ? "upcoming" : "completed"}</p>
          </div>
        )}
      </div>

      {/* Completion Dialog */}
      <Dialog open={!!completionDialog} onOpenChange={() => { setCompletionDialog(null); resetForms(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Delivery</DialogTitle></DialogHeader>
          {completionDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Order: <strong>{completionDialog.orders?.order_number}</strong></p>

              <div><Label>Received by (required)</Label><Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Name of person receiving" className="mt-1" /></div>

              <div>
                <Label>📸 Delivery Photo Proof</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-1" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file && file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
                  if (file) handlePhotoUpload(completionDialog.id, completionDialog.order_id, completionDialog.orders?.order_number, file);
                }} />
              </div>

              <div><Label>Driver Notes (optional)</Label><Textarea value={driverNotes} onChange={e => setDriverNotes(e.target.value)} rows={2} placeholder="Any notes…" className="mt-1" /></div>

              {completionDialog.orders?.payment_method === "cod" && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                  <Checkbox id="cod-check" checked={codCollected} onCheckedChange={(c) => setCodCollected(!!c)} />
                  <Label htmlFor="cod-check" className="text-destructive font-bold text-lg cursor-pointer">
                    Cash collected: {Number(completionDialog.orders.total || 0).toLocaleString()} MMK
                  </Label>
                </div>
              )}

              <Button className="w-full h-12" onClick={() => updateStatus.mutate({
                id: completionDialog.id,
                status: "delivered",
                orderId: completionDialog.order_id,
                orderNumber: completionDialog.orders?.order_number,
                extras: { recipient_name: recipientName, driver_notes: driverNotes, codCollected },
              })} disabled={updateStatus.isPending || !recipientName.trim()}>
                <CheckCircle className="h-5 w-5 mr-2" /> Confirm Delivery
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Failed Dialog */}
      <Dialog open={!!failedDialog} onOpenChange={() => { setFailedDialog(null); resetForms(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Delivery Issue</DialogTitle></DialogHeader>
          {failedDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Order: <strong>{failedDialog.orders?.order_number}</strong></p>

              <div>
                <Label>Reason</Label>
                <Select value={failedReason} onValueChange={setFailedReason}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select reason…" /></SelectTrigger>
                  <SelectContent>
                    {FAILED_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div><Label>Details</Label><Textarea value={failedDetails} onChange={e => setFailedDetails(e.target.value)} rows={2} placeholder="Additional details…" className="mt-1" /></div>

              <div>
                <Label>📸 Photo Evidence (optional)</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-1" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
                  const path = `${failedDialog.order_id}/failed-${Date.now()}.${file.name.split(".").pop()}`;
                  const { error } = await supabase.storage.from("delivery-proofs").upload(path, file, { upsert: true });
                  if (error) toast.error(error.message);
                  else toast.success("Photo uploaded");
                }} />
              </div>

              <Button variant="destructive" className="w-full h-12" onClick={() => updateStatus.mutate({
                id: failedDialog.id,
                status: "failed",
                orderId: failedDialog.order_id,
                orderNumber: failedDialog.orders?.order_number,
                extras: { failed_reason: `${failedReason}: ${failedDetails}`.trim() },
              })} disabled={updateStatus.isPending || !failedReason}>
                <AlertTriangle className="h-5 w-5 mr-2" /> Report Issue
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
