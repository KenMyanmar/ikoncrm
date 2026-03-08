import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function ActivityLog() {
  const [entityType, setEntityType] = useState("all");
  const [search, setSearch] = useState("");

  const { data: logs } = useQuery({
    queryKey: ["admin-activity-log", entityType, search],
    queryFn: async () => {
      let query = supabase.from("activity_log").select("*, staff_profiles(full_name)").order("created_at", { ascending: false }).limit(200);
      if (entityType !== "all") query = query.eq("entity_type", entityType);
      if (search) query = query.or(`action.ilike.%${search}%,entity_name.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search actions or names…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="order">Orders</SelectItem>
                <SelectItem value="quote">Quotes</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="category">Categories</SelectItem>
                <SelectItem value="brand">Brands</SelectItem>
                <SelectItem value="banner">Banners</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs || []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{l.staff_profiles?.full_name || "System"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.action}</Badge></TableCell>
                  <TableCell className="text-sm">{l.entity_type}</TableCell>
                  <TableCell className="text-sm">{l.entity_name || l.entity_id?.slice(0, 8) || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(logs || []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activity recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
