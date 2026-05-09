import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Building2, Plus, Pencil, Trash2, Star, ArrowUp, ArrowDown, ImageIcon, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStaff } from "@/contexts/StaffContext";

// TODO: rename `banners` permission module to `content_management`
// once we have 4+ content types behind it.

type ClientLogoRow = {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  is_featured: boolean;
  updated_at: string | null;
};

type Filter = "all" | "active" | "inactive" | "featured";

interface FormState {
  name: string;
  logo_url: string;
  website_url: string;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: "",
  logo_url: "",
  website_url: "",
  sort_order: 100,
  is_featured: false,
  is_active: true,
};

function relativeTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ClientLogos() {
  const qc = useQueryClient();
  const { staff } = useStaff();
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ClientLogoRow | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-client-logos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_logos")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as ClientLogoRow[];
    },
    enabled: !!staff,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-client-logos"] });

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((r) => r.is_active).length,
    inactive: rows.filter((r) => !r.is_active).length,
    featured: rows.filter((r) => r.is_featured && r.is_active).length,
  }), [rows]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active": return rows.filter((r) => r.is_active);
      case "inactive": return rows.filter((r) => !r.is_active);
      case "featured": return rows.filter((r) => r.is_featured && r.is_active);
      default: return rows;
    }
  }, [rows, filter]);

  const toggleActive = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("client_logos")
        .update({ is_active: value, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("client_logos")
        .update({ is_featured: value, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reorder = useMutation({
    mutationFn: async (next: ClientLogoRow[]) => {
      const updates = next.map((r, i) => ({
        id: r.id,
        name: r.name,
        logo_url: r.logo_url,
        sort_order: (i + 1) * 10,
      }));
      const { error } = await supabase.from("client_logos").upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    reorder.mutate(next);
  };

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_logos")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Logo archived", description: "Set to inactive — not hard-deleted." });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setOriginalImage("");
    setForm({ ...emptyForm, sort_order: (rows.length + 1) * 10 });
    setDialogOpen(true);
  };

  const openEdit = (r: ClientLogoRow) => {
    setEditingId(r.id);
    setOriginalImage(r.logo_url || "");
    setForm({
      name: r.name,
      logo_url: r.logo_url || "",
      website_url: r.website_url || "",
      sort_order: r.sort_order ?? 100,
      is_featured: !!r.is_featured,
      is_active: !!r.is_active,
    });
    setDialogOpen(true);
  };

  const deleteOldImage = async (oldUrl: string) => {
    const marker = "/client-logos/";
    const idx = oldUrl.indexOf(marker);
    if (idx === -1) return;
    const path = oldUrl.slice(idx + marker.length);
    if (!path) return;
    await supabase.storage.from("client-logos").remove([path]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!form.logo_url) {
      toast({ title: "Logo image is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        logo_url: form.logo_url,
        website_url: form.website_url.trim() || null,
        sort_order: Number(form.sort_order) || 100,
        is_featured: form.is_featured,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from("client_logos").update(payload).eq("id", editingId);
        if (error) throw error;
        if (originalImage && originalImage !== form.logo_url) {
          await deleteOldImage(originalImage);
        }
        toast({ title: "Logo saved" });
      } else {
        const { error } = await supabase.from("client_logos").insert(payload);
        if (error) throw error;
        toast({ title: "Logo created" });
      }
      invalidate();
      setDialogOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const FilterChip = ({ id, label, count }: { id: Filter; label: string; count: number }) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        filter === id
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Client Logos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage logos shown on the public site. Featured: <span className="font-medium text-foreground">{counts.featured}</span> of {counts.active} active
            <span className="text-muted-foreground/80"> (8 recommended; max 12 fits cleanly).</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Logo
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip id="all" label="All" count={counts.all} />
        <FilterChip id="active" label="Active" count={counts.active} />
        <FilterChip id="inactive" label="Inactive" count={counts.inactive} />
        <FilterChip id="featured" label="Featured" count={counts.featured} />
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No client logos yet</p>
              <p className="text-sm text-muted-foreground">Add the first logo to populate the public strip.</p>
            </div>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Create your first logo</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No logos match this filter.</CardContent></Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2 w-16">Order</th>
                <th className="px-2 py-2 w-24">Logo</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Website</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Featured</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-2 py-2 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const fullIdx = rows.findIndex((x) => x.id === r.id);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-6 text-right">{r.sort_order ?? "—"}</span>
                        <div className="flex flex-col">
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={fullIdx <= 0 || filter !== "all"} onClick={() => move(fullIdx, -1)}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={fullIdx >= rows.length - 1 || filter !== "all"} onClick={() => move(fullIdx, 1)}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {r.logo_url ? (
                        <img src={r.logo_url} alt={r.name} className="h-10 w-20 object-contain bg-white rounded border border-border" />
                      ) : (
                        <div className="h-10 w-20 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.website_url ? (
                        <a href={r.website_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> visit
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs ${r.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <span className={`h-2 w-2 rounded-full ${r.is_active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFeatured.mutate({ id: r.id, value: !r.is_featured })}
                        aria-label={r.is_featured ? "Unfeature" : "Feature"}
                      >
                        <Star className={`h-4 w-4 ${r.is_featured ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      </Button>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{relativeTime(r.updated_at)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <Switch
                          checked={!!r.is_active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: r.id, value: v })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filter !== "all" && (
            <div className="px-3 py-2 text-[11px] text-muted-foreground bg-muted/30 border-t border-border">
              Switch to "All" to reorder logos.
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Logo" : "New Logo"}</DialogTitle>
            <DialogDescription>
              Logos render on the public homepage and /services strip. Use transparent PNG/SVG when possible.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Shangri-La Yangon"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Logo image *</Label>
              <ImageUpload
                bucket="client-logos"
                value={form.logo_url}
                onChange={(url) => setForm({ ...form, logo_url: url })}
                maxSizeMB={5}
                aspectHint="transparent PNG/SVG, ~400×200"
              />
            </div>

            <div className="space-y-1">
              <Label>Website URL</Label>
              <Input
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-start gap-3">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">
                  Featured logos appear in the public "Trusted by Leading Hotels &amp; Restaurants" strip.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">If off, hidden everywhere on the public site.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive logo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be set to <Badge variant="secondary">Inactive</Badge> and hidden from the public site.
              The row is kept in the database — toggle Active back on to restore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) softDelete.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}