import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Crown, Briefcase, Users, Truck } from "lucide-react";

const ROLE_INFO: Record<string, { label: string; icon: React.ElementType; permissions: string[] }> = {
  super_admin: {
    label: "Super Admin",
    icon: Crown,
    permissions: ["Full system access", "Manage all staff & roles", "System configuration", "All data export"],
  },
  admin: {
    label: "Admin",
    icon: Shield,
    permissions: ["Manage staff", "All operations", "Reports & analytics", "Data export"],
  },
  manager: {
    label: "Manager",
    icon: Briefcase,
    permissions: ["Products & orders", "Customers & quotes", "Delivery management", "Banners"],
  },
  staff: {
    label: "Staff",
    icon: Users,
    permissions: ["Products & orders", "Customers & quotes", "Basic operations"],
  },
  delivery: {
    label: "Delivery",
    icon: Truck,
    permissions: ["View assigned deliveries", "Update delivery status", "Upload proof of delivery"],
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  currentRole: string;
  newRole: string;
  onConfirm: () => void;
}

export default function RoleChangeConfirm({ open, onOpenChange, staffName, currentRole, newRole, onConfirm }: Props) {
  const current = ROLE_INFO[currentRole] || ROLE_INFO.staff;
  const next = ROLE_INFO[newRole] || ROLE_INFO.staff;
  const NextIcon = next.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <NextIcon className="h-5 w-5 text-warning" />
            Confirm Role Change
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are changing <strong>{staffName}</strong>'s role from{" "}
                <strong>{current.label}</strong> to <strong>{next.label}</strong>.
              </p>
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">New permissions:</p>
                <ul className="text-xs space-y-0.5">
                  {next.permissions.map((p) => (
                    <li key={p} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-primary" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              {(newRole === "super_admin" || currentRole === "super_admin") && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ This involves super_admin privileges. Proceed with caution.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm Change</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
