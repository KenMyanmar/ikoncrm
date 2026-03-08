import { useState } from "react";
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
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

export default function BrandList() {
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: brands } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("*").order("name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (brand: any) => {
      if (brand.id) {
        const { error } = await supabase.from("brands").update({
          name: brand.name, slug: brand.slug, description: brand.description,
          is_active: brand.is_active, is_featured: brand.is_featured, country: brand.country, website: brand.website,
        }).eq("id", brand.id);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "updated", "brand", brand.id, brand.name);
      } else {
        const { error } = await supabase.from("brands").insert({
          name: brand.name, slug: brand.slug, description: brand.description,
          is_active: brand.is_active, is_featured: brand.is_featured, country: brand.country, website: brand.website,
        });
        if (error) throw error;
        if (staff) await logActivity(staff.id, "created", "brand", undefined, brand.name);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-brands"] }); setOpen(false); toast.success("Brand saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (b?: any) => {
    setEditing(b || { name: "", slug: "", description: "", is_active: true, is_featured: false, country: "", website: "" });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Brands</h1>
        <Button size="sm" onClick={() => openEdit()}><Plus className="h-4 w-4 mr-1" /> Add Brand</Button>
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(brands || []).map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.logo_url ? <img src={b.logo_url} className="h-8 w-8 rounded object-contain" alt="" /> : <div className="h-8 w-8 rounded bg-muted" />}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.product_count}</TableCell>
                  <TableCell>{b.is_featured ? "★" : "—"}</TableCell>
                  <TableCell>{b.is_active ? "✓" : "—"}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Brand</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={editing.country || ""} onChange={e => setEditing({ ...editing, country: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={editing.website || ""} onChange={e => setEditing({ ...editing, website: e.target.value })} /></div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_featured} onCheckedChange={v => setEditing({ ...editing, is_featured: v })} /><Label>Featured</Label></div>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
