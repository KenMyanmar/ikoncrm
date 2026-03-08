import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Crown, Shield, Briefcase, Users, Truck, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import InviteStaffDialog from "@/components/InviteStaffDialog";
import StaffDetailSheet from "@/components/StaffDetailSheet";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  super_admin: { label: "Super Admin", icon: Crown, color: "bg-accent/10 text-accent border-accent/20" },
  admin: { label: "Admin", icon: Shield, color: "bg-primary/10 text-primary border-primary/20" },
  manager: { label: "Manager", icon: Briefcase, color: "bg-info/10 text-info border-info/20" },
  staff: { label: "Staff", icon: Users, color: "bg-success/10 text-success border-success/20" },
  delivery: { label: "Delivery", icon: Truck, color: "bg-warning/10 text-warning border-warning/20" },
};

export default function StaffManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: staffList, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_profiles").select("*").order("created_at");
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!staffList) return [];
    return staffList.filter((s: any) => {
      const matchesSearch =
        !search ||
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, search, roleFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!staffList) return { total: 0, active: 0, inactive: 0, byRole: {} as Record<string, number> };
    const byRole: Record<string, number> = {};
    let active = 0;
    staffList.forEach((s: any) => {
      byRole[s.role] = (byRole[s.role] || 0) + 1;
      if (s.is_active) active++;
    });
    return { total: staffList.length, active, inactive: staffList.length - active, byRole };
  }, [staffList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your team members, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Invite Staff
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Total Staff</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Active</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Inactive</p>
            <p className="text-2xl font-bold text-destructive">{stats.inactive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Roles</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(stats.byRole).map(([role, count]) => {
                const rc = ROLE_CONFIG[role];
                return rc ? (
                  <Badge key={role} variant="outline" className={`text-[9px] ${rc.color}`}>
                    {count} {rc.label}
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={roleFilter} onValueChange={setRoleFilter}>
          <TabsList className="h-10">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {Object.entries(ROLE_CONFIG).map(([key, rc]) => {
              const Icon = rc.icon;
              return (
                <TabsTrigger key={key} value={key} className="text-xs gap-1">
                  <Icon className="h-3 w-3" /> {rc.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-0 px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading staff...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No staff members found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s: any) => {
                  const rc = ROLE_CONFIG[s.role] || ROLE_CONFIG.staff;
                  const Icon = rc.icon;
                  const initials = (s.full_name || "?")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedStaff(s);
                        setSheetOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${rc.color}`}>
                          <Icon className="h-3 w-3" />
                          {rc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.department || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {s.is_active ? (
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {s.last_login_at
                          ? formatDistanceToNow(new Date(s.last_login_at), { addSuffix: true })
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-staff"] })}
      />

      <StaffDetailSheet
        staff={selectedStaff}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
