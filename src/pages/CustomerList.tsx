import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, TrendingUp, UserPlus, DollarSign, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "@/config/brand";

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
};

const relativeTime = (date: string | null) => {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

function getStatus(c: any): { label: string; color: string } {
  const now = Date.now();
  const created = new Date(c.customer_since).getTime();
  const daysSinceCreated = (now - created) / 86400000;
  if (daysSinceCreated <= 7 && (!c.total_orders || c.total_orders === 0))
    return { label: "New", color: "bg-amber-100 text-amber-700" };
  if (c.orders_last_30d > 0) return { label: "Active", color: "bg-green-100 text-green-700" };
  if (c.orders_last_90d > 0) return { label: "Recent", color: "bg-blue-100 text-blue-700" };
  return { label: "Inactive", color: "bg-muted text-muted-foreground" };
}

const TAG_COLORS: Record<string, string> = {
  vip: "bg-amber-200 text-amber-800",
  wholesale: "bg-blue-100 text-blue-700",
  hotel: "bg-purple-100 text-purple-700",
  restaurant: "bg-green-100 text-green-700",
  repeat: "bg-emerald-100 text-emerald-700",
  at_risk: "bg-red-100 text-red-700",
};

export default function CustomerList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("lifetime_value");

  const { data: customers } = useQuery({
    queryKey: ["customers-crm"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_metrics")
        .select("*")
        .order("lifetime_value", { ascending: false })
        .limit(500);
      return (data || []) as any[];
    },
  });

  const filtered = useMemo(() => {
    let list = customers || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c: any) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.company_name || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((c: any) => getStatus(c).label.toLowerCase() === statusFilter);
    }
    const sorted = [...list];
    if (sortBy === "lifetime_value") sorted.sort((a: any, b: any) => (b.lifetime_value || 0) - (a.lifetime_value || 0));
    else if (sortBy === "recent") sorted.sort((a: any, b: any) => new Date(b.last_order_date || 0).getTime() - new Date(a.last_order_date || 0).getTime());
    else if (sortBy === "name") sorted.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    else if (sortBy === "joined") sorted.sort((a: any, b: any) => new Date(b.customer_since || 0).getTime() - new Date(a.customer_since || 0).getTime());
    return sorted;
  }, [customers, search, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const all = customers || [];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    return {
      total: all.length,
      active30d: all.filter((c: any) => c.orders_last_30d > 0).length,
      newMonth: all.filter((c: any) => new Date(c.customer_since).getTime() >= monthStart).length,
      totalRevenue: all.reduce((s: number, c: any) => s + (Number(c.lifetime_value) || 0), 0),
    };
  }, [customers]);

  const exportCSV = () => {
    const headers = ["Name", "Company", "Email", "Phone", "Orders", "Lifetime Value", "Last Order", "Tags"];
    const rows = filtered.map((c: any) => [
      c.name || "", c.company_name || "", c.email || "", c.phone || "",
      c.total_orders || 0, c.lifetime_value || 0, c.last_order_date || "",
      (c.tags || []).join(";"),
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${BRAND.name.toLowerCase().replace(/\s+/g, "_")}_customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" /> Total Customers</div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" /> Active (30d)</div>
          <p className="text-2xl font-bold">{stats.active30d}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><UserPlus className="h-3.5 w-3.5" /> New This Month</div>
          <p className="text-2xl font-bold">{stats.newMonth}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5" /> Total Revenue</div>
          <p className="text-2xl font-bold">{fmt(stats.totalRevenue)} <span className="text-xs font-normal text-muted-foreground">MMK</span></p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, company, phone, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lifetime_value">Sort: LTV</SelectItem>
                <SelectItem value="recent">Sort: Recent Order</SelectItem>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="joined">Sort: Date Joined</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Lifetime Value</TableHead>
                <TableHead className="hidden md:table-cell">Last Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => {
                const status = getStatus(c);
                return (
                  <TableRow key={c.customer_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/customers/${c.customer_id}`)}>
                    <TableCell className="font-medium">{c.name || "—"}</TableCell>
                    <TableCell className="text-sm">{c.company_name || "—"}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{c.phone || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{c.total_orders || 0}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmt(Number(c.lifetime_value) || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{relativeTime(c.last_order_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {(c.tags || []).slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="outline" className={`text-[9px] ${TAG_COLORS[t] || ""}`}>{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
