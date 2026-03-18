import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Zap, Copy, Pencil, Trash2, Search, Package, DollarSign } from "lucide-react";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";

interface FlashDeal {
  id: string;
  product_id: string;
  title: string | null;
  original_price: number;
  flash_price: number;
  discount_percentage: number;
  stock_limit: number;
  sold_count: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  badge_text: string;
  sort_order: number;
  created_at: string;
}

interface Product {
  id: string;
  description: string;
  stock_code: string;
  selling_price: number | null;
  thumbnail_url: string | null;
}

const toMMT = (v: string) => v ? v + ':00+06:30' : v;
const fromMMT = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mmt = new Date(d.getTime() + (6 * 60 + 30) * 60 * 1000);
  return mmt.toISOString().slice(0, 16);
};

const emptyForm = {
  product_id: "", title: "", original_price: 0, flash_price: 0,
  stock_limit: 100, start_time: "", end_time: "", is_active: true,
  badge_text: "Flash Deal", sort_order: 0,
};

function Countdown({ endTime }: { endTime: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const calc = () => Math.max(0, differenceInSeconds(new Date(endTime), new Date()));
    setSecs(calc());
    const iv = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(iv);
  }, [endTime]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (secs <= 0) return <span className="text-muted-foreground text-xs">Ended</span>;
  return (
    <div className="flex gap-1 font-mono text-sm font-bold">
      <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{String(h).padStart(2, "0")}</span>
      <span className="text-destructive">:</span>
      <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{String(m).padStart(2, "0")}</span>
      <span className="text-destructive">:</span>
      <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{String(s).padStart(2, "0")}</span>
    </div>
  );
}

export default function FlashDeals() {
  const { staff } = useStaff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [productSearch, setProductSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["flash_deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flash_deals").select("*").order("sort_order");
      if (error) throw error;
      return data as FlashDeal[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products_for_deals", productSearch],
    queryFn: async () => {
      let q = supabase.from("products").select("id, description, stock_code, selling_price, thumbnail_url").eq("is_active", true).limit(20);
      if (productSearch) q = q.or(`description.ilike.%${productSearch}%,stock_code.ilike.%${productSearch}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Product[];
    },
    enabled: dialogOpen,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        product_id: form.product_id, title: form.title || null,
        original_price: form.original_price, flash_price: form.flash_price,
        stock_limit: form.stock_limit, start_time: form.start_time,
        end_time: form.end_time, is_active: form.is_active,
        badge_text: form.badge_text, sort_order: form.sort_order,
      };
      if (editId) {
        const { error } = await supabase.from("flash_deals").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("flash_deals").insert({ ...payload, created_by: staff?.user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["flash_deals"] }); toast({ title: editId ? "Updated" : "Flash deal created" }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("flash_deals").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["flash_deals"] }); toast({ title: "Deleted" }); setDeleteId(null); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("flash_deals").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flash_deals"] }),
  });

  const now = new Date();
  const activeDeals = deals.filter(d => d.is_active && new Date(d.start_time) <= now && new Date(d.end_time) > now);
  const nextEnding = activeDeals.sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime())[0];
  const totalSold = deals.reduce((s, d) => s + d.sold_count, 0);

  const filtered = useMemo(() => {
    if (!search) return deals;
    const q = search.toLowerCase();
    return deals.filter(d => (d.title || "").toLowerCase().includes(q));
  }, [deals, search]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (d: FlashDeal) => {
    setEditId(d.id);
    setForm({
      product_id: d.product_id, title: d.title || "", original_price: d.original_price,
      flash_price: d.flash_price, stock_limit: d.stock_limit,
      start_time: fromMMT(d.start_time),
      end_time: fromMMT(d.end_time),
      is_active: d.is_active, badge_text: d.badge_text, sort_order: d.sort_order,
    });
    setDialogOpen(true);
  };
  const duplicate = (d: FlashDeal) => {
    setEditId(null);
    setForm({
      product_id: d.product_id, title: d.title || "", original_price: d.original_price,
      flash_price: d.flash_price, stock_limit: d.stock_limit,
      start_time: "", end_time: "", is_active: true, badge_text: d.badge_text, sort_order: 0,
    });
    setDialogOpen(true);
  };

  const selectProduct = (p: Product) => {
    setForm(f => ({ ...f, product_id: p.id, original_price: p.selling_price || 0, title: p.description }));
    setProductSearch("");
  };

  const soldPct = (d: FlashDeal) => d.stock_limit > 0 ? Math.round((d.sold_count / d.stock_limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flash Deals</h1>
          <p className="text-sm text-muted-foreground">Time-limited product deals with urgency</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0">
          <Zap className="h-4 w-4 mr-2" />New Flash Deal
        </Button>
      </div>

      {/* Hero countdown */}
      {nextEnding && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 dark:border-orange-800">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-orange-500 animate-pulse" />
              <div>
                <p className="font-semibold text-foreground">Next deal ending: {nextEnding.title || "Flash Deal"}</p>
                <p className="text-xs text-muted-foreground">Ends {formatDistanceToNow(new Date(nextEnding.end_time), { addSuffix: true })}</p>
              </div>
            </div>
            <Countdown endTime={nextEnding.end_time} />
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Zap className="h-5 w-5 text-orange-500" /></div>
          <div><p className="text-2xl font-bold text-foreground">{activeDeals.length}</p><p className="text-xs text-muted-foreground">Active Deals</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Package className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold text-foreground">{totalSold}</p><p className="text-xs text-muted-foreground">Total Sold</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{deals.length}</p><p className="text-xs text-muted-foreground">Total Deals</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search flash deals..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Time Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No flash deals found</TableCell></TableRow>
              ) : filtered.map(d => {
                const pct = soldPct(d);
                const isActive = d.is_active && new Date(d.start_time) <= now && new Date(d.end_time) > now;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500/15 text-orange-700 border-orange-200 text-[10px]">{d.badge_text}</Badge>
                        <span className="font-medium text-sm truncate max-w-[200px]">{d.title || "Flash Deal"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="line-through text-xs text-muted-foreground">{d.original_price.toLocaleString()} MMK</span>
                        <span className="font-bold text-destructive">{d.flash_price.toLocaleString()} MMK</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-500/15 text-red-700 border-red-200 font-bold">-{d.discount_percentage}%</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <Progress value={pct} className="h-2 [&>div]:bg-orange-500" />
                        <p className="text-[10px] text-muted-foreground">
                          {d.sold_count}/{d.stock_limit} sold
                          {pct >= 70 && <span className="ml-1 text-orange-600 font-semibold">🔥 SELLING FAST</span>}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{isActive ? <Countdown endTime={d.end_time} /> : <span className="text-xs text-muted-foreground">{format(new Date(d.end_time), "MMM d, HH:mm")}</span>}</TableCell>
                    <TableCell>
                      {isActive ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Live</Badge>
                        : now < new Date(d.start_time) ? <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">Scheduled</Badge>
                        : <Badge variant="secondary">Ended</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Switch checked={d.is_active} onCheckedChange={v => toggle.mutate({ id: d.id, active: v })} />
                        <Button variant="ghost" size="icon" onClick={() => duplicate(d)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} Flash Deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editId && (
              <div className="space-y-2">
                <Label>Product</Label>
                {form.product_id ? (
                  <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                    {products.find(p => p.id === form.product_id)?.thumbnail_url && (
                      <img src={products.find(p => p.id === form.product_id)?.thumbnail_url ?? ""} className="h-10 w-10 rounded object-cover" alt="" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{form.title}</p>
                      <p className="text-xs text-muted-foreground">{form.original_price.toLocaleString()} MMK</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, product_id: "", title: "", original_price: 0 }))}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input placeholder="Search by name or code..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    {products.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                        {products.map(p => (
                          <button key={p.id} onClick={() => selectProduct(p)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                            {p.thumbnail_url && <img src={p.thumbnail_url} className="h-8 w-8 rounded object-cover" alt="" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{p.description}</p>
                              <p className="text-xs text-muted-foreground">{p.stock_code} · {p.selling_price?.toLocaleString()} MMK</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Original Price</Label><Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: +e.target.value }))} /></div>
              <div><Label>Flash Price</Label><Input type="number" value={form.flash_price} onChange={e => setForm(f => ({ ...f, flash_price: +e.target.value }))} /></div>
            </div>
            {form.original_price > 0 && form.flash_price > 0 && (
              <p className="text-sm font-semibold text-destructive">Discount: {((1 - form.flash_price / form.original_price) * 100).toFixed(1)}% off</p>
            )}
            <div><Label>Stock Limit</Label><Input type="number" value={form.stock_limit} onChange={e => setForm(f => ({ ...f, stock_limit: +e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Time <span className="text-xs text-muted-foreground">(MMT)</span></Label><Input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>End Time <span className="text-xs text-muted-foreground">(MMT)</span></Label><Input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>Badge Text</Label><Input value={form.badge_text} onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.product_id || !form.start_time || !form.end_time}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0">
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Flash Deal?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && del.mutate(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
