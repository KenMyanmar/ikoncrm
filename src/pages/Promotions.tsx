import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Plus, Search, Pencil, Trash2, Tag, TrendingUp, Clock, Archive, X } from "lucide-react";
import { format } from "date-fns";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  type: string;
  discount_value: number | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  applies_to: string;
  target_ids: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  priority: number;
  usage_limit: number | null;
  usage_count: number;
  banner_image_url: string | null;
  created_at: string;
}

const toMMT = (v: string) => v ? v + ':00+06:30' : v;
const fromMMT = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mmt = new Date(d.getTime() + (6 * 60 + 30) * 60 * 1000);
  return mmt.toISOString().slice(0, 16);
};

const emptyForm = {
  title: "", description: "", type: "percentage", discount_value: 0,
  buy_quantity: 2, get_quantity: 1, min_order_amount: 0, max_discount_amount: 0,
  applies_to: "all", start_date: "", end_date: "", is_active: true,
  priority: 0, usage_limit: 0, banner_image_url: "", target_ids: [] as string[],
};

interface TargetDisplay { id: string; label: string }

function getStatus(start: string, end: string) {
  const now = new Date();
  if (now < new Date(start)) return "scheduled";
  if (now > new Date(end)) return "expired";
  return "active";
}

function StatusBadge({ start, end }: { start: string; end: string }) {
  const s = getStatus(start, end);
  if (s === "active") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">● Active</Badge>;
  if (s === "scheduled") return <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">◷ Scheduled</Badge>;
  return <Badge variant="secondary" className="text-muted-foreground">Expired</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    percentage: { label: "% Off", cls: "bg-primary/10 text-primary border-primary/20" },
    fixed_amount: { label: "Fixed", cls: "bg-accent/10 text-accent border-accent/20" },
    buy_x_get_y: { label: "BOGO", cls: "bg-orange-500/15 text-orange-700 border-orange-200" },
    bundle: { label: "Bundle", cls: "bg-purple-500/15 text-purple-700 border-purple-200" },
  };
  const t = map[type] || { label: type, cls: "" };
  return <Badge className={t.cls}>{t.label}</Badge>;
}

// Target selector sub-component
function TargetSelector({
  appliesTo,
  targetIds,
  selectedTargets,
  onAdd,
  onRemove,
  onSetSelectedTargets,
}: {
  appliesTo: string;
  targetIds: string[];
  selectedTargets: TargetDisplay[];
  onAdd: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  onSetSelectedTargets: (t: TargetDisplay[]) => void;
}) {
  const [targetSearch, setTargetSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedSearch = useDebounce(targetSearch, 300);

  const { data: searchResults = [] } = useQuery({
    queryKey: ["target-search", appliesTo, debouncedSearch],
    queryFn: async () => {
      if (appliesTo === "all") return [];
      if (appliesTo === "product") {
        const q = supabase.from("products").select("id, stock_code, description, selling_price")
          .eq("is_active", true).limit(20);
        if (debouncedSearch) {
          q.or(`description.ilike.%${debouncedSearch}%,stock_code.ilike.%${debouncedSearch}%`);
        }
        const { data } = await q;
        return (data || []).map(p => ({
          id: p.id,
          label: `${p.stock_code} — ${p.description}${p.selling_price ? ` (${p.selling_price} MMK)` : ""}`,
        }));
      }
      if (appliesTo === "category") {
        const q = supabase.from("categories").select("id, name").order("name").limit(50);
        if (debouncedSearch) q.ilike("name", `%${debouncedSearch}%`);
        const { data } = await q;
        return (data || []).map(c => ({ id: c.id, label: c.name }));
      }
      if (appliesTo === "brand") {
        const q = supabase.from("brands").select("id, name").order("name").limit(50);
        if (debouncedSearch) q.ilike("name", `%${debouncedSearch}%`);
        const { data } = await q;
        return (data || []).map(b => ({ id: b.id, label: b.name }));
      }
      return [];
    },
    enabled: appliesTo !== "all",
  });

  const filtered = searchResults.filter(r => !targetIds.includes(r.id));
  const placeholder = appliesTo === "product" ? "Search products by name or code..." :
    appliesTo === "category" ? "Search categories..." : "Search brands...";
  const label = appliesTo === "product" ? "Select Products" :
    appliesTo === "category" ? "Select Categories" : "Select Brands";

  if (appliesTo === "all") return null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {/* Selected chips */}
      {selectedTargets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTargets.map(t => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1 max-w-[280px]">
              <span className="truncate">{t.label}</span>
              <button onClick={() => onRemove(t.id)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className="pl-9"
          value={targetSearch}
          onChange={e => { setTargetSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
            {filtered.map(r => (
              <button
                key={r.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground truncate"
                onMouseDown={e => { e.preventDefault(); onAdd(r.id, r.label); setTargetSearch(""); }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

async function fetchTargetLabels(appliesTo: string, ids: string[]): Promise<TargetDisplay[]> {
  if (!ids.length || appliesTo === "all") return [];
  if (appliesTo === "product") {
    const { data } = await supabase.from("products").select("id, stock_code, description").in("id", ids);
    return (data || []).map(p => ({ id: p.id, label: `${p.stock_code} — ${p.description}` }));
  }
  if (appliesTo === "category") {
    const { data } = await supabase.from("categories").select("id, name").in("id", ids);
    return (data || []).map(c => ({ id: c.id, label: c.name }));
  }
  if (appliesTo === "brand") {
    const { data } = await supabase.from("brands").select("id, name").in("id", ids);
    return (data || []).map(b => ({ id: b.id, label: b.name }));
  }
  return [];
}

export default function Promotions() {
  const { staff } = useStaff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<TargetDisplay[]>([]);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Promotion[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title, description: form.description || null, type: form.type,
        discount_value: form.discount_value || null,
        buy_quantity: form.type === "buy_x_get_y" ? form.buy_quantity : null,
        get_quantity: form.type === "buy_x_get_y" ? form.get_quantity : null,
        min_order_amount: form.min_order_amount || 0,
        max_discount_amount: form.max_discount_amount || null,
        applies_to: form.applies_to,
        target_ids: form.applies_to === "all" ? [] : form.target_ids,
        start_date: toMMT(form.start_date), end_date: toMMT(form.end_date),
        is_active: form.is_active, priority: form.priority,
        usage_limit: form.usage_limit || null,
        banner_image_url: form.banner_image_url || null,
      };
      if (editId) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promotions").insert({ ...payload, created_by: staff?.user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: editId ? "Promotion updated" : "Promotion created" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["promotions"] }); toast({ title: "Deleted" }); setDeleteId(null); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("promotions").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotions"] }),
  });

  const filtered = useMemo(() => {
    return promotions.filter(p => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && p.type !== filterType) return false;
      if (filterStatus !== "all" && getStatus(p.start_date, p.end_date) !== filterStatus) return false;
      return true;
    });
  }, [promotions, search, filterType, filterStatus]);

  const stats = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter(p => p.is_active && getStatus(p.start_date, p.end_date) === "active").length;
    const upcoming = promotions.filter(p => getStatus(p.start_date, p.end_date) === "scheduled").length;
    const expired = promotions.filter(p => getStatus(p.start_date, p.end_date) === "expired").length;
    return { total, active, upcoming, expired };
  }, [promotions]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setSelectedTargets([]); setDialogOpen(true); };
  const openEdit = async (p: Promotion) => {
    setEditId(p.id);
    const tIds = p.target_ids || [];
    setForm({
      title: p.title, description: p.description || "", type: p.type,
      discount_value: p.discount_value || 0, buy_quantity: p.buy_quantity || 2,
      get_quantity: p.get_quantity || 1, min_order_amount: p.min_order_amount || 0,
      max_discount_amount: p.max_discount_amount || 0, applies_to: p.applies_to,
      start_date: fromMMT(p.start_date),
      end_date: fromMMT(p.end_date),
      is_active: p.is_active, priority: p.priority,
      usage_limit: p.usage_limit || 0, banner_image_url: p.banner_image_url || "",
      target_ids: tIds,
    });
    setDialogOpen(true);
    // Fetch labels for existing target_ids
    const labels = await fetchTargetLabels(p.applies_to, tIds);
    setSelectedTargets(labels);
  };

  const handleAppliesToChange = (v: string) => {
    setForm(f => ({ ...f, applies_to: v, target_ids: [] }));
    setSelectedTargets([]);
  };

  const handleAddTarget = (id: string, label: string) => {
    setForm(f => ({ ...f, target_ids: [...f.target_ids, id] }));
    setSelectedTargets(prev => [...prev, { id, label }]);
  };

  const handleRemoveTarget = (id: string) => {
    setForm(f => ({ ...f, target_ids: f.target_ids.filter(t => t !== id) }));
    setSelectedTargets(prev => prev.filter(t => t.id !== id));
  };

  const discountDisplay = (p: Promotion) => {
    if (p.type === "percentage") return `${p.discount_value}%`;
    if (p.type === "fixed_amount") return `${p.discount_value} MMK`;
    if (p.type === "buy_x_get_y") return `Buy ${p.buy_quantity} Get ${p.get_quantity}`;
    return "Bundle";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promotions</h1>
          <p className="text-sm text-muted-foreground">Manage discounts, BOGO deals, and bundle offers</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Promotion</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Tag className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold text-foreground">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold text-foreground">{stats.upcoming}</p><p className="text-xs text-muted-foreground">Upcoming</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><Archive className="h-5 w-5 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold text-foreground">{stats.expired}</p><p className="text-xs text-muted-foreground">Expired</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search promotions..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
            <SelectItem value="buy_x_get_y">BOGO</SelectItem>
            <SelectItem value="bundle">Bundle</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No promotions found</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell><TypeBadge type={p.type} /></TableCell>
                  <TableCell className="font-semibold">{discountDisplay(p)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{p.applies_to}</Badge>
                    {p.target_ids?.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">({p.target_ids.length})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(p.start_date), "MMM d")} — {format(new Date(p.end_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell><StatusBadge start={p.start_date} end={p.end_date} /></TableCell>
                  <TableCell className="text-sm">
                    {p.usage_count}{p.usage_limit ? ` / ${p.usage_limit}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch checked={p.is_active} onCheckedChange={v => toggle.mutate({ id: p.id, active: v })} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} Promotion</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type !== "buy_x_get_y" ? (
                <div><Label>Discount Value</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: +e.target.value }))} /></div>
              ) : (
                <>
                  <div><Label>Buy Qty</Label><Input type="number" value={form.buy_quantity} onChange={e => setForm(f => ({ ...f, buy_quantity: +e.target.value }))} /></div>
                  <div><Label>Get Qty</Label><Input type="number" value={form.get_quantity} onChange={e => setForm(f => ({ ...f, get_quantity: +e.target.value }))} /></div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Applies To</Label>
                <Select value={form.applies_to} onValueChange={handleAppliesToChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="brand">Brand</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} /></div>
            </div>

            {/* Target Selector */}
            {form.applies_to !== "all" && (
              <TargetSelector
                appliesTo={form.applies_to}
                targetIds={form.target_ids}
                selectedTargets={selectedTargets}
                onAdd={handleAddTarget}
                onRemove={handleRemoveTarget}
                onSetSelectedTargets={setSelectedTargets}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Order Amount</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: +e.target.value }))} /></div>
              <div><Label>Max Discount</Label><Input type="number" value={form.max_discount_amount} onChange={e => setForm(f => ({ ...f, max_discount_amount: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Usage Limit (0 = unlimited)</Label><Input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: +e.target.value }))} /></div>
            <div><Label>Banner Image</Label><ImageUpload bucket="banners" folder="promotions" value={form.banner_image_url || ""} onChange={url => setForm(f => ({ ...f, banner_image_url: url }))} aspectHint="1200×400px" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title || !form.start_date || !form.end_date}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Promotion?</DialogTitle></DialogHeader>
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
