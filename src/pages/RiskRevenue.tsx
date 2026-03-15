import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Shield, AlertTriangle, ChevronDown, TrendingDown, DollarSign, Ban,
  CheckCircle, XCircle, Pause,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600 bg-green-50 border-green-200",
  normal: "text-amber-600 bg-amber-50 border-amber-200",
  elevated: "text-red-600 bg-red-50 border-red-200",
  high: "text-red-800 bg-red-100 border-red-400",
};

function riskBadge(score: number) {
  if (score >= 60) return <Badge className="bg-red-700 text-white animate-pulse text-[10px]">⛔ {score}</Badge>;
  if (score >= 40) return <Badge className="bg-destructive text-destructive-foreground text-[10px]">🔴 {score}</Badge>;
  if (score >= 20) return <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">🟡 {score}</Badge>;
  return <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">🟢 {score}</Badge>;
}

const REFUND_REASONS = [
  "Product damaged", "Wrong item delivered", "Customer not satisfied",
  "Duplicate order", "Delivery failed (no reattempt)", "Other",
];

const FRAUD_FLAG_LABELS: Record<string, string> = {
  suspicious_activity: "Suspicious activity",
  repeat_cod_failures: "Repeat COD failures",
  address_inconsistency: "Address inconsistency",
  payment_fraud: "Payment fraud",
  abusive_returns: "Abusive returns",
};

export default function RiskRevenue() {
  const { staff } = useStaff();
  const _qc = useQueryClient();
  const role = staff?.role || "viewer";
  const canApprove = ["manager", "admin", "super_admin"].includes(role);
  const canApproveHigh = ["admin", "super_admin"].includes(role);

  // ── Stats ──
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartISO = weekStart.toISOString();

  const { data: stats } = useQuery({
    queryKey: ["risk-stats"],
    queryFn: async () => {
      const [flagged, pending, refunds, revenue] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).or("risk_score.gte.20,requires_approval.eq.true"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("requires_approval", true).is("approved_at", null),
        supabase.from("order_refunds").select("amount").gte("created_at", weekStartISO),
        supabase.from("orders").select("total").gte("created_at", weekStartISO).not("status", "in", '("cancelled","expired")'),
      ]);
      const refundSum = (refunds.data || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const revenueSum = (revenue.data || []).reduce((s, r) => s + Number(r.total || 0), 0);
      return {
        flagged: flagged.count || 0,
        pending: pending.count || 0,
        refundWeek: refundSum,
        revenueWeek: revenueSum - refundSum,
      };
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Risk & Revenue</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Flagged Orders" value={stats?.flagged ?? 0} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <StatCard label="Pending Approval" value={stats?.pending ?? 0} icon={<Pause className="h-4 w-4 text-orange-500" />} />
        <StatCard label="Refunds This Week" value={`${((stats?.refundWeek || 0) / 1000).toFixed(0)}K`} icon={<TrendingDown className="h-4 w-4 text-destructive" />} />
        <StatCard label="Net Revenue (Week)" value={`${((stats?.revenueWeek || 0) / 1e6).toFixed(1)}M`} icon={<DollarSign className="h-4 w-4 text-green-600" />} />
      </div>

      <Tabs defaultValue="risk" className="space-y-3">
        <TabsList className="flex-wrap">
          <TabsTrigger value="risk">Risk Monitor</TabsTrigger>
          <TabsTrigger value="refunds">Refund Control</TabsTrigger>
          <TabsTrigger value="discounts">Discount Approvals</TabsTrigger>
          <TabsTrigger value="cod">COD Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Protection</TabsTrigger>
        </TabsList>

        <TabsContent value="risk"><RiskMonitorTab canApprove={canApprove} staffId={staff?.id} /></TabsContent>
        <TabsContent value="refunds"><RefundControlTab canApprove={canApprove} canApproveHigh={canApproveHigh} staffId={staff?.id} /></TabsContent>
        <TabsContent value="discounts"><DiscountApprovalsTab canApprove={canApprove} staffId={staff?.id} /></TabsContent>
        <TabsContent value="cod"><CodAnalyticsTab /></TabsContent>
        <TabsContent value="revenue"><RevenueProtectionTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════ TAB 1: RISK MONITOR ═══════════════════════
function RiskMonitorTab({ canApprove, staffId }: { canApprove: boolean; staffId?: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: flaggedOrders } = useQuery({
    queryKey: ["risk-flagged-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, payment_method, risk_score, risk_flags, requires_approval, approved_at, customer_id, customers(id, name, company_name, risk_tier, fraud_flags, total_cod_orders, total_cod_delivered, total_failed_deliveries, total_cancelled_orders)")
        .or("risk_score.gte.20,requires_approval.eq.true")
        .order("risk_score", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const approveMut = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").update({
        requires_approval: false,
        approved_by: staffId,
        approved_at: new Date().toISOString(),
      }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risk-flagged-orders"] }); qc.invalidateQueries({ queryKey: ["risk-stats"] }); toast.success("Order approved"); },
  });

  const holdMut = useMutation({
    mutationFn: async (order: any) => {
      await supabase.from("crm_tasks").insert({
        title: `Review risky order ${order.order_number}`,
        queue: "risk",
        priority: "high",
        order_id: order.id,
        customer_id: order.customer_id,
      });
    },
    onSuccess: () => toast.success("Task created for manager review"),
  });

  const cancelMut = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { error } = await supabase.from("orders").update({ status: "cancelled", cancelled_reason: reason, cancelled_by: staffId }).eq("id", orderId);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: orderId, to_status: "cancelled", changed_by: staffId, reason });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risk-flagged-orders"] }); setCancelDialog(null); toast.success("Order cancelled"); },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Flagged Orders</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead><TableHead>Customer</TableHead><TableHead>Risk</TableHead>
              <TableHead>Flags</TableHead><TableHead>Total</TableHead><TableHead>Payment</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(flaggedOrders || []).map((o: any) => {
              const cust = o.customers;
              return (
                <Collapsible key={o.id} open={expanded === o.id} onOpenChange={(open) => setExpanded(open ? o.id : null)} asChild>
                  <>
                    <TableRow>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="text-xs">{cust?.company_name || cust?.name || "—"}</TableCell>
                      <TableCell>{riskBadge(o.risk_score || 0)}</TableCell>
                      <TableCell className="text-[10px] max-w-[150px] truncate">{(o.risk_flags || []).join(", ")}</TableCell>
                      <TableCell className="text-xs font-medium">{o.total ? `${Number(o.total).toLocaleString()} MMK` : "—"}</TableCell>
                      <TableCell className="text-xs">{o.payment_method || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{o.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {o.requires_approval && !o.approved_at && canApprove && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => approveMut.mutate(o.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" />Approve
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => holdMut.mutate(o)}>
                            <Pause className="h-3 w-3 mr-1" />Hold
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={() => setCancelDialog(o)}>
                            <Ban className="h-3 w-3 mr-1" />Cancel
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><ChevronDown className="h-3 w-3" /></Button>
                          </CollapsibleTrigger>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={8}>
                          {cust && <CustomerRiskProfile customer={cust} />}
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              );
            })}
            {(flaggedOrders || []).length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No flagged orders</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        {/* Cancel dialog */}
        <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cancel Order {cancelDialog?.order_number}</DialogTitle></DialogHeader>
            <Textarea placeholder="Cancellation reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialog(null)}>Back</Button>
              <Button variant="destructive" onClick={() => cancelMut.mutate({ orderId: cancelDialog.id, reason: cancelReason })} disabled={!cancelReason}>Cancel Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function CustomerRiskProfile({ customer }: { customer: any }) {
  const codSuccess = customer.total_cod_orders ? Math.round((customer.total_cod_delivered || 0) / customer.total_cod_orders * 100) : 100;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-2 text-xs">
      <div><span className="text-muted-foreground">Risk Tier:</span> <Badge variant="outline" className={RISK_COLORS[customer.risk_tier] || ""}>{customer.risk_tier || "normal"}</Badge></div>
      <div><span className="text-muted-foreground">COD Orders:</span> {customer.total_cod_orders || 0}</div>
      <div><span className="text-muted-foreground">COD Success:</span> <span className={codSuccess < 50 ? "text-destructive font-bold" : ""}>{codSuccess}%</span></div>
      <div><span className="text-muted-foreground">Failed Deliveries:</span> {customer.total_failed_deliveries || 0}</div>
      <div><span className="text-muted-foreground">Cancellations:</span> {customer.total_cancelled_orders || 0}</div>
      {(customer.fraud_flags || []).length > 0 && (
        <div className="col-span-full"><span className="text-muted-foreground">Fraud Flags:</span> {customer.fraud_flags.map((f: string) => <Badge key={f} variant="destructive" className="text-[9px] ml-1">{FRAUD_FLAG_LABELS[f] || f}</Badge>)}</div>
      )}
    </div>
  );
}

// ═══════════════════════ TAB 2: REFUND CONTROL ═══════════════════════
function RefundControlTab({ canApprove, canApproveHigh, staffId }: { canApprove: boolean; canApproveHigh: boolean; staffId?: string }) {
  const qc = useQueryClient();
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("original");
  const [customReason, setCustomReason] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["refund-order-search", orderSearch],
    queryFn: async () => {
      if (orderSearch.length < 3) return [];
      const { data } = await supabase.from("orders").select("id, order_number, total, customer_id, customers(name, company_name)").ilike("order_number", `%${orderSearch}%`).limit(5);
      return data || [];
    },
    enabled: orderSearch.length >= 3,
  });

  const { data: pendingRefunds } = useQuery({
    queryKey: ["pending-refunds"],
    queryFn: async () => {
      const { data } = await supabase.from("order_refunds").select("*, orders(order_number, customer_id, customers(name, company_name)), requested_staff:requested_by(full_name)").eq("status", "pending").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const { data: weeklyTotal } = useQuery({
    queryKey: ["refund-weekly-total"],
    queryFn: async () => {
      const { data } = await supabase.from("order_refunds").select("amount").gte("created_at", weekStart.toISOString()).in("status", ["pending", "approved"]);
      return (data || []).reduce((s, r) => s + Number(r.amount), 0);
    },
  });

  const submitRefund = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      const finalReason = reason === "Other" ? customReason : reason;
      const autoApprove = amt < 100000;
      const { error } = await supabase.from("order_refunds").insert({
        order_id: selectedOrder.id,
        amount: amt,
        reason: finalReason,
        refund_method: method,
        requested_by: staffId,
        status: autoApprove ? "approved" : "pending",
        ...(autoApprove ? { approved_by: staffId, processed_at: new Date().toISOString() } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-refunds"] });
      qc.invalidateQueries({ queryKey: ["refund-weekly-total"] });
      setSelectedOrder(null); setAmount(""); setReason(""); setCustomReason("");
      toast.success(Number(amount) < 100000 ? "Refund auto-approved" : "Refund submitted for approval");
    },
  });

  const approveRefund = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      await supabase.from("order_refunds").update({
        status: approve ? "approved" : "rejected",
        approved_by: staffId,
        processed_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pending-refunds"] }); qc.invalidateQueries({ queryKey: ["risk-stats"] }); toast.success("Refund updated"); },
  });

  return (
    <div className="space-y-4">
      {/* Request form */}
      <Card>
        <CardHeader><CardTitle className="text-sm">New Refund Request</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Search Order</Label>
            <Input placeholder="IKON-..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
            {(searchResults || []).length > 0 && !selectedOrder && (
              <div className="border rounded mt-1 max-h-32 overflow-auto">
                {searchResults!.map((o: any) => (
                  <button key={o.id} className="w-full text-left px-3 py-2 hover:bg-muted text-xs" onClick={() => { setSelectedOrder(o); setOrderSearch(o.order_number); }}>
                    {o.order_number} — {o.customers?.company_name || o.customers?.name} — {Number(o.total).toLocaleString()} MMK
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (MMK)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} max={selectedOrder?.total} />
              {selectedOrder && <p className="text-[10px] text-muted-foreground mt-1">Max: {Number(selectedOrder.total).toLocaleString()} MMK</p>}
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>{REFUND_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              {reason === "Other" && <Input className="mt-1" placeholder="Specify..." value={customReason} onChange={e => setCustomReason(e.target.value)} />}
            </div>
          </div>
          <div>
            <Label className="text-xs">Refund Method</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="flex gap-4 mt-1">
              {["original", "store_credit", "cash", "bank_transfer"].map(m => (
                <div key={m} className="flex items-center gap-1"><RadioGroupItem value={m} id={`rm-${m}`} /><Label htmlFor={`rm-${m}`} className="text-xs capitalize">{m.replace("_", " ")}</Label></div>
              ))}
            </RadioGroup>
          </div>
          <Button size="sm" disabled={!selectedOrder || !amount || !reason || (reason === "Other" && !customReason)} onClick={() => submitRefund.mutate()}>Submit for Approval</Button>
        </CardContent>
      </Card>

      {/* Approval queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Refund Approval Queue</CardTitle>
            <p className="text-xs text-muted-foreground">This week: <span className="font-bold text-foreground">{((weeklyTotal || 0) / 1000).toFixed(0)}K MMK</span> (budget: 1,000K)</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead><TableHead>Requested By</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pendingRefunds || []).map((r: any) => {
                const amt = Number(r.amount);
                const needsAdmin = amt > 500000;
                const canAct = needsAdmin ? canApproveHigh : canApprove;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.orders?.order_number}</TableCell>
                    <TableCell className="text-xs">{r.orders?.customers?.company_name || r.orders?.customers?.name || "—"}</TableCell>
                    <TableCell className="text-xs font-medium text-destructive">{amt.toLocaleString()} MMK</TableCell>
                    <TableCell className="text-xs">{r.reason}</TableCell>
                    <TableCell className="text-xs">{r.requested_staff?.full_name || "—"}</TableCell>
                    <TableCell>
                      {canAct ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-green-600" onClick={() => approveRefund.mutate({ id: r.id, approve: true })}>
                            <CheckCircle className="h-3 w-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={() => approveRefund.mutate({ id: r.id, approve: false })}>
                            <XCircle className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{needsAdmin ? "Needs admin" : "Needs manager"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(pendingRefunds || []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No pending refunds</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════ TAB 3: DISCOUNT APPROVALS ═══════════════════════
function DiscountApprovalsTab({ canApprove, staffId }: { canApprove: boolean; staffId?: string }) {
  const qc = useQueryClient();

  const { data: pending } = useQuery({
    queryKey: ["pending-discounts"],
    queryFn: async () => {
      const { data } = await supabase.from("discount_requests").select("*, orders(order_number), requester:requested_by(full_name), customers(name, company_name)").eq("status", "pending").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const approveMut = useMutation({
    mutationFn: async ({ id, approve, rejectionReason }: { id: string; approve: boolean; rejectionReason?: string }) => {
      await supabase.from("discount_requests").update({
        status: approve ? "approved" : "rejected",
        approved_by: staffId,
        approved_at: new Date().toISOString(),
        ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
      }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pending-discounts"] }); toast.success("Discount request updated"); },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Pending Discount Requests</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead><TableHead>Staff</TableHead><TableHead>Discount</TableHead>
              <TableHead>Original</TableHead><TableHead>New Total</TableHead><TableHead>Reason</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pending || []).map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.orders?.order_number || "—"}</TableCell>
                <TableCell className="text-xs">{d.requester?.full_name || "—"}</TableCell>
                <TableCell className="text-xs font-medium text-amber-600">
                  {d.discount_type === "percentage" ? `${d.discount_value}%` : `${Number(d.discount_value).toLocaleString()} MMK`}
                </TableCell>
                <TableCell className="text-xs">{d.original_total ? `${Number(d.original_total).toLocaleString()}` : "—"}</TableCell>
                <TableCell className="text-xs font-medium">{d.new_total ? `${Number(d.new_total).toLocaleString()}` : "—"}</TableCell>
                <TableCell className="text-xs">{d.reason}</TableCell>
                <TableCell>
                  {canApprove ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-green-600" onClick={() => approveMut.mutate({ id: d.id, approve: true })}>Approve</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={() => approveMut.mutate({ id: d.id, approve: false })}>Reject</Button>
                    </div>
                  ) : <span className="text-[10px] text-muted-foreground">Needs manager</span>}
                </TableCell>
              </TableRow>
            ))}
            {(pending || []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No pending discount requests</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════ TAB 4: COD ANALYTICS ═══════════════════════
function CodAnalyticsTab() {
  const monthStart = new Date();
  monthStart.setDate(1);

  const { data } = useQuery({
    queryKey: ["cod-analytics"],
    queryFn: async () => {
      const { data: codOrders } = await supabase.from("orders").select("id, status, total, payment_method, customer_id, customers(name, company_name)").eq("payment_method", "cod").gte("created_at", monthStart.toISOString());
      const orders = codOrders || [];
      const delivered = orders.filter(o => o.status === "delivered");
      const failed = orders.filter(o => ["cancelled", "expired"].includes(o.status));
      const revenueCollected = delivered.reduce((s, o) => s + Number(o.total || 0), 0);
      const revenueLost = failed.reduce((s, o) => s + Number(o.total || 0), 0);

      // Customer leaderboard
      const custMap: Record<string, { name: string; total: number; delivered: number; failed: number }> = {};
      orders.forEach(o => {
        const cid = o.customer_id || "unknown";
        if (!custMap[cid]) custMap[cid] = { name: (o.customers as any)?.company_name || (o.customers as any)?.name || "Unknown", total: 0, delivered: 0, failed: 0 };
        custMap[cid].total++;
        if (o.status === "delivered") custMap[cid].delivered++;
        if (["cancelled", "expired"].includes(o.status)) custMap[cid].failed++;
      });
      const leaderboard = Object.values(custMap).filter(c => c.failed > 0).sort((a, b) => (a.failed / a.total) - (b.failed / b.total)).reverse().slice(0, 10);

      return { total: orders.length, delivered: delivered.length, failed: failed.length, revenueCollected, revenueLost, leaderboard };
    },
  });

  const successRate = data?.total ? Math.round((data.delivered / data.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="COD Orders (Month)" value={data?.total ?? 0} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Delivered" value={data?.delivered ?? 0} icon={<CheckCircle className="h-4 w-4 text-green-600" />} />
        <StatCard label="Failed/Refused" value={data?.failed ?? 0} icon={<XCircle className="h-4 w-4 text-destructive" />} />
        <StatCard label="Collected" value={`${((data?.revenueCollected || 0) / 1e6).toFixed(1)}M`} icon={<DollarSign className="h-4 w-4 text-green-600" />} />
        <StatCard label="Lost" value={`${((data?.revenueLost || 0) / 1e6).toFixed(1)}M`} icon={<TrendingDown className="h-4 w-4 text-destructive" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">COD Risk Leaderboard</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead><TableHead>COD Orders</TableHead><TableHead>Delivered</TableHead>
                <TableHead>Failed</TableHead><TableHead>Success Rate</TableHead><TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.leaderboard || []).map((c, i) => {
                const rate = c.total ? Math.round((c.delivered / c.total) * 100) : 0;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.total}</TableCell>
                    <TableCell className="text-xs">{c.delivered}</TableCell>
                    <TableCell className="text-xs font-medium text-destructive">{c.failed}</TableCell>
                    <TableCell className="text-xs"><span className={rate < 50 ? "text-destructive font-bold" : ""}>{rate}%</span></TableCell>
                    <TableCell>{rate < 50 ? <Badge variant="destructive" className="text-[9px]">High</Badge> : rate < 80 ? <Badge variant="outline" className="text-amber-600 text-[9px]">Elevated</Badge> : <Badge variant="outline" className="text-green-600 text-[9px]">OK</Badge>}</TableCell>
                  </TableRow>
                );
              })}
              {(data?.leaderboard || []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No COD failures this month</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════ TAB 5: REVENUE PROTECTION ═══════════════════════
function RevenueProtectionTab() {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthISO = monthStart.toISOString();

  const { data } = useQuery({
    queryKey: ["revenue-protection"],
    queryFn: async () => {
      const [ordersRes, refundsRes] = await Promise.all([
        supabase.from("orders").select("status, total, payment_method").gte("created_at", monthISO),
        supabase.from("order_refunds").select("amount, status").gte("created_at", monthISO).in("status", ["approved", "pending"]),
      ]);
      const orders = ordersRes.data || [];
      const refunds = refundsRes.data || [];

      const gross = orders.reduce((s, o) => s + Number(o.total || 0), 0);
      const cancelled = orders.filter(o => o.status === "cancelled").reduce((s, o) => s + Number(o.total || 0), 0);
      const failedCod = orders.filter(o => o.payment_method === "cod" && ["cancelled", "expired"].includes(o.status)).reduce((s, o) => s + Number(o.total || 0), 0);
      const expired = orders.filter(o => o.status === "expired").reduce((s, o) => s + Number(o.total || 0), 0);
      const refundTotal = refunds.reduce((s, r) => s + Number(r.amount || 0), 0);
      const net = gross - cancelled - refundTotal - expired;

      return { gross, cancelled, failedCod, expired, refundTotal, net };
    },
  });

  const waterfallData = [
    { name: "Gross Orders", value: (data?.gross || 0) / 1e6, fill: "hsl(var(--primary))" },
    { name: "Cancellations", value: -(data?.cancelled || 0) / 1e6, fill: "hsl(var(--destructive))" },
    { name: "Failed COD", value: -(data?.failedCod || 0) / 1e6, fill: "hsl(var(--destructive) / 0.7)" },
    { name: "Refunds", value: -(data?.refundTotal || 0) / 1e6, fill: "hsl(var(--destructive) / 0.5)" },
    { name: "Expired", value: -(data?.expired || 0) / 1e6, fill: "hsl(var(--muted-foreground))" },
    { name: "Net Revenue", value: (data?.net || 0) / 1e6, fill: "hsl(142 76% 36%)" },
  ];

  const pieData = [
    { name: "Cancelled", value: data?.cancelled || 0 },
    { name: "Failed COD", value: data?.failedCod || 0 },
    { name: "Refunds", value: data?.refundTotal || 0 },
    { name: "Expired", value: data?.expired || 0 },
  ].filter(d => d.value > 0);
  const PIE_COLORS = ["hsl(var(--destructive))", "hsl(25 95% 53%)", "hsl(var(--primary))", "hsl(var(--muted-foreground))"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Revenue Waterfall (This Month, M MMK)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfallData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}M MMK`} />
              <Bar dataKey="value">
                {waterfallData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Loss Breakdown</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${(v / 1000).toFixed(0)}K MMK`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12">No losses this month 🎉</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
