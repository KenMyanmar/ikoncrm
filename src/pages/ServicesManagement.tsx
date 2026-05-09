import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as LucideIcons from "lucide-react";
import {
  Briefcase, Plus, Pencil, Trash2, Star, ArrowUp, ArrowDown, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
// once we have 4+ content types behind it (Articles, Banners, Care Tips, Services...).

type ServiceRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  icon: string | null;
  image_url: string | null;
  cta_label: string;
  cta_query: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  updated_at: string;
};

type Filter = "all" | "active" | "inactive" | "featured";

interface FormState {
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  icon: string;
  image_url: string;
  cta_label: string;
  cta_query: string;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
}

const emptyForm: FormState = {
  title: "",
  slug: "",
  short_description: "",
  long_description: "",
  icon: "",
  image_url: "",
  cta_label: "Request a Quote",
  cta_query: "",
  sort_order: 100,
  is_featured: false,
  is_active: true,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SLUG_RE = /^[a-z0-9-]+$/;

function relativeTime(iso: string) {
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

function pascal(name: string) {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function lookupLucideIcon(name: string): React.ComponentType<{ className?: string }> | null {
  if (!name) return null;
  const trimmed = name.trim();
  const candidates = [trimmed, pascal(trimmed)];
  for (const c of candidates) {
    const Comp = (LucideIcons as Record<string, unknown>)[c];
    if (typeof Comp === "object" || typeof Comp === "function") {
      return Comp as React.ComponentType<{ className?: string }>;
    }
  }
  return null;
}

export default function ServicesManagement() {
  const qc = useQueryClient();
  const { staff } = useStaff();
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string>("");
  const [originalImage, setOriginalImage] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveAndNew, setSaveAndNew] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      return (data || []) as ServiceRow[];
    },
    enabled: !!staff,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-services"] });

  const counts = useMemo(() => ({
    all: services.length,
    active: services.filter((s) => s.is_active).length,
    inactive: services.filter((s) => !s.is_active).length,
    featured: services.filter((s) => s.is_featured).length,
  }), [services]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active": return services.filter((s) => s.is_active);
      case "inactive": return services.filter((s) => !s.is_active);
      case "featured": return services.filter((s) => s.is_featured);
      default: return services;
    }
  }, [services, filter]);

  const toggleActive = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("services")
        .update({ is_active: value, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reorder = useMutation({
    mutationFn: async (rows: ServiceRow[]) => {
      // Persist a freshly-numbered sort_order for the entire visible list (10-step increments).
      const updates = rows.map((s, i) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        sort_order: (i + 1) * 10,
      }));
      const { error } = await supabase.from("services").upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...services];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    reorder.mutate(next);
  };

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Service archived", description: "Set to inactive — not hard-deleted." });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setOriginalSlug("");
    setOriginalImage("");
    setSlugTouched(false);
    setSlugError(null);
    setForm({ ...emptyForm, sort_order: (services.length + 1) * 10 });
    setDialogOpen(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditingId(s.id);
    setOriginalSlug(s.slug);
    setOriginalImage(s.image_url || "");
    setSlugTouched(true);
    setSlugError(null);
    setForm({
      title: s.title,
      slug: s.slug,
      short_description: s.short_description || "",
      long_description: s.long_description || "",
      icon: s.icon || "",
      image_url: s.image_url || "",
      cta_label: s.cta_label || "Request a Quote",
      cta_query: s.cta_query || "",
      sort_order: s.sort_order ?? 100,
      is_featured: !!s.is_featured,
      is_active: !!s.is_active,
    });
    setDialogOpen(true);
  };

  const handleTitleChange = (v: string) => {
    setForm((f) => ({
      ...f,
      title: v,
      slug: slugTouched ? f.slug : slugify(v),
    }));
  };

  const validateSlug = async () => {
    const v = form.slug.trim();
    if (!v) { setSlugError("Slug is required"); return false; }
    if (!SLUG_RE.test(v)) { setSlugError("Lowercase letters, numbers, and dashes only"); return false; }
    let q = supabase.from("services").select("id").eq("slug", v);
    if (editingId) q = q.neq("id", editingId);
    const { data, error } = await q.maybeSingle();
    if (error && error.code !== "PGRST116") { setSlugError(error.message); return false; }
    if (data) { setSlugError("Slug already in use"); return false; }
    setSlugError(null);
    return true;
  };

  const deleteOldImage = async (oldUrl: string) => {
    // Public URL pattern: .../storage/v1/object/public/service-images/<path>
    const marker = "/service-images/";
    const idx = oldUrl.indexOf(marker);
    if (idx === -1) return;
    const path = oldUrl.slice(idx + marker.length);
    if (!path) return;
    await supabase.storage.from("service-images").remove([path]);
  };

  const handleSave = async (alsoNew: boolean) => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const ok = await validateSlug();
    if (!ok) { toast({ title: "Fix slug", description: slugError || "Invalid slug", variant: "destructive" }); return; }

    setSaving(true);
    setSaveAndNew(alsoNew);
    try {
      const cta_query = form.cta_query.trim() || `service=${form.slug.trim()}`;
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        short_description: form.short_description.trim() || null,
        long_description: form.long_description.trim() || null,
        icon: form.icon.trim() || null,
        image_url: form.image_url || null,
        cta_label: form.cta_label.trim() || "Request a Quote",
        cta_query,
        sort_order: Number(form.sort_order) || 100,
        is_featured: form.is_featured,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from("services").update(payload).eq("id", editingId);
        if (error) throw error;
        // Replace stale image only after a successful update.
        if (originalImage && originalImage !== form.image_url) {
          await deleteOldImage(originalImage);
        }
        toast({ title: "Service saved" });
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
        toast({ title: "Service created" });
      }
      invalidate();

      if (alsoNew) {
        setEditingId(null);
        setOriginalSlug("");
        setOriginalImage("");
        setSlugTouched(false);
        setSlugError(null);
        setForm({ ...emptyForm, sort_order: ((services.length || 0) + 2) * 10 });
      } else {
        setDialogOpen(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
      setSaveAndNew(false);
    }
  };

  const IconPreview = lookupLucideIcon(form.icon);
  const iconUnknown = !!form.icon.trim() && !IconPreview;

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
            <Briefcase className="h-6 w-6 text-primary" /> Services
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the services shown on the public /services page.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Service
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
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No services yet</p>
              <p className="text-sm text-muted-foreground">Create the first service to populate the public page.</p>
            </div>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Create your first service</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No services match this filter.</CardContent></Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2 w-16">Order</th>
                <th className="px-2 py-2 w-20">Image</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Slug</th>
                <th className="px-2 py-2">Featured</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-3 py-2 text-left">CTA Query</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-2 py-2 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const fullIdx = services.findIndex((x) => x.id === s.id);
                const RowIcon = lookupLucideIcon(s.icon || "");
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-6 text-right">{s.sort_order}</span>
                        <div className="flex flex-col">
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={fullIdx <= 0 || filter !== "all"} onClick={() => move(fullIdx, -1)}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={fullIdx >= services.length - 1 || filter !== "all"} onClick={() => move(fullIdx, 1)}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="h-10 w-16 object-cover rounded" />
                      ) : RowIcon ? (
                        <div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
                          <RowIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{s.title}</div>
                      {s.short_description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{s.short_description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.slug}</td>
                    <td className="px-2 py-2 text-center">
                      {s.is_featured && <Star className="h-4 w-4 text-amber-500 inline-block fill-amber-500" />}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs ${s.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <span className={`h-2 w-2 rounded-full ${s.is_active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.cta_query || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{relativeTime(s.updated_at)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: s.id, value: v })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
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
              Switch to "All" to reorder services.
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "New Service"}</DialogTitle>
            <DialogDescription>
              Long descriptions render as plain text (whitespace preserved) on the storefront. HTML is not parsed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Commercial Kitchen Design & Installation" />
            </div>
            <div className="space-y-1">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); setSlugError(null); }}
                onBlur={validateSlug}
                placeholder="kitchen-design-installation"
                className={slugError ? "border-destructive" : ""}
              />
              {slugError && <p className="text-xs text-destructive">{slugError}</p>}
              {!slugError && originalSlug && originalSlug !== form.slug && (
                <p className="text-xs text-amber-600">Changing the slug will break existing links.</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Short description *</Label>
              <Textarea
                rows={2}
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                placeholder="One or two lines for the service card."
              />
              {form.short_description.length > 200 && (
                <p className="text-xs text-amber-600">{form.short_description.length} chars — recommended ≤ 200.</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Long description</Label>
              <Textarea
                rows={8}
                value={form.long_description}
                onChange={(e) => setForm({ ...form, long_description: e.target.value })}
                placeholder="Full body copy — plain text, line breaks preserved."
              />
              <p className="text-xs text-muted-foreground">
                Rendered with <code>whitespace-pre-wrap</code> on the storefront. Do not paste HTML — tags will appear as text.
              </p>
            </div>

            <div className="space-y-1">
              <Label>Lucide icon name</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="Wrench, ChefHat, Truck…"
                />
                <div className="h-10 w-10 rounded border border-border flex items-center justify-center shrink-0">
                  {IconPreview ? <IconPreview className="h-5 w-5 text-foreground" /> : <span className="text-xs text-muted-foreground">?</span>}
                </div>
              </div>
              {iconUnknown && <p className="text-xs text-amber-600">Unknown icon name — check spelling (PascalCase or kebab-case).</p>}
            </div>

            <div className="space-y-1">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Hero image</Label>
              <ImageUpload
                bucket="service-images"
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                maxSizeMB={10}
                aspectHint="1200×800"
              />
              <p className="text-xs text-muted-foreground">If set, replaces the icon on the service card.</p>
            </div>

            <div className="space-y-1">
              <Label>CTA label</Label>
              <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>CTA query</Label>
              <Input
                value={form.cta_query}
                onChange={(e) => setForm({ ...form, cta_query: e.target.value })}
                placeholder={`service=${form.slug || "slug"}`}
              />
              <p className="text-xs text-muted-foreground">Auto-fills <code>service={form.slug || "slug"}</code> on save when blank.</p>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Featured cards render before non-featured.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">If off, hidden on /services.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSave(true)} disabled={saving}>
              {saving && saveAndNew ? "Saving…" : "Save & New"}
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {saving && !saveAndNew ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft-delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive service?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be set to <Badge variant="secondary">Inactive</Badge> and hidden from the public /services page.
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