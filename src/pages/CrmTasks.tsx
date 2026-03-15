import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, UserCheck, CheckCircle2, Clock, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const QUEUES = ["all", "my_tasks", "payment", "warehouse", "delivery", "crm", "management"];
const QUEUE_LABELS: Record<string, string> = {
  all: "All", my_tasks: "My Tasks", payment: "Payment",
  warehouse: "Warehouse", delivery: "Delivery", crm: "CRM", management: "Management",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "border-l-destructive",
  high: "border-l-warning",
  normal: "border-l-info",
  low: "border-l-muted-foreground/30",
};

const PRIORITY_BADGES: Record<string, string> = {
  urgent: "destructive",
  high: "default",
  normal: "secondary",
  low: "outline",
};

type CrmTask = {
  id: string;
  title: string;
  description: string | null;
  queue: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  order_id: string | null;
  customer_id: string | null;
  automation_rule_id: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
  orders?: { order_number: string } | null;
  assignee?: { full_name: string } | null;
};

export default function CrmTasks() {
  const { staff } = useStaff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [queue, setQueue] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", queue: "crm", priority: "normal", order_id: "" });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["crm_tasks", queue],
    queryFn: async () => {
      let q = supabase
        .from("crm_tasks")
        .select("*, orders(order_number)")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (queue === "my_tasks") {
        q = q.eq("assigned_to", staff!.id);
      } else if (queue !== "all") {
        q = q.eq("queue", queue);
      }

      const { data } = await q;
      return (data || []) as CrmTask[];
    },
    enabled: !!staff,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff_list_tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_profiles").select("id, full_name").eq("is_active", true);
      return data || [];
    },
  });

  const takeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await supabase.from("crm_tasks").update({
        assigned_to: staff!.id,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_tasks"] }); toast({ title: "Task assigned to you" }); },
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await supabase.from("crm_tasks").update({
        status: "completed",
        completed_by: staff!.id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_tasks"] }); toast({ title: "Task completed" }); },
  });

  const dismissMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await supabase.from("crm_tasks").update({
        status: "dismissed",
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_tasks"] }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("crm_tasks").insert({
        title: newTask.title,
        description: newTask.description || null,
        queue: newTask.queue,
        priority: newTask.priority,
        order_id: newTask.order_id || null,
        status: "open",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_tasks"] });
      setCreateOpen(false);
      setNewTask({ title: "", description: "", queue: "crm", priority: "normal", order_id: "" });
      toast({ title: "Task created" });
    },
  });

  const getAssigneeName = (task: CrmTask) => {
    if (!task.assigned_to) return "Unassigned";
    const s = staffList.find(s => s.id === task.assigned_to);
    return s?.full_name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} open tasks</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Quick Task
        </Button>
      </div>

      <Tabs value={queue} onValueChange={setQueue}>
        <TabsList className="flex-wrap h-auto">
          {QUEUES.map(q => (
            <TabsTrigger key={q} value={q} className="text-xs">{QUEUE_LABELS[q]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-sm">Loading tasks...</p>}
        {tasks.map(task => (
          <Card key={task.id} className={`border-l-4 ${PRIORITY_COLORS[task.priority] || ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={PRIORITY_BADGES[task.priority] as any || "secondary"} className="text-[10px] uppercase">
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{task.queue}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mt-1.5">{task.title}</h3>
                  {task.orders?.order_number && (
                    <button
                      onClick={() => navigate(`/orders/${task.order_id}`)}
                      className="text-sm text-primary hover:underline mt-0.5"
                    >
                      {task.orders.order_number}
                    </button>
                  )}
                  {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <UserCheck className="h-3 w-3" />
                    <span>{getAssigneeName(task)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!task.assigned_to && (
                    <Button size="sm" variant="outline" onClick={() => takeTaskMutation.mutate(task.id)}>
                      Take Task
                    </Button>
                  )}
                  {task.orders?.order_number && (
                    <Button size="sm" variant="ghost" title="View Order" onClick={() => navigate(`/orders/${task.order_id}`)}>
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="default" onClick={() => completeMutation.mutate(task.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => dismissMutation.mutate(task.id)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && tasks.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No open tasks in this queue.
          </CardContent></Card>
        )}
      </div>

      {/* Quick Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quick Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Queue</Label>
                <Select value={newTask.queue} onValueChange={v => setNewTask(p => ({ ...p, queue: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="crm">CRM</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newTask.title || createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
