import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function OrderList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", status, search],
    queryFn: async () => {
      let query = supabase.from("orders").select("*, customers(name, company_name)").order("created_at", { ascending: false }).limit(100);
      if (status !== "all") query = query.eq("status", status);
      if (search) query = query.ilike("order_number", `%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    confirmed: "bg-info/10 text-info",
    processing: "bg-info/10 text-info",
    shipped: "bg-primary/10 text-primary",
    delivered: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Orders</h1>
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search order number…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders || []).map((o: any) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/orders/${o.id}`)}>
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell className="text-sm">{o.customers?.company_name || o.customers?.name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className={`text-[10px] ${statusColor[o.status] || ""}`}>{o.status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{o.payment_status}</Badge></TableCell>
                  <TableCell className="text-sm">{o.total ? `${Number(o.total).toLocaleString()} ${o.currency}` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
