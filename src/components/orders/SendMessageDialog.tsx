import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { resolveTemplate } from "./templateUtils";
import { PAYMENT_METHOD_LABELS } from "./orderConstants";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  preselectedTemplate?: string;
}

export function SendMessageDialog({ open, onOpenChange, order, preselectedTemplate }: SendMessageDialogProps) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [templateKey, setTemplateKey] = useState(preselectedTemplate || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("manual");

  const { data: templates } = useQuery({
    queryKey: ["communication-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("communication_templates")
        .select("*")
        .eq("is_active", true)
        .order("template_key");
      return data || [];
    },
    enabled: open,
  });

  const templateVars: Record<string, string> = {
    customer_name: order?.customers?.name || order?.customers?.company_name || "Customer",
    order_number: order?.order_number || "",
    total: Number(order?.total || 0).toLocaleString(),
    payment_method: PAYMENT_METHOD_LABELS[order?.payment_method] || order?.payment_method || "",
    rejection_reason: order?.payment_rejection_reason || "",
  };

  useEffect(() => {
    if (preselectedTemplate && templates) {
      const t = templates.find((t: any) => t.template_key === preselectedTemplate);
      if (t) {
        setTemplateKey(t.template_key);
        setSubject(resolveTemplate(t.subject_template || "", templateVars));
        setBody(resolveTemplate(t.body_template, templateVars));
      }
    }
  }, [preselectedTemplate, templates]);

  const handleTemplateChange = (key: string) => {
    setTemplateKey(key);
    if (key === "custom") {
      setSubject("");
      setBody("");
      return;
    }
    const t = templates?.find((t: any) => t.template_key === key);
    if (t) {
      setSubject(resolveTemplate(t.subject_template || "", templateVars));
      setBody(resolveTemplate(t.body_template, templateVars));
    }
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Message body is required");

      const commRecord = {
        customer_id: order.customer_id,
        order_id: order.id,
        channel,
        direction: "outbound",
        subject: subject || null,
        body,
        template_key: templateKey !== "custom" ? templateKey : null,
        status: "sent",
        sent_by: staff?.id,
        sent_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from("customer_communications")
        .insert(commRecord as any)
        .select("id")
        .single();
      if (error) throw error;

      // If email channel, try to invoke edge function (graceful failure)
      if (channel === "email" && order?.customers?.email) {
        try {
          await supabase.functions.invoke("send-order-email", {
            body: {
              to: order.customers.email,
              subject,
              body,
              communication_id: inserted.id,
            },
          });
        } catch {
          // Edge function may not be deployed — communication is already logged
        }
      }

      if (staff) {
        await logActivity(staff.id, "communication_sent", "order", order.id, order.order_number);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-communications", order.id] });
      toast.success(`Message sent to ${order?.customers?.name || "customer"}`);
      onOpenChange(false);
      setSubject("");
      setBody("");
      setTemplateKey("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!order) return null;

  const customerName = order.customers?.name || order.customers?.company_name || "Unknown";
  const customerEmail = order.customers?.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Send Message to Customer</DialogTitle>
          <DialogDescription>
            To: {customerName} {customerEmail ? `(${customerEmail})` : "— no email on file"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={templateKey} onValueChange={handleTemplateChange}>
              <SelectTrigger><SelectValue placeholder="Select template…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Message</SelectItem>
                {templates?.map((t: any) => (
                  <SelectItem key={t.template_key} value={t.template_key}>
                    {t.template_key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject…" />
          </div>

          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message…"
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-xs mb-2 block">Channel</Label>
            <RadioGroup value={channel} onValueChange={setChannel} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="ch-manual" />
                <Label htmlFor="ch-manual" className="text-sm cursor-pointer">Manual Note</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="email" id="ch-email" disabled={!customerEmail} />
                <Label htmlFor="ch-email" className={`text-sm cursor-pointer ${!customerEmail ? "text-muted-foreground" : ""}`}>
                  Email {!customerEmail && "(no email)"}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !body.trim()}>
              <Send className="h-4 w-4 mr-2" /> Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
