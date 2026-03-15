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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ArrowLeft, Flag, Shield } from "lucide-react";

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

  const { data: orders } = useQuery({
    queryKey: ["admin-customer-orders", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, order_number, status, total, currency, created_at").eq("customer_id", id!).order("created_at", { ascending: false }).limit(20);
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

  const approveMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      const { error } = await supabase.from("customers").update({ is_approved_buyer: approved }).eq("id", id!);
      if (error) throw error;
      if (staff) await logActivity(staff.id, approved ? "approved" : "unapproved", "customer", id!, customer?.name || customer?.company_name || undefined);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-customer", id] }); toast.success("Customer updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!customer) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-xl font-bold text-foreground">{customer.company_name || customer.name || "Customer"}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div><Label className="text-xs text-muted-foreground">Name</Label><p>{customer.name || "—"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Company</Label><p>{customer.company_name || "—"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><p>{customer.email || "—"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><p>{customer.phone || "—"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Type</Label><Badge variant="outline">{customer.customer_type}</Badge></div>
              <div><Label className="text-xs text-muted-foreground">Payment Terms</Label><p>{customer.payment_terms}</p></div>
              <div><Label className="text-xs text-muted-foreground">Credit Limit</Label><p>{Number(customer.credit_limit).toLocaleString()}</p></div>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={customer.is_approved_buyer} onCheckedChange={v => approveMutation.mutate(v)} />
                <Label>Approved Buyer</Label>
              </div>
            </CardContent>
          </Card>

          {/* Risk Profile Card */}
          <RiskProfileCard customer={customer} customerId={id!} staffId={staff?.id} />
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="orders">
            <TabsList><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="addresses">Addresses</TabsTrigger></TabsList>
            <TabsContent value="orders">
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders?.map((o: any) => (
                        <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                          <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{o.status}</Badge></TableCell>
                          <TableCell>{o.total ? `${Number(o.total).toLocaleString()} ${o.currency}` : "—"}</TableCell>
                          <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="addresses">
              <Card>
                <CardContent className="pt-4 space-y-3">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

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

function RiskProfileCard({ customer, customerId, staffId }: { customer: any; customerId: string; staffId?: string }) {
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
