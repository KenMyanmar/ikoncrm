import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Copy, Ticket, TrendingUp, Star, RefreshCw, Layers } from "lucide-react";
import { format } from "date-fns";

interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: string;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  applies_to: string;
  target_ids: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  code: "", title: "", description: "", type: "percentage", discount_value: 0,
  min_order_amount: 0, max_discount_amount: 0, max_uses: 0, max_uses_per_user: 1,
  applies_to: "all", start_date: "", end_date: "", is_active: true,
};

function generateCode(prefix = "") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = prefix;
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getStatus(start: string, end: string) {
  const now = new Date();
  if (now < new Date(start)) return "scheduled";
  if (now > new Date(end)) return "expired";
  return "active";
}

function StatusBadge({ start, end }: { start: string; end: string }) {
  const s = getStatus(start, end);
  if (s === "active") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Active</Badge>;
  if (s === "scheduled") return <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">Scheduled</Badge>;
  return <Badge variant="secondary" className="text-muted-foreground">Expired</Badge>;
}

export default function Coupons() {
  const { staff } = useStaff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPrefix, setBulkPrefix] = useState("");

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: form.code.toUpperCase(), title: form.title, description: form.description || null,
        type: form.type, discount_value: form.discount_value,
        min_order_amount: form.min_order_amount || 0,
        max_discount_amount: form.max_discount_amount || null,
        max_uses: form.max_uses || null, max_uses_per_user: form.max_uses_per_user,
        applies_to: form.applies_to, start_date: form.start_date, end_date: form.end_date,
        is_active: form.is_active,
      };
      if (editId) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert({ ...payload, created_by: staff?.user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast({ title: editId ? "Updated" : "Coupon created" }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkGenerate = useMutation({
    mutationFn: async () => {
      const codes = Array.from({ length: bulkCount }, () => ({
        code: generateCode(bulkPrefix),
        title: form.title, description: form.description || null,
        type: form.type, discount_value: form.discount_value,
        min_order_amount: form.min_order_amount || 0,
        max_discount_amount: form.max_discount_amount || null,
        max_uses: 1, max_uses_per_user: 1,
        applies_to: form.applies_to, start_date: form.start_date, end_date: form.end_date,
        is_active: true, created_by: staff?.user_id,
      }));
      const { error } = await supabase.from("coupons").insert(codes);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast({ title: `${bulkCount} coupons generated!` }); setBulkOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("coupons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast({ title: "Deleted" }); setDeleteId(null); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  const filtered = useMemo(() => {
    if (!search) return coupons;
    const q = search.toLowerCase();
    return coupons.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [coupons, search]);

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => c.is_active && getStatus(c.start_date, c.end_date) === "active").length;
    const totalRedeemed = coupons.reduce((s, c) => s + c.used_count, 0);
    const popular = coupons.length > 0 ? coupons.reduce((a, b) => a.used_count > b.used_count ? a : b) : null;
    return { total, active, totalRedeemed, popular };
  }, [coupons]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code, title: c.title, description: c.description || "", type: c.type,
      discount_value: c.discount_value, min_order_amount: c.min_order_amount,
      max_discount_amount: c.max_discount_amount || 0, max_uses: c.max_uses || 0,
      max_uses_per_user: c.max_uses_per_user, applies_to: c.applies_to,
      start_date: c.start_date ? c.start_date.slice(0, 16) : "",
      end_date: c.end_date ? c.end_date.slice(0, 16) : "",
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };
  const openBulk = () => {
    setForm({ ...emptyForm, title: "Campaign Coupon" });
    setBulkCount(10);
    setBulkPrefix("");
    setBulkOpen(true);
  };

  const discountDisplay = (c: Coupon) => {
    if (c.type === "percentage") return `${c.discount_value}%`;
    if (c.type === "fixed_amount") return `${c.discount_value.toLocaleString()} MMK`;
    return "Free Shipping";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
          <p className="text-sm text-muted-foreground">Manage discount codes and campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openBulk}><Layers className="h-4 w-4 mr-2" />Bulk Generate</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Coupon</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Ticket className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold text-foreground">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><RefreshCw className="h-5 w-5 text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{stats.totalRedeemed}</p><p className="text-xs text-muted-foreground">Redeemed</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Star className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-sm font-bold text-foreground font-mono">{stats.popular?.code || "—"}</p><p className="text-xs text-muted-foreground">Most Popular</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by code or title..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No coupons found</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <button onClick={() => copyCode(c.code)}
                      className="inline-flex items-center gap-1.5 font-mono text-sm font-bold bg-muted px-2.5 py-1 rounded border border-dashed border-border hover:bg-muted/80 transition-colors">
                      {c.code}
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>
                    <Badge className={
                      c.type === "percentage" ? "bg-primary/10 text-primary border-primary/20" :
                      c.type === "fixed_amount" ? "bg-accent/10 text-accent border-accent/20" :
                      "bg-blue-500/15 text-blue-700 border-blue-200"
                    }>
                      {c.type === "percentage" ? "%" : c.type === "fixed_amount" ? "Fixed" : "Free Ship"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{discountDisplay(c)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.min_order_amount > 0 ? `${c.min_order_amount.toLocaleString()} MMK` : "—"}</TableCell>
                  <TableCell className="text-sm">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(c.start_date), "MMM d")} — {format(new Date(c.end_date), "MMM d")}
                  </TableCell>
                  <TableCell><StatusBadge start={c.start_date} end={c.end_date} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch checked={c.is_active} onCheckedChange={v => toggle.mutate({ id: c.id, active: v })} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} Coupon</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="font-mono" placeholder="SUMMER2024" />
                <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, code: generateCode() }))}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Discount Value</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Order Amount</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: +e.target.value }))} /></div>
              <div><Label>Max Discount</Label><Input type="number" value={form.max_discount_amount} onChange={e => setForm(f => ({ ...f, max_discount_amount: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Max Uses (0 = unlimited)</Label><Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: +e.target.value }))} /></div>
              <div><Label>Max Per User</Label><Input type="number" value={form.max_uses_per_user} onChange={e => setForm(f => ({ ...f, max_uses_per_user: +e.target.value }))} /></div>
            </div>
            <div><Label>Applies To</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.code || !form.title || !form.start_date || !form.end_date}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Generate Coupons</DialogTitle>
            <DialogDescription>Create multiple unique coupon codes with the same discount settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Count</Label><Input type="number" value={bulkCount} onChange={e => setBulkCount(+e.target.value)} min={1} max={100} /></div>
              <div><Label>Prefix (optional)</Label><Input value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value.toUpperCase())} placeholder="VIP" className="font-mono" /></div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Discount Value</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Each coupon will be single-use (1 per user). Example: {bulkPrefix || ""}XXXXXXXX</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkGenerate.mutate()} disabled={!form.title || !form.start_date || !form.end_date || bulkCount < 1}>
              Generate {bulkCount} Coupons
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Coupon?</DialogTitle></DialogHeader>
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
