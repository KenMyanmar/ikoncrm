import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Phone, MapPin, Camera, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const STATUS_ICONS: Record<string, any> = {
  assigned: Clock,
  picked_up: Package,
  in_transit: Truck,
  arrived: MapPin,
  delivered: CheckCircle,
  failed: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-muted text-muted-foreground",
  picked_up: "bg-primary/10 text-primary",
  in_transit: "bg-accent/10 text-accent-foreground",
  arrived: "bg-info/10 text-info",
  delivered: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

interface DeliveryTrackingCardProps {
  orderId: string;
  order?: { payment_method?: string | null; payment_status?: string; total?: number | null; currency?: string };
}

export function DeliveryTrackingCard({ orderId, order }: DeliveryTrackingCardProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: assignment } = useQuery({
    queryKey: ["delivery-assignment", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_assignments")
        .select("*, staff_profiles!delivery_assignments_driver_id_fkey(full_name, phone)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const { data: trackingLog } = useQuery({
    queryKey: ["delivery-tracking-log", assignment?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_tracking_log")
        .select("*")
        .eq("assignment_id", assignment!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!assignment?.id,
  });

  if (!assignment) return null;

  const driver = (assignment as any).staff_profiles;
  const driverPhone = driver?.phone;
  const proofUrl = assignment.proof_image_url || assignment.delivery_proof_url;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Delivery Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Driver Info */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-foreground">{driver?.full_name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                Assigned {new Date(assignment.assigned_at || assignment.created_at!).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className={STATUS_COLORS[assignment.status] || ""}>
                {assignment.status.replace(/_/g, " ")}
              </Badge>
              {driverPhone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${driverPhone}`}><Phone className="h-3 w-3" /></a>
                </Button>
              )}
            </div>
          </div>

          {/* Recipient */}
          {assignment.recipient_name && (
            <p className="text-xs text-muted-foreground">
              Received by: <span className="text-foreground font-medium">{assignment.recipient_name}</span>
            </p>
          )}

          {/* Proof thumbnail */}
          {proofUrl && (
            <div
              className="cursor-pointer rounded-md border overflow-hidden w-20 h-20"
              onClick={() => setLightboxUrl(proofUrl)}
            >
              <img src={proofUrl} alt="Delivery proof" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Timeline */}
          {trackingLog && trackingLog.length > 0 && (
            <div className="space-y-0">
              {trackingLog.map((entry: any, i: number) => {
                const Icon = STATUS_ICONS[entry.status] || Clock;
                const isFirst = i === 0;
                return (
                  <div key={entry.id} className="flex gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-1 ${isFirst ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      {i < trackingLog.length - 1 && <div className="w-px flex-1 bg-border min-h-[16px]" />}
                    </div>
                    <div className="pb-3">
                      <p className={`text-xs font-medium capitalize ${isFirst ? "text-foreground" : "text-muted-foreground"}`}>
                        {entry.status.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                      {entry.note && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.note}</p>}
                      {entry.photo_url && (
                        <div
                          className="mt-1 cursor-pointer rounded border overflow-hidden w-12 h-12"
                          onClick={() => setLightboxUrl(entry.photo_url)}
                        >
                          <img src={entry.photo_url} alt="Photo" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Failed reason */}
          {assignment.status === "failed" && assignment.failed_reason && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
              <strong>Failed:</strong> {assignment.failed_reason}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Delivery proof" className="w-full rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
