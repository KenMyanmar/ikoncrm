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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function BannerList() {
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*").order("sort_order");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (banner: any) => {
      if (banner.id) {
        const { error } = await supabase.from("banners").update({
          title: banner.title, subtitle: banner.subtitle, image_url: banner.image_url,
          link_url: banner.link_url, is_active: banner.is_active, sort_order: banner.sort_order,
          position: banner.position,
        }).eq("id", banner.id);
        if (error) throw error;
        if (staff) await logActivity(staff.id, "updated", "banner", banner.id, banner.title);
      } else {
        const { error } = await supabase.from("banners").insert({
          title: banner.title, subtitle: banner.subtitle, image_url: banner.image_url,
          link_url: banner.link_url, is_active: banner.is_active, sort_order: banner.sort_order || 0,
          position: banner.position,
        });
        if (error) throw error;
        if (staff) await logActivity(staff.id, "created", "banner", undefined, banner.title);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-banners"] }); setOpen(false); toast.success("Banner saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (b?: any) => {
    setEditing(b || { title: "", subtitle: "", image_url: "", link_url: "", is_active: true, sort_order: 0, position: "hero" });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Banners</h1>
        <Button size="sm" onClick={() => openEdit()}><Plus className="h-4 w-4 mr-1" /> Add Banner</Button>
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(banners || []).map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.image_url ? <img src={b.image_url} className="h-10 w-20 rounded object-cover" alt="" /> : <div className="h-10 w-20 bg-muted rounded" />}</TableCell>
                  <TableCell className="font-medium">{b.title || "—"}</TableCell>
                  <TableCell className="text-xs">{b.position || "—"}</TableCell>
                  <TableCell>{b.is_active ? "✓" : "—"}</TableCell>
                  <TableCell>{b.sort_order}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Banner</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Subtitle</Label><Input value={editing.subtitle || ""} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} /></div>
              <div><Label>Image</Label><ImageUpload bucket="banners" value={editing.image_url || ""} onChange={url => setEditing({ ...editing, image_url: url })} aspectHint="1920×600px for hero banners" /></div>
              <div><Label>Link URL</Label><Input value={editing.link_url || ""} onChange={e => setEditing({ ...editing, link_url: e.target.value })} /></div>
              <div><Label>Position</Label><Input value={editing.position || ""} onChange={e => setEditing({ ...editing, position: e.target.value })} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              <Button className="w-full" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
