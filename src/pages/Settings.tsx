import { useState } from "react";
import { useStaff } from "@/contexts/StaffContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  User, Shield, Palette, Settings as SettingsIcon,
  Eye, EyeOff, Pencil, X, Check, Clock, Building2, Mail, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type SettingsTab = "profile" | "appearance" | "security" | "system";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
  { id: "system", label: "System", icon: SettingsIcon, adminOnly: true },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  admin: "bg-primary/10 text-primary border-primary/20",
  manager: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  staff: "bg-muted text-muted-foreground border-border",
  delivery: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

export default function SettingsPage() {
  const { staff, user } = useStaff();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(staff?.full_name ?? "");
  const [department, setDepartment] = useState(staff?.department ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Density
  const [density, setDensity] = useState<string>(() => localStorage.getItem("ui-density") || "comfortable");

  const initials = staff?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  const isAdmin = staff?.role === "super_admin" || staff?.role === "admin";

  const handleSaveProfile = async () => {
    if (!staff) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("staff_profiles")
      .update({ full_name: fullName.trim(), department: department.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", staff.id);
    setSavingProfile(false);

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      setEditing(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({ title: "Current password required", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);

    // Re-authenticate with current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: staff?.email ?? "",
      password: currentPassword,
    });

    if (signInError) {
      setSavingPassword(false);
      toast({ title: "Current password is incorrect", description: "Please enter your current password correctly.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDensityChange = (d: string) => {
    setDensity(d);
    localStorage.setItem("ui-density", d);
  };

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, preferences, and system configuration.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <>
              <Card>
                <CardHeader className="flex-row items-start gap-4 space-y-0">
                  <Avatar className="h-20 w-20 text-xl">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">{staff?.full_name}</CardTitle>
                      <Badge variant="outline" className={cn("capitalize text-xs", ROLE_COLORS[staff?.role ?? ""])}>
                        {staff?.role?.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {staff?.email}
                    </CardDescription>
                    {staff?.department && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> {staff.department}
                      </p>
                    )}
                    {staff?.last_login_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                        <Clock className="h-3 w-3" /> Last login: {format(new Date(staff.last_login_at), "PPp")}
                      </p>
                    )}
                  </div>
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={() => { setFullName(staff?.full_name ?? ""); setDepartment(staff?.department ?? ""); setEditing(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  )}
                </CardHeader>

                {editing && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Sales, Operations" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                        <Check className="h-3.5 w-3.5 mr-1" /> {savingProfile ? "Saving…" : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 max-w-lg">
                    <div>
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-medium">{staff?.email}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Role</dt>
                      <dd className="font-medium capitalize">{staff?.role?.replace("_", " ")}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd><Badge variant={staff?.is_active ? "default" : "secondary"}>{staff?.is_active ? "Active" : "Inactive"}</Badge></dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Member since</dt>
                      <dd className="font-medium">{staff?.created_at ? format(new Date(staff.created_at), "PP") : "—"}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── APPEARANCE ── */}
          {activeTab === "appearance" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Theme</CardTitle>
                  <CardDescription>Choose between light and dark mode.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors capitalize text-sm font-medium",
                          theme === t ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-16 rounded-md border",
                          t === "light" ? "bg-background border-border" : t === "dark" ? "bg-foreground" : "bg-gradient-to-r from-background to-foreground"
                        )} />
                        {t}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Display Density</CardTitle>
                  <CardDescription>Control spacing and sizing of UI elements.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {[{ id: "comfortable", label: "Comfortable" }, { id: "compact", label: "Compact" }].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleDensityChange(d.id)}
                        className={cn(
                          "rounded-lg border-2 px-6 py-3 text-sm font-medium transition-colors",
                          density === d.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── SECURITY ── */}
          {activeTab === "security" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</CardTitle>
                  <CardDescription>Update the password you use to sign in.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-sm">
                    <div className="space-y-2">
                      <Label htmlFor="current-pw">Current Password</Label>
                      <Input
                        id="current-pw"
                        type={showPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pw">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-pw"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                        />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pw">Confirm Password</Label>
                      <Input
                        id="confirm-pw"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                    <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
                      {savingPassword ? "Updating…" : "Update Password"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Session Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="text-sm space-y-2">
                    <div>
                      <dt className="text-muted-foreground">Signed in as</dt>
                      <dd className="font-medium">{user?.email}</dd>
                    </div>
                    {staff?.last_login_at && (
                      <div>
                        <dt className="text-muted-foreground">Last login</dt>
                        <dd className="font-medium">{format(new Date(staff.last_login_at), "PPpp")}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── SYSTEM (admin only) ── */}
          {activeTab === "system" && isAdmin && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Company Information</CardTitle>
                  <CardDescription>General system-wide settings. Changes here affect all staff.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input defaultValue="IKON" disabled placeholder="Coming soon" />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Currency</Label>
                      <Input defaultValue="MMK" disabled placeholder="Coming soon" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Editable system settings coming in a future release.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notifications</CardTitle>
                  <CardDescription>Configure email and in-app notification preferences.</CardDescription>
                </CardHeader>
                <CardContent className="py-8 text-center">
                  <SettingsIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Notification settings coming soon.</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
