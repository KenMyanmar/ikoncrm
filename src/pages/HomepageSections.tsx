import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Plus, Edit, Trash2, ImageIcon, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "category-images";
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;

/* ─────────────── Page ─────────────── */
export default function HomepageSections() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Homepage Sections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage category images and business type cards displayed on the storefront homepage
        </p>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Category Images</TabsTrigger>
          <TabsTrigger value="business-types">Business Types</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <CategoryImagesTab />
        </TabsContent>

        <TabsContent value="business-types" className="mt-4">
          <BusinessTypesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────── Tab 1: Category Images ─────────────── */
function CategoryImagesTab() {
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCategory = useRef<{ id: string; slug: string; name: string } | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["homepage-categories"],
    enabled: !!staff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, product_count")
        .eq("depth", 0)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const updateImage = useMutation({
    mutationFn: async ({ id, image_url, name }: { id: string; image_url: string | null; name: string }) => {
      const { error } = await supabase.from("categories").update({ image_url }).eq("id", id);
      if (error) throw error;
      if (staff) await logActivity(staff.id, "updated", "category", id, name);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homepage-categories"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const triggerUpload = (cat: { id: string; slug: string; name: string }) => {
    pendingCategory.current = cat;
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    const cat = pendingCategory.current;
    if (!cat) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images are allowed");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    setUploadingId(cat.id);
    try {
      const path = `${cat.slug}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Append a cache-buster so the UI shows the new image immediately
      const urlWithBuster = `${publicUrl}?v=${Date.now()}`;

      await updateImage.mutateAsync({ id: cat.id, image_url: urlWithBuster, name: cat.name });
      toast.success(`Image updated for ${cat.name}`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingId(null);
      pendingCategory.current = null;
    }
  };

  const handleRemove = async (cat: { id: string; name: string }) => {
    await updateImage.mutateAsync({ id: cat.id, image_url: null, name: cat.name });
    toast.success(`Image removed for ${cat.name}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading categories…
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {(categories || []).map((c: any) => {
          const isUploading = uploadingId === c.id;
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-muted relative">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div>
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.product_count ?? 0} products</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={isUploading}
                    onClick={() => triggerUpload({ id: c.id, slug: c.slug, name: c.name })}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {c.image_url ? "Change" : "Upload"}
                  </Button>
                  {c.image_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      disabled={isUploading}
                      onClick={() => handleRemove({ id: c.id, name: c.name })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ─────────────── Tab 2: Business Types ─────────────── */
type BusinessTypeRow = {
  id?: string;
  label: string;
  image_url: string | null;
  link_url: string;
  sort_order: number;
  is_active: boolean;
};

const emptyBizForm = (nextSort: number): BusinessTypeRow => ({
  label: "",
  image_url: "",
  link_url: "",
  sort_order: nextSort,
  is_active: true,
});

function BusinessTypesTab() {
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessTypeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["business-types"],
    enabled: !!staff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_types")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: BusinessTypeRow) => {
      const payload = {
        label: row.label.trim(),
        image_url: row.image_url || null,
        link_url: row.link_url.trim(),
        sort_order: row.sort_order,
        is_active: row.is_active,
      };
      if (row.id) {
        const { error } = await supabase.from("business_types").update(payload).eq("id", row.id);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "updated", "business_type", row.id, payload.label);
      } else {
        const { error } = await supabase.from("business_types").insert(payload);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "created", "business_type", undefined, payload.label);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-types"] });
      setOpen(false);
      setEditing(null);
      toast.success("Business type saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from("business_types").delete().eq("id", row.id);
      if (error) throw error;
      if (staff) await logActivity(staff.id, "deleted", "business_type", row.id, row.label);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-types"] });
      setDeleteTarget(null);
      toast.success("Business type removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    const maxSort = (items || []).reduce((m: number, r: any) => Math.max(m, r.sort_order || 0), -1);
    setEditing(emptyBizForm(maxSort + 1));
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing({ ...row });
    setOpen(true);
  };

  const handleSave = () => {
    if (!editing) return;
    if (!editing.label.trim()) return toast.error("Label is required");
    if (!editing.link_url.trim()) return toast.error("Link URL is required");
    saveMutation.mutate(editing);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Business Type
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (items || []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No business types yet. Click "Add Business Type" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items || []).map((b: any) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-muted">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{b.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.link_url}</div>
                  </div>
                  <Badge variant={b.is_active ? "secondary" : "outline"} className="text-[10px] shrink-0">
                    {b.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sort: {b.sort_order}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => openEdit(b)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(b)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "Add"} Business Type</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="e.g. Hotel"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Image</Label>
                <ImageUpload
                  bucket={BUCKET}
                  folder="business-types"
                  value={editing.image_url || ""}
                  onChange={(url) => setEditing({ ...editing, image_url: url })}
                  aspectHint="4:3 or square, ~800×600px"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Link URL *</Label>
                <Input
                  value={editing.link_url}
                  onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                  placeholder="/category/tableware"
                />
                <p className="text-xs text-muted-foreground">
                  Internal path like <code>/category/tableware</code> or full URL
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Active</Label>
                  <div className="h-10 flex items-center">
                    <Switch
                      checked={editing.is_active}
                      onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.label} from Business Types?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the card from the storefront homepage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
