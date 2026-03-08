import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Crown, Shield, Briefcase, Users, Truck, Clock, Activity, KeyRound, LogOut, Ban, Trash2, Loader2 } from "lucide-react";
import RoleChangeConfirm from "./RoleChangeConfirm";
import ResetPasswordDialog from "./ResetPasswordDialog";
import DeleteStaffDialog from "./DeleteStaffDialog";
import { useStaff } from "@/contexts/StaffContext";
import { formatDistanceToNow } from "date-fns";
const ROLES = ["super_admin", "admin", "manager", "staff", "delivery"];
const DEPARTMENTS = ["Sales", "Operations", "Warehouse", "Logistics", "IT", "Finance"];

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  super_admin: { label: "Super Admin", icon: Crown, color: "bg-accent/10 text-accent border-accent/20" },
  admin: { label: "Admin", icon: Shield, color: "bg-primary/10 text-primary border-primary/20" },
  manager: { label: "Manager", icon: Briefcase, color: "bg-info/10 text-info border-info/20" },
  staff: { label: "Staff", icon: Users, color: "bg-success/10 text-success border-success/20" },
  delivery: { label: "Delivery", icon: Truck, color: "bg-warning/10 text-warning border-warning/20" },
};

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  avatar_url: string | null;
}

interface Props {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StaffDetailSheet({ staff, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { staff: currentStaff } = useStaff();
  const isSuperAdmin = currentStaff?.role === "super_admin";
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [roleConfirm, setRoleConfirm] = useState<{ open: boolean; newRole: string }>({ open: false, newRole: "" });
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sync editing state when staff changes
  if (staff && (!editing || editing.id !== staff.id)) {
    setEditing({ ...staff });
  }

  const { data: recentActivity } = useQuery({
    queryKey: ["staff-activity", staff?.id],
    queryFn: async () => {
      if (!staff) return [];
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("staff_id", staff.id)
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!staff?.id && open,
  });

  const saveMutation = useMutation({
    mutationFn: async (s: StaffMember) => {
      const { error } = await supabase
        .from("staff_profiles")
        .update({
          full_name: s.full_name,
          role: s.role,
          department: s.department,
          is_active: s.is_active,
        } as any)
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Staff profile updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleRoleChange = (newRole: string) => {
    if (!editing) return;
    if (newRole !== editing.role) {
      setRoleConfirm({ open: true, newRole });
    }
  };

  const confirmRoleChange = () => {
    if (!editing) return;
    setEditing({ ...editing, role: roleConfirm.newRole });
    setRoleConfirm({ open: false, newRole: "" });
  };

  if (!editing) return null;

  const roleConf = ROLE_CONFIG[editing.role] || ROLE_CONFIG.staff;
  const RoleIcon = roleConf.icon;
  const initials = editing.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Staff Profile</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{editing.full_name}</h3>
                <p className="text-sm text-muted-foreground">{editing.email}</p>
                <Badge variant="outline" className={`mt-1 text-[10px] gap-1 ${roleConf.color}`}>
                  <RoleIcon className="h-3 w-3" />
                  {roleConf.label}
                </Badge>
              </div>
              <div className="text-right">
                {editing.is_active ? (
                  <Badge className="bg-success/10 text-success border-success/20" variant="outline">Active</Badge>
                ) : (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Inactive</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Edit Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Full Name</Label>
                <Input
                  value={editing.full_name}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <Input value={editing.email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Role</Label>
                <Select value={editing.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => {
                      const rc = ROLE_CONFIG[r];
                      const Icon = rc.icon;
                      return (
                        <SelectItem key={r} value={r}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            {rc.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Department</Label>
                <Select
                  value={editing.department || ""}
                  onValueChange={(v) => setEditing({ ...editing, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Account Status</p>
                  <p className="text-xs text-muted-foreground">
                    {editing.is_active ? "This account is active" : "This account is deactivated"}
                  </p>
                </div>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => saveMutation.mutate(editing)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <Separator />

            {/* Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" /> Account Info
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Last Login</p>
                  <p className="font-medium">
                    {editing.last_login_at
                      ? formatDistanceToNow(new Date(editing.last_login_at), { addSuffix: true })
                      : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Joined</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(editing.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Activity Log */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-muted-foreground" /> Recent Activity
              </h4>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentActivity.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium">{a.action}</span>
                        {a.entity_name && (
                          <span className="text-muted-foreground"> — {a.entity_name}</span>
                        )}
                        <p className="text-muted-foreground">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No recent activity</p>
              )}
            </div>

            {/* Super Admin Actions */}
            {isSuperAdmin && staff && currentStaff?.id !== staff.id && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <Shield className="h-4 w-4 text-muted-foreground" /> Admin Actions
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setResetPwOpen(true)}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset Password
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={actionLoading === "signout"}
                      onClick={async () => {
                        setActionLoading("signout");
                        try {
                          const { data, error } = await supabase.functions.invoke("manage-staff", {
                            body: { action: "force_signout", user_id: staff.user_id },
                          });
                          if (error) throw error;
                          if (data?.error) throw new Error(data.error);
                          toast.success("User signed out from all devices");
                        } catch (e: any) {
                          toast.error(e.message || "Failed to sign out user");
                        } finally {
                          setActionLoading(null);
                        }
                      }}
                    >
                      {actionLoading === "signout" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Force Sign Out
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={actionLoading === "suspend"}
                    onClick={async () => {
                      const action = editing?.is_active ? "suspend" : "unsuspend";
                      setActionLoading("suspend");
                      try {
                        const { data, error } = await supabase.functions.invoke("manage-staff", {
                          body: { action, user_id: staff.user_id, staff_id: staff.id },
                        });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        toast.success(action === "suspend" ? "Account suspended" : "Account reactivated");
                        queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
                        onOpenChange(false);
                      } catch (e: any) {
                        toast.error(e.message || "Failed to update account status");
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                  >
                    {actionLoading === "suspend" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Ban className="h-3.5 w-3.5" />
                    )}
                    {editing?.is_active ? "Suspend Account" : "Reactivate Account"}
                  </Button>

                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                    <p className="text-xs font-medium text-destructive">Danger Zone</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <RoleChangeConfirm
        open={roleConfirm.open}
        onOpenChange={(o) => setRoleConfirm({ ...roleConfirm, open: o })}
        staffName={editing?.full_name || ""}
        currentRole={staff?.role || "staff"}
        newRole={roleConfirm.newRole}
        onConfirm={confirmRoleChange}
      />

      {staff && (
        <>
          <ResetPasswordDialog
            open={resetPwOpen}
            onOpenChange={setResetPwOpen}
            staffName={staff.full_name}
            staffEmail={staff.email}
            userId={staff.user_id}
          />
          <DeleteStaffDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            staffName={staff.full_name}
            staffId={staff.id}
            userId={staff.user_id}
            onDeleted={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
              onOpenChange(false);
            }}
          />
        </>
      )}
    </>
  );
}
