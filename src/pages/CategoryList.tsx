import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, ChevronRight, ChevronDown, Trash2, FolderOpen } from "lucide-react";

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
  depth: number | null;
  parent_id: string | null;
  group_id: string | null;
  image_url: string | null;
}

interface ProductGroup {
  id: string;
  name: string;
  sort_order: number;
}

export default function CategoryList() {
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, description, is_active, sort_order, product_count, depth, parent_id, group_id, image_url")
        .order("sort_order");
      return (data || []) as Category[];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["product-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("product_groups").select("id, name, sort_order").order("sort_order");
      return (data || []) as ProductGroup[];
    },
  });

  // Build tree structure grouped by product_groups
  const tree = useMemo(() => {
    if (!categories || !groups) return [];

    const parents = categories.filter(c => (c.depth ?? 0) === 0);
    const children = categories.filter(c => (c.depth ?? 0) === 1);
    const childrenByParent = new Map<string, Category[]>();
    children.forEach(c => {
      const list = childrenByParent.get(c.parent_id!) || [];
      list.push(c);
      childrenByParent.set(c.parent_id!, list);
    });

    const ungroupedParents = parents.filter(p => !p.group_id);

    return [
      ...groups.map(g => ({
        group: g,
        parents: parents
          .filter(p => p.group_id === g.id)
          .map(p => ({ ...p, children: childrenByParent.get(p.id) || [] })),
      })),
      ...(ungroupedParents.length > 0 ? [{
        group: { id: "__ungrouped", name: "Ungrouped", sort_order: 999 } as ProductGroup,
        parents: ungroupedParents.map(p => ({ ...p, children: childrenByParent.get(p.id) || [] })),
      }] : []),
    ].filter(g => g.parents.length > 0);
  }, [categories, groups]);

  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (categories || []).filter(c => (c.depth ?? 0) === 1 && c.parent_id).forEach(c => {
      map.set(c.parent_id!, (map.get(c.parent_id!) || 0) + 1);
    });
    return map;
  }, [categories]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (cat: any) => {
      const resolvedParentId = cat.parent_id === "none" ? null : (cat.parent_id || null);
      const slug = cat.slug?.trim() || generateSlug(cat.name);
      const payload = {
        name: cat.name,
        slug,
        description: cat.description,
        is_active: cat.is_active,
        sort_order: cat.sort_order || 0,
        group_id: cat.group_id === "none" ? null : (cat.group_id || null),
        parent_id: resolvedParentId,
        depth: resolvedParentId ? 1 : 0,
        image_url: cat.image_url || null,
      };
      if (cat.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", cat.id);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "updated", "category", cat.id, cat.name);
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "created", "category", undefined, cat.name);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setOpen(false);
      toast.success("Category saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (cat: any) => {
      const cc = childCountMap.get(cat.id) || 0;
      if (cc > 0) {
        throw new Error(`This category has ${cc} sub-categories. Delete them first.`);
      }
      const { error } = await supabase.from("categories").delete().eq("id", cat.id);
      if (error) throw error;
      if (staff) await logActivity(staff.id, "deleted", "category", cat.id, cat.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setOpen(false);
      toast.success("Category deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (cat?: any) => {
    if (cat) {
      setEditing({ ...cat, parent_id: cat.parent_id || "none", group_id: cat.group_id || "none" });
    } else {
      setEditing({ name: "", slug: "", description: "", is_active: true, sort_order: 0, group_id: "none", parent_id: "none", image_url: null });
    }
    setOpen(true);
  };

  const parentOptions = useMemo(() => {
    return (categories || []).filter(c => (c.depth ?? 0) === 0 && c.id !== editing?.id);
  }, [categories, editing?.id]);

  const hasChildren = editing?.id ? (childCountMap.get(editing.id) || 0) > 0 : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <Button size="sm" onClick={() => openEdit()}>
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.map(({ group, parents }) => (
                <>
                  {/* Group header */}
                  <TableRow key={`g-${group.id}`} className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={7} className="py-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">{group.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{parents.length}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Parent categories */}
                  {parents.map(parent => (
                    <>
                      <TableRow key={parent.id} className="cursor-pointer">
                        <TableCell className="w-8 px-2">
                          {parent.children.length > 0 ? (
                            <button onClick={() => toggleExpand(parent.id)} className="p-0.5 rounded hover:bg-muted">
                              {expandedIds.has(parent.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          ) : <div className="w-5" />}
                        </TableCell>
                        <TableCell className="font-medium">{parent.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{parent.slug}</TableCell>
                        <TableCell>{parent.product_count}</TableCell>
                        <TableCell>{parent.is_active ? "✓" : "—"}</TableCell>
                        <TableCell>{parent.sort_order}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(parent)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(parent)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Sub-categories */}
                      {expandedIds.has(parent.id) && parent.children.map(child => (
                        <TableRow key={child.id} className="bg-muted/20">
                          <TableCell className="w-8" />
                          <TableCell>
                            <div className="flex items-center gap-2 pl-4">
                              <span className="text-muted-foreground text-xs">└</span>
                              <span className="text-sm">{child.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{child.slug}</TableCell>
                          <TableCell>{child.product_count}</TableCell>
                          <TableCell>{child.is_active ? "✓" : "—"}</TableCell>
                          <TableCell>{child.sort_order}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(child)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(child)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Category</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={e => {
                    const newName = e.target.value;
                    const updates: any = { name: newName };
                    if (!editing.id && (!editing.slug || editing.slug === generateSlug(editing.name))) {
                      updates.slug = generateSlug(newName);
                    }
                    setEditing({ ...editing, ...updates });
                  }}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={editing.slug}
                  onChange={e => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="Auto-generated from name"
                />
              </div>
              <div>
                <Label>Group</Label>
                <Select value={editing.group_id || "none"} onValueChange={v => setEditing({ ...editing, group_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(groups || []).map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Parent Category {hasChildren && <span className="text-xs text-muted-foreground">(has children — cannot change)</span>}</Label>
                <Select
                  value={editing.parent_id || "none"}
                  onValueChange={v => setEditing({ ...editing, parent_id: v })}
                  disabled={hasChildren}
                >
                  <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {parentOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={editing.image_url || ""} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                Save
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
