import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Bot, Send, ChevronDown, ChevronUp } from "lucide-react";
import { formatRelativeTime } from "./orderConstants";
import { useState } from "react";

interface CommunicationLogProps {
  orderId: string;
  onSendMessage: () => void;
}

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  manual: MessageSquare,
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-success/10 text-success" },
  delivered: { label: "Delivered", className: "bg-success/10 text-success" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  read: { label: "Read", className: "bg-info/10 text-info" },
};

export function CommunicationLog({ orderId, onSendMessage }: CommunicationLogProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: communications } = useQuery({
    queryKey: ["order-communications", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_communications")
        .select("*, staff_profiles:sent_by(full_name)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Communications</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSendMessage}>
          <Send className="h-3 w-3 mr-1" /> Send Message
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {(!communications || communications.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">No communications yet</p>
        )}
        {communications?.map((comm) => {
          const Icon = CHANNEL_ICONS[comm.channel] || MessageSquare;
          const statusInfo = STATUS_BADGE[comm.status] || STATUS_BADGE.sent;
          const isExpanded = expandedIds.has(comm.id);
          const isAuto = !!comm.template_key && !comm.sent_by;
          const bodyPreview = comm.body?.length > 100 && !isExpanded
            ? comm.body.slice(0, 100) + "…"
            : comm.body;

          return (
            <div key={comm.id} className="border rounded-lg p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{comm.subject || "No subject"}</span>
                  {isAuto && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Bot className="h-3 w-3" /> Auto
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusInfo.className}`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {comm.staff_profiles?.full_name || (isAuto ? "System (auto)" : "Staff")} · {formatRelativeTime(comm.created_at)}
              </p>
              <p className="text-sm text-foreground whitespace-pre-line">{bodyPreview}</p>
              {comm.body?.length > 100 && (
                <button
                  onClick={() => toggle(comm.id)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
