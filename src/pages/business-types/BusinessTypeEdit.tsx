import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/ImageUpload";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

/**
 * Canonical slugify for business_types.
 * NOTE: The Step 3 storefront landing page must use this exact same logic
 * to compute route slugs from labels. Keep in sync across repos.
 */
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const LINK_REGEX = /^(\/business\/[a-z0-9-]+|\/category\/[a-z0-9-]+|https?:\/\/.+)$/;

const normalizeLink = (s: string) =>
  s.trim().toLowerCase().replace(/\/+$/, "");

type Form = {
  label: string;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm = (): Form => ({
  label: "",
  image_url: "",
  link_url: "",
  sort_order: 0,
  is_active: false,
});

export default function BusinessTypeEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();

  const [form, setForm] = useState<Form>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["business-type", id],
    enabled: !!id && !!staff,
    queryFn: async () => {
      const { data, error } = await supabase.from("business_types").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      setForm({
        label: existing.label,
        image_url: existing.image_url || "",
        link_url: existing.link_url,
        sort_order: existing.sort_order,
        is_active: existing.is_active,
      });
    } else if (isNew) {
      setForm(emptyForm());
    }
  }, [existing, isNew]);

  const validate = (): string | null => {
    const label = form.label.trim();
    if (!label) return "Label is required";
    if (label.length > 60) return "Label must be 60 characters or less";
    if (!form.link_url.trim()) return "Link URL is required";
    if (!LINK_REGEX.test(form.link_url.trim())) {
      return "Link URL must look like /business/<slug>, /category/<slug>, or https://…";
    }
    if (!Number.isInteger(form.sort_order) || form.sort_order < 0) {
      return "Sort order must be an integer ≥ 0";
    }
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        label: f.label.trim(),
        image_url: f.image_url || null,
        link_url: f.link_url.trim(),
        sort_order: f.sort_order,
        is_active: f.is_active,
      };
      if (id) {
        const { error } = await supabase.from("business_types").update(payload).eq("id", id);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "updated", "business_type", id, payload.label);
        return { id };
      } else {
        const { data, error } = await supabase.from("business_types").insert(payload).select("id").single();
        if (error) throw error;
        if (staff) await logActivity(staff.id, "created", "business_type", data.id, payload.label);
        return { id: data.id };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-types"] });
      if (id) queryClient.invalidateQueries({ queryKey: ["business-type", id] });
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { error } = await supabase.from("business_types").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      if (staff) await logActivity(staff.id, "deactivated", "business_type", id, form.label);
    },
    onSuccess: () => {
      toast.success("Business type deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin-business-types"] });
      navigate("/business-types");
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  const handleSave = async (then: "list" | "new") => {
    const err = validate();
    if (err) { toast.error(err); return; }
    await saveMutation.mutateAsync(form);
    toast.success("Business type saved");
    if (then === "list") navigate("/business-types");
    else { setForm(emptyForm()); if (id) navigate("/business-types/new"); }
  };

  const slugForFile = slugify(form.label || "business-type");
  const fileName = `business-types/${slugForFile}-${Date.now()}`;

  if (id && isLoading) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>;
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/business-types")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-foreground">{isNew ? "New" : "Edit"} Business Type</h1>
        <div className="w-[80px]" />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Label */}
          <div className="space-y-1.5">
            <Label>Label *</Label>
            <Input
              value={form.label}
              maxLength={60}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Hotel"
            />
            <p className="text-xs text-muted-foreground">{form.label.length}/60 — shown on the homepage card</p>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Image</Label>
            <ImageUpload
              bucket="category-images"
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              fileName={fileName}
              aspectHint="Square (1:1) recommended"
            />
            <p className="text-xs text-muted-foreground/70">Saved to <code>category-images/business-types/&lt;slug&gt;-&lt;ts&gt;</code></p>
          </div>

          {/* Link URL */}
          <div className="space-y-1.5">
            <Label>Link URL *</Label>
            <Input
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              onBlur={(e) => setForm({ ...form, link_url: normalizeLink(e.target.value) })}
              placeholder="/business/hotel"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Must start with <code>/business/</code>, <code>/category/</code>, or <code>https://</code> — and include a slug
            </p>
          </div>

          {/* Sort order */}
          <div className="space-y-1.5">
            <Label>Sort Order *</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value || "0", 10) })}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
          </div>

          {/* Active */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">When off, the card is hidden from the storefront</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave("new")} disabled={saveMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Save & New
          </Button>
          <Button onClick={() => handleSave("list")} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this business type?</AlertDialogTitle>
            <AlertDialogDescription>
              "{form.label}" will be hidden from the storefront. The row stays in the database (soft delete) and can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDelete(false); deleteMutation.mutate(); }}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}