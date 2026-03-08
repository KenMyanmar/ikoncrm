import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, ArrowRight, ArrowLeft } from "lucide-react";

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [form, setForm] = useState<any>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (product) setForm({ ...product });
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: async (andNext: boolean) => {
      if (!form || !id || !staff) return;
      const { error } = await supabase.from("products").update({
        description: form.description,
        short_description: form.short_description,
        long_description: form.long_description,
        selling_price: form.selling_price ? Number(form.selling_price) : null,
        stock_status: form.stock_status,
        is_featured: form.is_featured,
        is_active: form.is_active,
        tags: form.tags || [],
        last_enriched_at: new Date().toISOString(),
        enriched_by: staff.id,
      } as any).eq("id", id);

      if (error) throw error;

      // recalculate completeness
      await supabase.rpc("calculate_data_completeness", { _product_id: id });

      await logActivity(staff.id, "updated", "product", id, form.stock_code);

      if (andNext) {
        const { data: next } = await supabase
          .from("products")
          .select("id")
          .lt("data_completeness", 50)
          .neq("id", id)
          .order("data_completeness", { ascending: true })
          .limit(1)
          .single();
        if (next) navigate(`/products/${next.id}`, { replace: true });
        else toast.info("All products enriched above 50%!");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const update = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/products")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{form.stock_code}</h1>
            <p className="text-sm text-muted-foreground truncate max-w-md">{form.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Progress value={form.data_completeness} className="h-2 w-20" />
            <span className="text-xs text-muted-foreground">{form.data_completeness}%</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
            Save & Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Images</CardTitle></CardHeader>
            <CardContent>
              {form.thumbnail_url ? (
                <img src={form.thumbnail_url} className="rounded-lg w-full aspect-square object-cover" alt="" />
              ) : (
                <div className="rounded-lg w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Image upload coming in next iteration.</p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Stock Code</Label><Input value={form.stock_code} disabled className="bg-muted" /></div>
                <div><Label className="text-xs">Slug</Label><Input value={form.slug} disabled className="bg-muted" /></div>
              </div>
              <div><Label className="text-xs">Description</Label><Textarea value={form.description || ""} onChange={e => update("description", e.target.value)} rows={3} /></div>
              <div><Label className="text-xs">Short Description</Label><Textarea value={form.short_description || ""} onChange={e => update("short_description", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Long Description</Label><Textarea value={form.long_description || ""} onChange={e => update("long_description", e.target.value)} rows={4} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Pricing & Inventory</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs">Selling Price</Label><Input type="number" value={form.selling_price ?? ""} onChange={e => update("selling_price", e.target.value)} /></div>
                <div><Label className="text-xs">Currency</Label><Input value={form.currency} disabled className="bg-muted" /></div>
                <div><Label className="text-xs">Stock Status</Label><Input value={form.stock_status} onChange={e => update("stock_status", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs">On Hand</Label><Input value={form.onhand_qty} disabled className="bg-muted" /></div>
                <div><Label className="text-xs">MOQ</Label><Input value={form.moq} disabled className="bg-muted" /></div>
                <div><Label className="text-xs">Unit Cost</Label><Input value={form.unit_cost} disabled className="bg-muted" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Toggles</CardTitle></CardHeader>
            <CardContent className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={v => update("is_featured", v)} />
                <Label className="text-xs">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => update("is_active", v)} />
                <Label className="text-xs">Active</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
