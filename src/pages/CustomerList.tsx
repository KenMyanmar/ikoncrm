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

export default function CustomerList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: customers } = useQuery({
    queryKey: ["admin-customers", search, typeFilter],
    queryFn: async () => {
      let query = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(200);
      if (search) query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
      if (typeFilter !== "all") query = query.eq("customer_type", typeFilter);
      const { data } = await query;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Customers</h1>
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, company, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers || []).map((c: any) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/customers/${c.id}`)}>
                  <TableCell className="font-medium">{c.name || "—"}</TableCell>
                  <TableCell className="text-sm">{c.company_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{c.customer_type}</Badge></TableCell>
                  <TableCell>{c.is_approved_buyer ? <Badge className="bg-success/10 text-success text-[10px]">Approved</Badge> : <Badge variant="secondary" className="text-[10px]">Pending</Badge>}</TableCell>
                  <TableCell className="text-sm">{c.payment_terms}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
