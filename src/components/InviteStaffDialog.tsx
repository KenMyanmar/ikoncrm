import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Mail, User, Shield, Building2 } from "lucide-react";

const ROLES = [
  { value: "super_admin", label: "Super Admin", desc: "Full system access" },
  { value: "admin", label: "Admin", desc: "All features except system config" },
  { value: "manager", label: "Manager", desc: "Team & operations management" },
  { value: "staff", label: "Staff", desc: "Day-to-day operations" },
  { value: "delivery", label: "Delivery", desc: "Delivery assignments only" },
];

const DEPARTMENTS = ["Sales", "Operations", "Warehouse", "Logistics", "IT", "Finance"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function InviteStaffDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState({ email: "", full_name: "", role: "staff", department: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.full_name || !form.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("invite-staff", {
        body: {
          email: form.email.trim().toLowerCase(),
          full_name: form.full_name.trim(),
          role: form.role,
          department: form.department || null,
        },
      });

      if (res.error) throw new Error(res.error.message || "Failed to invite staff");
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(res.data?.message || "Staff member invited successfully");
      setForm({ email: "", full_name: "", role: "staff", department: "" });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to invite staff member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite New Staff Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email *
            </Label>
            <Input
              type="email"
              placeholder="staff@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name *
            </Label>
            <Input
              placeholder="John Doe"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Role *
            </Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                      <span className="text-xs text-muted-foreground">{r.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Department
            </Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-info/20 bg-info/5 p-3">
            <p className="text-xs text-muted-foreground">
              The invited user will receive a password reset email to set their credentials. They'll be able to log in immediately after.
            </p>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Inviting..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
