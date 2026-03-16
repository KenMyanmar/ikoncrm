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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Zap, Plus, Pencil, Clock, Activity, ListTodo, Monitor, RefreshCw, CheckCircle, XCircle, Copy } from "lucide-react";
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

// ── Monitor Tab ──────────────────────────────────────────────

function AutomationMonitor() {
  const [hours, setHours] = useState(24);
  const TIME_OPTIONS = [
    { value: 1, label: "1h" },
    { value: 6, label: "6h" },
    { value: 24, label: "24h" },
    { value: 168, label: "7d" },
  ];
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["automation_stats", hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_automation_stats", { p_hours: hours });
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30_000,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["automation_execution_log", hours, resultFilter, triggerFilter],
    queryFn: async () => {
      let q = supabase
        .from("automation_execution_log")
        .select("*, orders(order_number)")
        .gte("created_at", new Date(Date.now() - hours * 3600_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(100);
      if (resultFilter !== "all") q = q.eq("action_result", resultFilter);
      if (triggerFilter !== "all") q = q.eq("trigger_type", triggerFilter);
      const { data } = await q;
      return data || [];
    },
    refetchInterval: 30_000,
  });

  const summary = stats || {};
  const autoSend = summary.auto_send || { success: 0, failed: 0, deduped: 0 };
  const statusRules = summary.status_rules || { success: 0, failed: 0, deduped: 0 };
  const timeRules = summary.time_rules || { success: 0, failed: 0, deduped: 0 };
  const total = (autoSend.success + autoSend.failed + autoSend.deduped +
    statusRules.success + statusRules.failed + statusRules.deduped +
    timeRules.success + timeRules.failed + timeRules.deduped);
  const ruleBreakdown: any[] = summary.rule_breakdown || [];
  const templateBreakdown: any[] = summary.template_breakdown || [];

  const resultBadge = (result: string) => {
    switch (result) {
      case "success": return <Badge className="bg-emerald-500/15 text-emerald-700 border-0 text-[10px]">Success</Badge>;
      case "failed": return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      case "duplicate_prevented": return <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[10px]">Deduped</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{result}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Time range */}
      <div className="flex items-center gap-2">
        {TIME_OPTIONS.map(t => (
          <Button
            key={t.value}
            size="sm"
            variant={hours === t.value ? "default" : "outline"}
            onClick={() => setHours(t.value)}
          >
            {t.label}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">Auto-refreshes every 30s</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Auto-Send (DB Trigger)</p>
          <p className="text-xl font-bold">{autoSend.success} <span className="text-sm font-normal text-muted-foreground">sent</span></p>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span className="text-destructive">{autoSend.failed} failed</span>
            <span className="text-amber-600">{autoSend.deduped} deduped</span>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Status Rules (DB Trigger)</p>
          <p className="text-xl font-bold">{statusRules.success} <span className="text-sm font-normal text-muted-foreground">fired</span></p>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span className="text-destructive">{statusRules.failed} failed</span>
            <span className="text-amber-600">{statusRules.deduped} deduped</span>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Time Rules (Client)</p>
          <p className="text-xl font-bold">{timeRules.success} <span className="text-sm font-normal text-muted-foreground">fired</span></p>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span className="text-destructive">{timeRules.failed} failed</span>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Executions</p>
          <p className="text-xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">Last {hours}h</p>
        </CardContent></Card>
      </div>

      {/* Breakdowns */}
      {ruleBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Rule Breakdown</p>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Deduped</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ruleBreakdown.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.rule_name || r.automation_rule_id?.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.trigger_type}</Badge></TableCell>
                    <TableCell className="text-right text-emerald-600">{r.success || 0}</TableCell>
                    <TableCell className="text-right text-destructive">{r.failed || 0}</TableCell>
                    <TableCell className="text-right text-amber-600">{r.deduped || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {templateBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Template Breakdown</p>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Template Key</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Deduped</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {templateBreakdown.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{t.template_key}</TableCell>
                    <TableCell className="text-right text-emerald-600">{t.success || 0}</TableCell>
                    <TableCell className="text-right text-destructive">{t.failed || 0}</TableCell>
                    <TableCell className="text-right text-amber-600">{t.deduped || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Execution Log */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Execution Log</p>
            <div className="flex gap-2">
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Result" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="duplicate_prevented">Deduped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={triggerFilter} onValueChange={setTriggerFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Trigger" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Triggers</SelectItem>
                  <SelectItem value="auto_send">Auto-Send</SelectItem>
                  <SelectItem value="status_change_rule">Status Rule</SelectItem>
                  <SelectItem value="time_based_rule">Time Rule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No executions in this time range.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{log.trigger_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {(log.orders as any)?.order_number || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{log.action_type}</TableCell>
                      <TableCell>{resultBadge(log.action_result)}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {log.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

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

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">
            <Zap className="h-4 w-4 mr-1.5" /> Rules
          </TabsTrigger>
          <TabsTrigger value="monitor">
            <Monitor className="h-4 w-4 mr-1.5" /> Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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
                          {rule.trigger_type === "status_change" && (
                            <Badge variant="outline" className="text-[10px]">DB Trigger</Badge>
                          )}
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
        </TabsContent>

        <TabsContent value="monitor">
          <AutomationMonitor />
        </TabsContent>
      </Tabs>

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
                      <Label className="text-sm">Title (supports {"{{order_number}}"})</Label>
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
