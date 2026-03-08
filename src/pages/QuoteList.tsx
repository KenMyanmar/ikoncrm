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

export default function QuoteList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: quotes } = useQuery({
    queryKey: ["admin-quotes", status, search],
    queryFn: async () => {
      let query = supabase.from("quotes").select("*, customers(name, company_name)").order("created_at", { ascending: false }).limit(100);
      if (status !== "all") query = query.eq("status", status);
      if (search) query = query.ilike("quote_number", `%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search quote number…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Quoted</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(quotes || []).map((q: any) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/quotes/${q.id}`)}>
                  <TableCell className="font-mono text-xs">{q.quote_number}</TableCell>
                  <TableCell className="text-sm">{q.customers?.company_name || q.customers?.name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{q.status}</Badge></TableCell>
                  <TableCell className="text-sm">{q.total_quoted ? Number(q.total_quoted).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
