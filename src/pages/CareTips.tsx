import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check, AlertTriangle, Info, Star, Shield, Plus, Pencil, Trash2, Heart,
} from "lucide-react";

const ICON_OPTIONS = [
  { value: "check", label: "Check", Icon: Check },
  { value: "alert-triangle", label: "Alert", Icon: AlertTriangle },
  { value: "info", label: "Info", Icon: Info },
  { value: "star", label: "Star", Icon: Star },
  { value: "shield", label: "Shield", Icon: Shield },
];

const getIcon = (name: string) => {
  const found = ICON_OPTIONS.find((o) => o.value === name);
  return found ? found.Icon : Check;
};

interface TipForm {
  title: string;
  tip_text: string;
  icon: string;
  sort_order: number;
}

const emptyForm: TipForm = { title: "", tip_text: "", icon: "check", sort_order: 0 };

export default function CareTips() {
  const qc = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TipForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["main-categories-care"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("depth", 0)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: tips } = useQuery({
    queryKey: ["care-tips", selectedCategoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_care_tips")
        .select("*")
        .eq("category_id", selectedCategoryId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCategoryId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["care-tips", selectedCategoryId] });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("category_care_tips")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("category_care_tips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tip deleted" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    const existingTitle = tips?.length ? tips[0].title : "";
    setEditingId(null);
    setForm({ ...emptyForm, title: existingTitle, sort_order: (tips?.length || 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (tip: any) => {
    setEditingId(tip.id);
    setForm({ title: tip.title, tip_text: tip.tip_text, icon: tip.icon || "check", sort_order: tip.sort_order || 0 });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tip_text.trim()) {
      toast({ title: "Tip text is required", variant: "destructive" });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("category_care_tips")
          .update({ tip_text: form.tip_text, icon: form.icon, sort_order: form.sort_order, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        // Batch update title for all tips in this category
        const existingTitle = tips?.find((t) => t.id === editingId)?.title;
        if (existingTitle !== form.title) {
          const { error: titleErr } = await supabase
            .from("category_care_tips")
            .update({ title: form.title, updated_at: new Date().toISOString() })
            .eq("category_id", selectedCategoryId);
          if (titleErr) throw titleErr;
        }
        toast({ title: "Tip updated" });
      } else {
        // If title differs from existing tips, batch update all
        if (tips?.length && tips[0].title !== form.title) {
          await supabase
            .from("category_care_tips")
            .update({ title: form.title, updated_at: new Date().toISOString() })
            .eq("category_id", selectedCategoryId);
        }
        const { error } = await supabase.from("category_care_tips").insert({
          category_id: selectedCategoryId,
          title: form.title,
          tip_text: form.tip_text,
          icon: form.icon,
          sort_order: form.sort_order,
          is_active: true,
        });
        if (error) throw error;
        toast({ title: "Tip added" });
      }
      invalidate();
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const categoryName = categories?.find((c) => c.id === selectedCategoryId)?.name || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" /> Care Tips
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product care tips shown on the E-Mall
          </p>
        </div>
      </div>

      {/* Category selector */}
      <div className="max-w-sm">
        <Label>Select Category</Label>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a category..." />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tips list */}
      {selectedCategoryId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {categoryName} — {tips?.[0]?.title || "Care Tips"}
            </h2>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Tip
            </Button>
          </div>

          {!tips?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No care tips yet. Add your first tip.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tips.map((tip) => {
                const TipIcon = getIcon(tip.icon || "check");
                return (
                  <Card key={tip.id} className={tip.is_active ? "" : "opacity-50"}>
                    <CardContent className="py-4 flex items-start gap-4">
                      <div className="mt-1 rounded-md bg-primary/10 p-2">
                        <TipIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{tip.tip_text}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{tip.icon}</Badge>
                          <span>Sort: {tip.sort_order}</span>
                          {!tip.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={tip.is_active ?? true}
                          onCheckedChange={() => toggleMutation.mutate({ id: tip.id, is_active: tip.is_active ?? true })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tip)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: tip.id, title: tip.tip_text.slice(0, 40) })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {tips?.filter((t) => t.is_active).length || 0} active tips
          </p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Care Tip" : "Add Care Tip"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Input value={categoryName} disabled />
            </div>
            <div>
              <Label>Section Title (shared across all tips)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Linen & Textile Care" />
            </div>
            <div>
              <Label>Tip Text</Label>
              <Textarea value={form.tip_text} onChange={(e) => setForm({ ...form, tip_text: e.target.value })} rows={3} placeholder="Care tip content..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <o.Icon className="h-3 w-3" /> {o.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Tip"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Care Tip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This tip is currently shown on the E-Mall.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
