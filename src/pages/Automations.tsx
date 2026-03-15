import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Zap, Plus, Pencil, Clock, Activity, ListTodo } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AutomationRule = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: Record<string, any> | null;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  priority: number;
  created_at: string;
};

const ORDER_STATUSES = [
  { value: "awaiting_payment_proof", label: "Awaiting Payment Proof" },
  { value: "payment_under_review", label: "Payment Under Review" },
  { value: "payment_rejected", label: "Payment Rejected" },
  { value: "confirmed_cod", label: "Confirmed (COD)" },
  { value: "paid", label: "Paid" },
  { value: "packed", label: "Packed" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const TASK_QUEUES = [
  { value: "payment", label: "Payment" },
  { value: "warehouse", label: "Warehouse" },
  { value: "delivery", label: "Delivery" },
  { value: "crm", label: "CRM" },
  { value: "management", label: "Management" },
];

function describeTrigger(rule: AutomationRule): string {
  const cfg = rule.trigger_config || {};
  if (rule.trigger_type === "time_based") {
    const status = ORDER_STATUSES.find(s => s.value === cfg.status)?.label || cfg.status;
    const mins = cfg.delay_minutes || 0;
    const time = mins >= 1440 ? `${mins / 1440}h` : mins >= 60 ? `${mins / 60}hr` : `${mins}min`;
    return `Order in "${status}" for ${time}`;
  }
  if (rule.trigger_type === "status_change") {
    const status = ORDER_STATUSES.find(s => s.value === cfg.status)?.label || cfg.status;
    return `Order status changes to "${status}"`;
  }
  return rule.trigger_type;
}

function describeAction(rule: AutomationRule): string {
  const cfg = rule.action_config || {};
  switch (rule.action_type) {
    case "send_communication": return `Send email → "${cfg.template_key || "template"}"`;
    case "update_status": return `Update status → "${cfg.target_status || "?"}"`;
    case "create_notification": return `Notify ${cfg.notify_role || "manager"}: "${cfg.title || ""}"`;
    case "create_task": return `Create task → "${cfg.title || ""}" in ${cfg.queue || "crm"} queue`;
    case "flag_order": return "Flag order for approval";
    default: return rule.action_type;
  }
}

const emptyRule = (): Partial<AutomationRule> => ({
  name: "",
  description: "",
  trigger_type: "time_based",
  trigger_config: { status: "awaiting_payment_proof", delay_minutes: 15 },
  conditions: {},
  action_type: "send_communication",
  action_config: { template_key: "" },
  is_active: true,
  priority: 0,
});

export default function Automations() {
  const { staff } = useStaff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editRule, setEditRule] = useState<Partial<AutomationRule> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_rules")
        .select("*")
        .order("priority", { ascending: true });
      return (data || []) as AutomationRule[];
    },
  });

  const { data: taskCount = 0 } = useQuery({
    queryKey: ["crm_tasks_count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("crm_tasks")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]);
      return count || 0;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from("automation_rules").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation_rules"] }),
  });

  const saveMutation = useMutation({
    mutationFn: async (rule: Partial<AutomationRule>) => {
      const payload = {
        name: rule.name!,
        description: rule.description || null,
        trigger_type: rule.trigger_type!,
        trigger_config: rule.trigger_config as any,
        conditions: (rule.conditions || {}) as any,
        action_type: rule.action_type!,
        action_config: rule.action_config as any,
        is_active: rule.is_active ?? true,
        priority: rule.priority ?? 0,
        updated_at: new Date().toISOString(),
      };
      if (rule.id) {
        await supabase.from("automation_rules").update(payload).eq("id", rule.id);
      } else {
        await supabase.from("automation_rules").insert(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation_rules"] });
      setDialogOpen(false);
      toast({ title: "Rule saved" });
    },
  });

  const activeCount = rules.filter(r => r.is_active).length;
  const todayRuns = rules.reduce((s, r) => s + (r.run_count || 0), 0);

  const openEditor = (rule?: AutomationRule) => {
    setEditRule(rule ? { ...rule } : emptyRule());
    setDialogOpen(true);
  };

  const updateField = (path: string, value: any) => {
    setEditRule(prev => {
      if (!prev) return prev;
      if (path.includes(".")) {
        const [parent, key] = path.split(".");
        return { ...prev, [parent]: { ...(prev as any)[parent], [key]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations Engine</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active rules · {todayRuns} total runs · {taskCount} pending tasks
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-2" /> New Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active Rules</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><Activity className="h-5 w-5 text-accent" /></div>
          <div><p className="text-2xl font-bold">{todayRuns}</p><p className="text-xs text-muted-foreground">Total Runs</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><ListTodo className="h-5 w-5 text-warning" /></div>
          <div><p className="text-2xl font-bold">{taskCount}</p><p className="text-xs text-muted-foreground">Pending Tasks</p></div>
        </CardContent></Card>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-sm">Loading rules...</p>}
        {rules.map(rule => (
          <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{rule.name}</h3>
                      <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px]">
                        {rule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">When: {describeTrigger(rule)}</p>
                    <p className="text-sm text-muted-foreground">Then: {describeAction(rule)}</p>
                    {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Conditions: {Object.entries(rule.conditions).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ")}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {rule.run_count || 0} runs</span>
                      {rule.last_run_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(rule.last_run_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEditor(rule)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, is_active: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && rules.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No automation rules yet. Click "New Rule" to create one.
          </CardContent></Card>
        )}
      </div>

      {/* Rule Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRule?.id ? "Edit" : "New"} Automation Rule</DialogTitle>
          </DialogHeader>
          {editRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editRule.name || ""} onChange={e => updateField("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editRule.description || ""} onChange={e => updateField("description", e.target.value)} rows={2} />
              </div>

              {/* Trigger */}
              <div className="space-y-2">
                <Label className="font-semibold">Trigger</Label>
                <RadioGroup value={editRule.trigger_type} onValueChange={v => updateField("trigger_type", v)}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="time_based" id="t1" /><Label htmlFor="t1" className="text-sm">Time-based</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="status_change" id="t2" /><Label htmlFor="t2" className="text-sm">Status Change</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="threshold" id="t3" /><Label htmlFor="t3" className="text-sm">Threshold</Label></div>
                  </div>
                </RadioGroup>
                <div className="space-y-2 mt-2">
                  <Label className="text-sm">Order Status</Label>
                  <Select value={editRule.trigger_config?.status || ""} onValueChange={v => updateField("trigger_config.status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {editRule.trigger_type === "time_based" && (
                    <div className="space-y-1">
                      <Label className="text-sm">Delay (minutes)</Label>
                      <Input type="number" value={editRule.trigger_config?.delay_minutes || ""} onChange={e => updateField("trigger_config.delay_minutes", parseInt(e.target.value) || 0)} />
                    </div>
                  )}
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <Label className="font-semibold">Conditions (optional)</Label>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-sm">Customer LTV minimum (MMK)</Label>
                    <Input type="number" value={editRule.conditions?.min_ltv || ""} onChange={e => updateField("conditions.min_ltv", parseInt(e.target.value) || null)} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={editRule.conditions?.first_time_only || false} onCheckedChange={v => updateField("conditions.first_time_only", v)} />
                      <Label className="text-sm">First-time buyers only</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={editRule.conditions?.cod_only || false} onCheckedChange={v => updateField("conditions.cod_only", v)} />
                      <Label className="text-sm">COD only</Label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Min order total (MMK)</Label>
                    <Input type="number" value={editRule.conditions?.min_total || ""} onChange={e => updateField("conditions.min_total", parseInt(e.target.value) || null)} />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-2">
                <Label className="font-semibold">Action</Label>
                <RadioGroup value={editRule.action_type} onValueChange={v => {
                  updateField("action_type", v);
                  updateField("action_config", {});
                }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="send_communication" id="a1" /><Label htmlFor="a1" className="text-sm">Send Communication</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="update_status" id="a2" /><Label htmlFor="a2" className="text-sm">Update Status</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="create_notification" id="a3" /><Label htmlFor="a3" className="text-sm">Create Notification</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="create_task" id="a4" /><Label htmlFor="a4" className="text-sm">Create Task</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="flag_order" id="a5" /><Label htmlFor="a5" className="text-sm">Flag Order</Label></div>
                  </div>
                </RadioGroup>

                {editRule.action_type === "send_communication" && (
                  <div className="space-y-1 mt-2">
                    <Label className="text-sm">Template Key</Label>
                    <Input value={editRule.action_config?.template_key || ""} onChange={e => updateField("action_config.template_key", e.target.value)} placeholder="e.g. payment_reminder_15min" />
                  </div>
                )}
                {editRule.action_type === "update_status" && (
                  <div className="space-y-1 mt-2">
                    <Label className="text-sm">Target Status</Label>
                    <Select value={editRule.action_config?.target_status || ""} onValueChange={v => updateField("action_config.target_status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {editRule.action_type === "create_notification" && (
                  <div className="space-y-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Notify Role</Label>
                      <Select value={editRule.action_config?.notify_role || "manager"} onValueChange={v => updateField("action_config.notify_role", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Title (supports &#123;&#123;order_number&#125;&#125;)</Label>
                      <Input value={editRule.action_config?.title || ""} onChange={e => updateField("action_config.title", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Priority</Label>
                      <Select value={editRule.action_config?.priority || "normal"} onValueChange={v => updateField("action_config.priority", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {editRule.action_type === "create_task" && (
                  <div className="space-y-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Task Title</Label>
                      <Input value={editRule.action_config?.title || ""} onChange={e => updateField("action_config.title", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Queue</Label>
                      <Select value={editRule.action_config?.queue || "crm"} onValueChange={v => updateField("action_config.queue", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TASK_QUEUES.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Priority</Label>
                      <Select value={editRule.action_config?.priority || "normal"} onValueChange={v => updateField("action_config.priority", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => editRule && saveMutation.mutate(editRule)} disabled={!editRule?.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
