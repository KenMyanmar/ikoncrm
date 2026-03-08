import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

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
