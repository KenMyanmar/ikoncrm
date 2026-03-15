import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ArrowLeft, Flag, Shield, Plus, Mail, ShoppingCart, Edit, Tag, MessageSquare } from "lucide-react";
import { useState } from "react";

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
};

const relativeTime = (date: string | null) => {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const TAG_COLORS: Record<string, string> = {
  vip: "bg-amber-200 text-amber-800",
  wholesale: "bg-blue-100 text-blue-700",
  hotel: "bg-purple-100 text-purple-700",
  restaurant: "bg-green-100 text-green-700",
  repeat: "bg-emerald-100 text-emerald-700",
  at_risk: "bg-red-100 text-red-700",
  new: "bg-amber-100 text-amber-700",
};

const AVAILABLE_TAGS = ["vip", "wholesale", "hotel", "restaurant", "repeat", "at_risk"];

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();

  const { data: customer } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: metrics } = useQuery({
    queryKey: ["customer-metrics", id],
    queryFn: async () => {
      const { data } = await supabase.from("customer_metrics").select("*").eq("customer_id", id!).single();
      return data as any;
    },
    enabled: !!id,
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-customer-orders", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("id, order_number, status, total, currency, created_at, payment_method, payment_status")
        .eq("customer_id", id!).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: addresses } = useQuery({
    queryKey: ["admin-customer-addresses", id],
    queryFn: async () => {
      const { data } = await supabase.from("customer_addresses").select("*").eq("customer_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: comms } = useQuery({
    queryKey: ["customer-comms", id],
    queryFn: async () => {
      const { data } = await supabase.from("customer_communications")
        .select("*, orders(order_number)")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      const { error } = await supabase.from("customers").update({ is_approved_buyer: approved }).eq("id", id!);
      if (error) throw error;
      if (staff) await logActivity(staff.id, approved ? "approved" : "unapproved", "customer", id!, customer?.name || customer?.company_name || undefined);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-customer", id] }); toast.success("Customer updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const tagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const existing = (customer?.tags || []) as string[];
      const newTags = existing.includes(tag) ? existing.filter(t => t !== tag) : [...existing, tag];
      const { error } = await supabase.from("customers").update({ tags: newTags }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-customer", id] }); toast.success("Tags updated"); },
  });

  if (!customer) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const tags = (customer.tags || []) as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-xl font-bold text-foreground">{customer.company_name || customer.name || "Customer"}</h1>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{customer.name || "—"}</p>
              <p className="text-sm text-muted-foreground">{customer.email} · {customer.phone || "No phone"}</p>
              <p className="text-sm text-muted-foreground">Company: {customer.company_name || "—"}</p>
              <p className="text-xs text-muted-foreground">Customer since {new Date(customer.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              <div className="flex gap-1 pt-1 flex-wrap">
                {tags.map(t => (
                  <Badge key={t} variant="outline" className={`text-[10px] ${TAG_COLORS[t] || ""}`}>{t}</Badge>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 px-1"><Tag className="h-3 w-3" /><Plus className="h-2.5 w-2.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {AVAILABLE_TAGS.map(t => (
                      <DropdownMenuItem key={t} onClick={() => tagMutation.mutate(t)}>
                        {tags.includes(t) ? "✓ " : ""}{t}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Lifetime Value</p>
                <p className="text-lg font-bold">{fmt(Number(metrics?.lifetime_value) || 0)}</p>
                <p className="text-[10px] text-muted-foreground">MMK</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="text-lg font-bold">{metrics?.total_orders || 0}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Avg Order</p>
                <p className="text-lg font-bold">{fmt(Number(metrics?.avg_order_value) || 0)}</p>
                <p className="text-[10px] text-muted-foreground">MMK</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Last Order</p>
                <p className="text-lg font-bold">{relativeTime(metrics?.last_order_date)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => navigate(`/orders/create?customer=${id}`)}><ShoppingCart className="h-3.5 w-3.5 mr-1" /> Create Order</Button>
            <div className="flex items-center gap-2 ml-auto">
              <Switch checked={customer.is_approved_buyer} onCheckedChange={v => approveMutation.mutate(v)} />
              <Label className="text-xs">Approved Buyer</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Profile */}
        <div className="space-y-4">
          <RiskProfileCard customer={customer} customerId={id!} />
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Orders ({orders?.length || 0})</TabsTrigger>
              <TabsTrigger value="comms">Communications</TabsTrigger>
              <TabsTrigger value="addresses">Addresses & Info</TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(orders || []).map((o: any) => (
                        <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                          <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{o.status}</Badge></TableCell>
                          <TableCell className="text-xs">{o.payment_method || "—"}</TableCell>
                          <TableCell className="text-right text-sm">{o.total ? `${Number(o.total).toLocaleString()} ${o.currency}` : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{relativeTime(o.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {(orders || []).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No orders yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comms">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  {(comms || []).length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No communications yet</p>}
                  {(comms || []).map((c: any) => (
                    <div key={c.id} className="border rounded-lg p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        {c.channel === "email" ? <Mail className="h-3.5 w-3.5 text-blue-500" /> : <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="font-medium">{c.subject || c.channel}</span>
                        {(c as any).orders?.order_number && (
                          <Badge variant="outline" className="text-[9px] cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${c.order_id}`); }}>
                            {(c as any).orders.order_number}
                          </Badge>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">{relativeTime(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.body}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px]">{c.channel}</Badge>
                        <Badge variant="outline" className="text-[9px]">{c.direction}</Badge>
                        {c.status && <Badge variant="outline" className="text-[9px]">{c.status}</Badge>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="addresses">
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Addresses</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {(addresses || []).map((a: any) => (
                      <div key={a.id} className="border rounded p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          {a.label && <Badge variant="outline" className="text-[10px]">{a.label}</Badge>}
                          {a.is_default && <Badge className="bg-primary/10 text-primary text-[10px]">Default</Badge>}
                        </div>
                        <p>{a.address_line}</p>
                        <p className="text-muted-foreground">{[a.township, a.city, a.region].filter(Boolean).join(", ")}</p>
                        {a.contact_phone && <p className="text-muted-foreground">{a.contact_phone}</p>}
                      </div>
                    ))}
                    {(addresses || []).length === 0 && <p className="text-sm text-muted-foreground">No addresses.</p>}
                  </CardContent>
                </Card>

                <CustomerEditForm customer={customer} customerId={id!} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/* ─── Risk Profile Card ─── */
const RISK_TIER_COLORS: Record<string, string> = {
  low: "text-green-600 bg-green-50",
  normal: "text-amber-600 bg-amber-50",
  elevated: "text-red-600 bg-red-50",
  high: "text-red-800 bg-red-100",
};

const FRAUD_FLAG_OPTIONS = [
  { value: "suspicious_activity", label: "Suspicious activity" },
  { value: "repeat_cod_failures", label: "Repeat COD failures" },
  { value: "address_inconsistency", label: "Address inconsistency" },
  { value: "payment_fraud", label: "Payment fraud" },
  { value: "abusive_returns", label: "Abusive returns" },
];

function RiskProfileCard({ customer, customerId }: { customer: any; customerId: string }) {
  const qc = useQueryClient();
  const existingFlags = (customer.fraud_flags || []) as string[];
  const codSuccess = customer.total_cod_orders ? Math.round((customer.total_cod_delivered || 0) / customer.total_cod_orders * 100) : 100;

  const flagMut = useMutation({
    mutationFn: async (flag: string) => {
      const newFlags = existingFlags.includes(flag) ? existingFlags.filter(f => f !== flag) : [...existingFlags, flag];
      const { error } = await supabase.from("customers").update({ fraud_flags: newFlags }).eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-customer", customerId] }); toast.success("Fraud flags updated"); },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5"><Shield className="h-4 w-4" /> Risk Profile</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs"><Flag className="h-3 w-3 mr-1" /> Flag</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {FRAUD_FLAG_OPTIONS.map(f => (
                <DropdownMenuItem key={f.value} onClick={() => flagMut.mutate(f.value)}>
                  {existingFlags.includes(f.value) ? "✓ " : ""}{f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Risk Tier</span>
          <Badge variant="outline" className={RISK_TIER_COLORS[customer.risk_tier] || ""}>{customer.risk_tier || "normal"}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">COD Orders</span>
          <span className="text-xs">{customer.total_cod_orders || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">COD Success Rate</span>
          <span className={`text-xs font-medium ${codSuccess < 50 ? "text-destructive" : ""}`}>{codSuccess}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Failed Deliveries</span>
          <span className="text-xs">{customer.total_failed_deliveries || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Cancellations</span>
          <span className="text-xs">{customer.total_cancelled_orders || 0}</span>
        </div>
        {existingFlags.length > 0 && (
          <div className="pt-1 flex flex-wrap gap-1">
            {existingFlags.map(f => (
              <Badge key={f} variant="destructive" className="text-[9px]">{FRAUD_FLAG_OPTIONS.find(o => o.value === f)?.label || f}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Customer Edit Form ─── */
function CustomerEditForm({ customer, customerId }: { customer: any; customerId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: customer.name || "",
    company_name: customer.company_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    customer_type: customer.customer_type || "retail",
    account_manager: customer.account_manager || "",
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").update(form).eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customer", customerId] });
      toast.success("Customer updated");
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Customer Info</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><Label className="text-xs text-muted-foreground">Type</Label><p>{customer.customer_type}</p></div>
          <div><Label className="text-xs text-muted-foreground">Payment Terms</Label><p>{customer.payment_terms}</p></div>
          <div><Label className="text-xs text-muted-foreground">Credit Limit</Label><p>{Number(customer.credit_limit).toLocaleString()} MMK</p></div>
          <div><Label className="text-xs text-muted-foreground">Account Manager</Label><p>{customer.account_manager || "—"}</p></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Edit Customer</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label className="text-xs">Company</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
        <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={form.customer_type} onValueChange={v => setForm(f => ({ ...f, customer_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Account Manager</Label><Input value={form.account_manager} onChange={e => setForm(f => ({ ...f, account_manager: e.target.value }))} /></div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
