import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 50;

export default function ProductList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  // Categories lookup for breadcrumb paths
  const { data: catMap } = useQuery({
    queryKey: ["categories-lookup"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, parent_id");
      const map = new Map<string, { name: string; parentName?: string }>();
      const all = data || [];
      const byId = new Map(all.map(c => [c.id, c]));
      all.forEach(c => {
        const parent = c.parent_id ? byId.get(c.parent_id) : null;
        map.set(c.id, { name: c.name, parentName: parent?.name || undefined });
      });
      return map;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search, page, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, stock_code, description, short_description, thumbnail_url, selling_price, currency, stock_status, data_completeness, is_featured, brand_id, category_id, slug", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`description.ilike.%${search}%,stock_code.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("stock_status", statusFilter);
      }

      const { data, count } = await query;
      return { products: data || [], total: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const statusColor = (s: string) => {
    if (s === "in_stock") return "bg-success/10 text-success";
    if (s === "low_stock") return "bg-warning/10 text-warning";
    return "bg-destructive/10 text-destructive";
  };

  const completenessColor = (v: number) => {
    if (v >= 80) return "bg-success";
    if (v >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <Button variant="outline" size="sm" onClick={() => navigate("/products/bulk-price")}>Bulk Price Upload</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by code or description…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completeness</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && (data?.products || []).length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No products found.</TableCell></TableRow>}
                {(data?.products || []).map((p: any) => {
                  const cat = p.category_id && catMap ? catMap.get(p.category_id) : null;
                  const catPath = cat ? (cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name) : "—";
                  return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/products/${p.id}`)}>
                    <TableCell>
                      {p.thumbnail_url ? <img src={p.thumbnail_url} className="h-8 w-8 rounded object-cover" alt="" /> : <div className="h-8 w-8 rounded bg-muted" />}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.stock_code}</TableCell>
                    <TableCell className="text-sm truncate max-w-[300px]">{p.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{catPath}</TableCell>
                    <TableCell className="text-sm">{p.selling_price ? `${p.selling_price.toLocaleString()} ${p.currency}` : "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className={`text-[10px] ${statusColor(p.stock_status)}`}>{p.stock_status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.data_completeness} className={`h-2 w-16 ${completenessColor(p.data_completeness)}`} />
                        <span className="text-[10px] text-muted-foreground">{p.data_completeness}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Edit className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">{data?.total ?? 0} products total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm flex items-center">{page + 1} / {totalPages || 1}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
