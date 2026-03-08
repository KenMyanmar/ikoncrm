import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

const ROLES = ["super_admin", "admin", "sales_manager", "sales_rep", "catalog_manager", "viewer"];

export default function StaffManagement() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: staffList } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_profiles").select("*").order("created_at");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (s: any) => {
      if (s.id) {
        const { error } = await supabase.from("staff_profiles").update({
          full_name: s.full_name, role: s.role, department: s.department, is_active: s.is_active,
        } as any).eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-staff"] }); setOpen(false); toast.success("Staff updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const roleColor: Record<string, string> = {
    super_admin: "bg-accent/10 text-accent",
    admin: "bg-primary/10 text-primary",
    sales_manager: "bg-info/10 text-info",
    sales_rep: "bg-info/10 text-info",
    catalog_manager: "bg-success/10 text-success",
    viewer: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
        <p className="text-sm text-muted-foreground">Invite staff via Supabase Auth, then add them here.</p>
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(staffList || []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-sm">{s.email}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${roleColor[s.role] || ""}`}>{s.role.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-sm">{s.department || "—"}</TableCell>
                  <TableCell>{s.is_active ? "✓" : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => { setEditing(s); setOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Staff</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Full Name</Label><Input value={editing.full_name} onChange={e => setEditing({ ...editing, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editing.email} disabled className="bg-muted" /></div>
              <div>
                <Label>Role</Label>
                <Select value={editing.role} onValueChange={v => setEditing({ ...editing, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Department</Label><Input value={editing.department || ""} onChange={e => setEditing({ ...editing, department: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              <Button className="w-full" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
