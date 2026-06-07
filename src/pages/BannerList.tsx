import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Plus, Edit, Eye, EyeOff, CalendarIcon, RotateCcw } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { format, isPast, isFuture } from "date-fns";
import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";

/* ── Position presets ── */
const POSITION_OPTIONS = [
  { value: "hero", label: "Hero Banner", dimensions: "1920×600px", ratio: "16/5", description: "Full-width homepage hero carousel" },
  { value: "promotional", label: "Promotional Strip", dimensions: "1920×200px", ratio: "48/5", description: "Thin promotional banner below hero" },
  { value: "category", label: "Category Banner", dimensions: "800×400px", ratio: "2/1", description: "Category page header image" },
];

const getPositionOption = (v: string) => POSITION_OPTIONS.find((p) => p.value === v) || POSITION_OPTIONS[0];

/* ── Link destination types ── */
const LINK_TYPES = [
  { value: "none", label: "None (display only)" },
  { value: "category", label: "Category page" },
  { value: "flash-deals", label: "Flash Deals page" },
  { value: "all-categories", label: "All Categories page" },
  { value: "custom", label: "Custom URL" },
];

const BASE_URL = BRAND.storefrontHost;

/* ── Schedule helpers ── */
function scheduleLabel(starts_at: string | null, ends_at: string | null) {
  if (starts_at && ends_at) {
    const expired = isPast(new Date(ends_at));
    const label = `${format(new Date(starts_at), "MMM d")} – ${format(new Date(ends_at), "MMM d")}`;
    return { label, expired };
  }
  if (starts_at) {
    const upcoming = isFuture(new Date(starts_at));
    return { label: `From ${format(new Date(starts_at), "MMM d")}`, expired: false, upcoming };
  }
  return { label: "Always active", expired: false };
}

/* ── Infer link type from existing URL ── */
function inferLinkType(url: string | null): string {
  if (!url) return "none";
  if (url.includes("/flash-deals")) return "flash-deals";
  if (url.includes("/categories") && !url.includes("/category/")) return "all-categories";
  if (url.includes("/category/")) return "category";
  return "custom";
}

/* ── Default form state ── */
const defaultForm = () => ({
  title: "",
  subtitle: "",
  image_url: "",
  link_url: null as string | null,
  is_active: true,
  sort_order: 0,
  position: "hero",
  starts_at: null as string | null,
  ends_at: null as string | null,
});

export default function BannerList() {
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);

  // Link destination state
  const [linkType, setLinkType] = useState("none");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  /* ── Queries ── */
  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["banner-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug").eq("depth", 0).eq("is_active", true).order("name");
      return data || [];
    },
  });

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: async (banner: any) => {
      const payload = {
        title: banner.title,
        subtitle: banner.subtitle,
        image_url: banner.image_url,
        link_url: banner.link_url,
        is_active: banner.is_active,
        sort_order: banner.sort_order,
        position: banner.position,
        starts_at: banner.starts_at,
        ends_at: banner.ends_at,
      };
      if (banner.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", banner.id);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "updated", "banner", banner.id, banner.title);
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "created", "banner", undefined, banner.title);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      setOpen(false);
      toast.success("Banner saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active, title }: { id: string; is_active: boolean; title: string }) => {
      const { error } = await supabase.from("banners").update({ is_active }).eq("id", id);
      if (error) throw error;
      if (staff) await logActivity(staff.id, is_active ? "reactivated" : "deactivated", "banner", id, title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Resolve link URL from link type state ── */
  const resolveLink = (): string | null => {
    switch (linkType) {
      case "none": return null;
      case "flash-deals": return `${BASE_URL}/flash-deals`;
      case "all-categories": return `${BASE_URL}/categories`;
      case "category": return selectedCategorySlug ? `${BASE_URL}/category/${selectedCategorySlug}` : null;
      case "custom": return customUrl || null;
      default: return null;
    }
  };

  /* ── Open dialog ── */
  const openEdit = (b?: any) => {
    if (b) {
      setEditing({ ...b });
      const lt = inferLinkType(b.link_url);
      setLinkType(lt);
      if (lt === "category" && b.link_url) {
        const slug = b.link_url.split("/category/")[1] || "";
        setSelectedCategorySlug(slug);
      } else {
        setSelectedCategorySlug("");
      }
      setCustomUrl(lt === "custom" ? (b.link_url || "") : "");
    } else {
      setEditing({ ...defaultForm() });
      setLinkType("none");
      setSelectedCategorySlug("");
      setCustomUrl("");
    }
    setOpen(true);
  };

  const handleSave = () => {
    const resolved = resolveLink();
    saveMutation.mutate({ ...editing, link_url: resolved });
  };

  /* ── Filter banners ── */
  const filtered = (banners || []).filter((b: any) => showInactive || b.is_active);
  const posOpt = editing ? getPositionOption(editing.position || "hero") : POSITION_OPTIONS[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Banners</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            Show inactive
          </label>
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="h-4 w-4 mr-1" /> Add Banner
          </Button>
        </div>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No banners yet. Click "Add Banner" to create one.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((b: any) => {
            const sched = scheduleLabel(b.starts_at, b.ends_at);
            const pos = getPositionOption(b.position || "hero");
            return (
              <Card key={b.id} className={cn("overflow-hidden transition-opacity", !b.is_active && "opacity-60")}>
                {/* Image preview */}
                <div className="relative bg-muted" style={{ aspectRatio: "16/5" }}>
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title || "Banner"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                  )}
                  {/* Overlay badges */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge variant="secondary" className="text-xs">{pos.label}</Badge>
                    {!b.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="absolute top-2 right-2">
                    {b.is_active ? (
                      <span className="flex items-center gap-1 text-xs bg-background/80 backdrop-blur rounded-full px-2 py-0.5">
                        <span className="h-2 w-2 rounded-full bg-green-500" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs bg-background/80 backdrop-blur rounded-full px-2 py-0.5">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground" /> Inactive
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="pt-3 pb-3 space-y-1.5">
                  <div className="font-medium text-foreground truncate">{b.title || "(untitled)"}</div>
                  {b.link_url && <div className="text-xs text-muted-foreground truncate">{b.link_url}</div>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    <span className={cn(sched.expired && "text-destructive")}>{sched.label}</span>
                    {sched.expired && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {b.is_active ? (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeactivateTarget(b)}>
                        <EyeOff className="h-3.5 w-3.5 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => toggleActiveMutation.mutate({ id: b.id, is_active: true, title: b.title })}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reactivate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Deactivate confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this banner?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deactivateTarget?.title || "Untitled"}" will be hidden from the E-Mall. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivateTarget) toggleActiveMutation.mutate({ id: deactivateTarget.id, is_active: false, title: deactivateTarget.title });
                setDeactivateTarget(null);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit / Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Banner</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left column — form */}
              <div className="lg:col-span-3 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Summer Sale 2026" />
                </div>

                {/* Subtitle */}
                <div className="space-y-1.5">
                  <Label>Subtitle</Label>
                  <Input value={editing.subtitle || ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="e.g. Up to 30% off selected items" />
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <Label>Position</Label>
                  <Select value={editing.position || "hero"} onValueChange={(v) => setEditing({ ...editing, position: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className="font-medium">{p.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({p.dimensions})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{posOpt.description} — recommended {posOpt.dimensions}</p>
                </div>

                {/* Image upload */}
                <div className="space-y-1.5">
                  <Label>Image</Label>
                  <ImageUpload
                    bucket="banners"
                    value={editing.image_url || ""}
                    onChange={(url) => setEditing({ ...editing, image_url: url })}
                    aspectHint={`${posOpt.dimensions} for ${posOpt.label.toLowerCase()}`}
                  />
                  <p className="text-xs text-muted-foreground/70">Use a professional marketing banner image, not a product screenshot</p>
                </div>

                {/* Click destination */}
                <div className="space-y-2">
                  <Label>Click Destination</Label>
                  <RadioGroup value={linkType} onValueChange={(v) => { setLinkType(v); if (v !== "category") setSelectedCategorySlug(""); if (v !== "custom") setCustomUrl(""); }}>
                    {LINK_TYPES.map((lt) => (
                      <div key={lt.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={lt.value} id={`link-${lt.value}`} />
                        <Label htmlFor={`link-${lt.value}`} className="font-normal cursor-pointer">{lt.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {linkType === "category" && (
                    <Select value={selectedCategorySlug} onValueChange={setSelectedCategorySlug}>
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        {(categories || []).map((c: any) => (
                          <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {linkType === "custom" && (
                    <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://..." />
                  )}

                  {linkType !== "none" && (
                    <p className="text-xs text-muted-foreground">
                      URL: {resolveLink() || "—"}
                    </p>
                  )}
                </div>

                {/* Schedule */}
                <div className="space-y-1.5">
                  <Label>Schedule (optional)</Label>
                  <p className="text-xs text-muted-foreground">Leave empty = always active</p>
                  <div className="flex gap-3">
                    <DatePickerField
                      label="Start"
                      value={editing.starts_at ? new Date(editing.starts_at) : undefined}
                      onChange={(d) => setEditing({ ...editing, starts_at: d ? d.toISOString() : null })}
                    />
                    <DatePickerField
                      label="End"
                      value={editing.ends_at ? new Date(editing.ends_at) : undefined}
                      onChange={(d) => setEditing({ ...editing, ends_at: d ? d.toISOString() : null })}
                    />
                  </div>
                </div>

                {/* Sort order + active */}
                <div className="flex items-center gap-6">
                  <div className="space-y-1.5">
                    <Label>Sort Order</Label>
                    <Input type="number" className="w-24" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>

              {/* Right column — live preview */}
              <div className="lg:col-span-2 space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Live Preview</Label>
                <div className="rounded-lg border border-border overflow-hidden bg-muted">
                  <div className="relative" style={{ aspectRatio: posOpt.ratio }}>
                    {editing.image_url ? (
                      <img src={editing.image_url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Eye className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    {(editing.title || editing.subtitle) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                        {editing.title && <h3 className="text-white font-bold text-lg leading-tight">{editing.title}</h3>}
                        {editing.subtitle && <p className="text-white/80 text-sm mt-0.5">{editing.subtitle}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Desktop preview · {posOpt.dimensions}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Date picker field ── */
function DatePickerField({ label, value, onChange }: { label: string; value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="flex-1 space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            {value ? format(value, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}
