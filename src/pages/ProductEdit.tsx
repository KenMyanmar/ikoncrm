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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowRight, ArrowLeft, Plus, Trash2, X, Star } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { FileUpload } from "@/components/ui/FileUpload";

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [form, setForm] = useState<any>(null);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch dropdown data
  const { data: brands } = useQuery({
    queryKey: ["brands-list"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-list-hierarchy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, depth, parent_id")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["groups-list"],
    queryFn: async () => {
      const { data } = await supabase.from("product_groups").select("id, name").order("name");
      return data || [];
    },
  });

  // Initialize form & specs from product
  useEffect(() => {
    if (product) {
      setForm({ ...product });
      if (product.specifications && typeof product.specifications === "object" && !Array.isArray(product.specifications)) {
        const entries = Object.entries(product.specifications as Record<string, string>);
        setSpecs(entries.map(([key, value]) => ({ key, value: String(value) })));
      } else {
        setSpecs([]);
      }
    }
  }, [product]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (andNext: boolean) => {
      if (!form || !id || !staff) return;

      const specsObj = Object.fromEntries(
        specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value.trim()])
      );

      const { error } = await supabase
        .from("products")
        .update({
          description: form.description,
          short_description: form.short_description,
          long_description: form.long_description,
          other_code: form.other_code,
          brand_id: form.brand_id || null,
          category_id: form.category_id || null,
          group_id: form.group_id || null,
          unit_of_measure: form.unit_of_measure,
          packing: form.packing,
          item_type: form.item_type,
          main_vendor: form.main_vendor,
          moq: form.moq ? Number(form.moq) : 1,
          selling_price: form.selling_price ? Number(form.selling_price) : null,
          currency: form.currency || "MMK",
          unit_cost: form.unit_cost ? Number(form.unit_cost) : 0,
          stock_status: form.stock_status,
          onhand_qty: form.onhand_qty ? Number(form.onhand_qty) : 0,
          min_qty: form.min_qty ? Number(form.min_qty) : 0,
          max_qty: form.max_qty ? Number(form.max_qty) : 0,
          reorder_qty: form.reorder_qty ? Number(form.reorder_qty) : 0,
          specifications: specsObj,
          datasheet_url: form.datasheet_url,
          features: form.features || null,
          thumbnail_url: form.thumbnail_url,
          images: Array.isArray(form.images) ? form.images : [],
          is_featured: form.is_featured,
          is_active: form.is_active,
          tags: form.tags || [],
          last_enriched_at: new Date().toISOString(),
          enriched_by: staff.id,
        } as any)
        .eq("id", id);

      if (error) throw error;

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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const update = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !(form.tags || []).includes(tag)) {
      update("tags", [...(form.tags || []), tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    update("tags", (form.tags || []).filter((t: string) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const addSpec = () => setSpecs([...specs, { key: "", value: "" }]);
  const removeSpec = (index: number) => setSpecs(specs.filter((_, i) => i !== index));
  const updateSpec = (index: number, field: "key" | "value", val: string) => {
    const updated = [...specs];
    updated[index][field] = val;
    setSpecs(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
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

      {/* Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Images */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Images</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs mb-1 block">Thumbnail</Label>
                <ImageUpload bucket="product-images" folder="thumbnails" value={form.thumbnail_url || ""} onChange={(url) => update("thumbnail_url", url)} aspectHint="Square 800×800px" />
              </div>
              <div>
                <Label className="text-xs mb-2 block">Gallery Images</Label>
                {(() => {
                  const images: string[] = Array.isArray(form.images) ? form.images : [];
                  return (
                    <>
                      {images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {images.map((url: string, idx: number) => (
                            <div key={idx} className="relative group rounded-md overflow-hidden border border-border aspect-square bg-muted">
                              <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    update("thumbnail_url", url);
                                    toast.success("Set as thumbnail");
                                  }}
                                  className="p-1 rounded bg-background/80 hover:bg-background"
                                  title="Set as thumbnail"
                                >
                                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newImages = images.filter((_: string, i: number) => i !== idx);
                                    update("images", newImages);
                                  }}
                                  className="p-1 rounded bg-background/80 hover:bg-background"
                                  title="Remove"
                                >
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <ImageUpload
                        bucket="product-images"
                        folder="gallery"
                        value=""
                        onChange={(url) => {
                          const newImages = [...images, url];
                          update("images", newImages);
                          if (!form.thumbnail_url) update("thumbnail_url", url);
                        }}
                        aspectHint="Add gallery image"
                      />
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Toggles */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Toggles & Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Active (visible on E-Mall)</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Featured (Best Seller badge)</Label>
                <Switch checked={form.is_featured} onCheckedChange={(v) => update("is_featured", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addTag} type="button">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(form.tags || []).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {(!form.tags || form.tags.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">No tags yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Stock Code</Label>
                  <Input value={form.stock_code} disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs">Slug</Label>
                  <Input value={form.slug} disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs">Alt Code</Label>
                  <Input value={form.other_code || ""} onChange={(e) => update("other_code", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Short Description</Label>
                <Textarea value={form.short_description || ""} onChange={(e) => update("short_description", e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Long Description</Label>
                <Textarea value={form.long_description || ""} onChange={(e) => update("long_description", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          {/* Product Details */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Product Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Brand</Label>
                  <Select value={form.brand_id || ""} onValueChange={(v) => update("brand_id", v || null)}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      {(brands || []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category_id || ""} onValueChange={(v) => update("category_id", v || null)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const cats = categories || [];
                        const parents = cats.filter(c => (c.depth ?? 0) === 0);
                        const children = cats.filter(c => (c.depth ?? 0) === 1);
                        const childrenByParent = new Map<string, typeof cats>();
                        children.forEach(c => {
                          const list = childrenByParent.get(c.parent_id!) || [];
                          list.push(c);
                          childrenByParent.set(c.parent_id!, list);
                        });
                        return parents.map(p => {
                          const subs = childrenByParent.get(p.id) || [];
                          if (subs.length === 0) {
                            return <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>;
                          }
                          return (
                            <div key={p.id}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{p.name}</div>
                              {subs.map(s => (
                                <SelectItem key={s.id} value={s.id} className="pl-6">{s.name}</SelectItem>
                              ))}
                            </div>
                          );
                        });
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Group</Label>
                  <Select value={form.group_id || ""} onValueChange={(v) => update("group_id", v || null)}>
                    <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                    <SelectContent>
                      {(groups || []).map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Unit of Measure</Label>
                  <Input value={form.unit_of_measure || ""} onChange={(e) => update("unit_of_measure", e.target.value)} placeholder="e.g. Pcs, Box" />
                </div>
                <div>
                  <Label className="text-xs">Packing</Label>
                  <Input value={form.packing || ""} onChange={(e) => update("packing", e.target.value)} placeholder="e.g. 6 pcs/box" />
                </div>
                <div>
                  <Label className="text-xs">Item Type</Label>
                  <Input value={form.item_type || ""} onChange={(e) => update("item_type", e.target.value)} placeholder="e.g. Finished Good" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">MOQ</Label>
                  <Input type="number" value={form.moq ?? ""} onChange={(e) => update("moq", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Main Vendor</Label>
                  <Input value={form.main_vendor || ""} onChange={(e) => update("main_vendor", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Selling Price</Label>
                  <Input type="number" value={form.selling_price ?? ""} onChange={(e) => update("selling_price", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={form.currency || "MMK"} onValueChange={(v) => update("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MMK">MMK</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Unit Cost</Label>
                  <Input type="number" value={form.unit_cost ?? ""} onChange={(e) => update("unit_cost", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Specifications</CardTitle>
                <Button variant="outline" size="sm" onClick={addSpec} type="button">
                  <Plus className="h-4 w-4 mr-1" /> Add Spec
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {specs.map((spec, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Key (e.g. Material)"
                    value={spec.key}
                    onChange={(e) => updateSpec(i, "key", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value (e.g. Stainless Steel)"
                    value={spec.value}
                    onChange={(e) => updateSpec(i, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeSpec(i)} type="button">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {specs.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No specifications. Click "Add Spec" to add.</p>
              )}
            </CardContent>
          </Card>

          {/* Stock & Inventory */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Stock & Inventory</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-1">
                  <Label className="text-xs">Stock Status</Label>
                  <Select value={form.stock_status || "in_stock"} onValueChange={(v) => update("stock_status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      <SelectItem value="pre_order">Pre-Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">On-hand Qty</Label>
                  <Input type="number" value={form.onhand_qty ?? ""} onChange={(e) => update("onhand_qty", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Reorder Qty</Label>
                  <Input type="number" value={form.reorder_qty ?? ""} onChange={(e) => update("reorder_qty", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Min Qty</Label>
                  <Input type="number" value={form.min_qty ?? ""} onChange={(e) => update("min_qty", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Max Qty</Label>
                  <Input type="number" value={form.max_qty ?? ""} onChange={(e) => update("max_qty", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Additional</CardTitle></CardHeader>
            <CardContent>
              <div>
                <Label className="text-xs">Datasheet</Label>
                <FileUpload
                  bucket="product-images"
                  folder="datasheets"
                  value={form.datasheet_url || ""}
                  onChange={(url) => update("datasheet_url", url)}
                  maxSizeMB={10}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  label="PDF, DOC, XLS — Max 10MB"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
