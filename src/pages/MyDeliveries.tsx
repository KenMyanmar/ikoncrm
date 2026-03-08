import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Truck, Camera, CheckCircle } from "lucide-react";

const STATUS_FLOW: Record<string, string[]> = {
  assigned: ["picked_up"],
  picked_up: ["in_transit"],
  in_transit: ["delivered", "failed"],
  failed: ["in_transit", "returned"],
};

const statusColor: Record<string, string> = {
  assigned: "bg-muted text-muted-foreground",
  picked_up: "bg-primary/10 text-primary",
  in_transit: "bg-accent/10 text-accent",
  delivered: "bg-green-500/10 text-green-600",
  failed: "bg-destructive/10 text-destructive",
  returned: "bg-muted text-muted-foreground",
};

export default function MyDeliveries() {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [podDialog, setPodDialog] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [recipientName, setRecipientName] = useState("");

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["my-deliveries", staff?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_assignments")
        .select("*, orders(order_number, total, currency, status)")
        .eq("driver_id", staff!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!staff?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extras }: { id: string; status: string; extras?: any }) => {
      const updates: any = { status, ...extras };
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "picked_up") updates.pickup_at = new Date().toISOString();
      const { error } = await supabase.from("delivery_assignments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      toast.success("Status updated");
      setPodDialog(null);
      setNotes("");
      setRecipientName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePodUpload = async (assignmentId: string, file: File) => {
    const path = `delivery-pod/${assignmentId}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    updateStatus.mutate({
      id: assignmentId,
      status: "delivered",
      extras: { proof_image_url: publicUrl, delivery_notes: notes, recipient_name: recipientName },
    });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">My Deliveries</h1>
        <Badge variant="secondary">{assignments?.length || 0} assignments</Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assignments || []).map((a: any) => {
                const nextStatuses = STATUS_FLOW[a.status] || [];
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.orders?.order_number || "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.orders?.total ? `${Number(a.orders.total).toLocaleString()} ${a.orders.currency}` : ""}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[a.status] || ""}>{a.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{a.pickup_at ? new Date(a.pickup_at).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-xs">{a.delivered_at ? new Date(a.delivered_at).toLocaleString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {nextStatuses.map(s =>
                          s === "delivered" ? (
                            <Button key={s} size="sm" variant="default" onClick={() => setPodDialog(a)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Deliver
                            </Button>
                          ) : (
                            <Button key={s} size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: s })} disabled={updateStatus.isPending}>
                              {s.replace("_", " ")}
                            </Button>
                          )
                        )}
                        {a.proof_image_url && (
                          <a href={a.proof_image_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                            <Camera className="h-3 w-3" /> POD
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!assignments || assignments.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No deliveries assigned</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!podDialog} onOpenChange={() => setPodDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delivery</DialogTitle></DialogHeader>
          {podDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Order: <strong>{podDialog.orders?.order_number}</strong></p>
              <div><Label>Recipient Name</Label><Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Name of person receiving" /></div>
              <div><Label>Delivery Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any notes..." /></div>
              <div>
                <Label>Proof of Delivery Photo</Label>
                <Input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePodUpload(podDialog.id, file);
                }} />
              </div>
              <Button className="w-full" onClick={() => updateStatus.mutate({
                id: podDialog.id, status: "delivered",
                extras: { delivery_notes: notes, recipient_name: recipientName },
              })} disabled={updateStatus.isPending}>
                Mark Delivered (without photo)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
