import { Navigate } from "react-router-dom";
import { useStaff, hasPermission } from "@/contexts/StaffContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
}

export default function ProtectedRoute({ children, module }: ProtectedRouteProps) {
  const { user, staff, loading } = useStaff();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized as a staff member.</p>
          <button onClick={() => { import("@/integrations/supabase/client").then(m => m.supabase.auth.signOut()); }} className="text-accent underline">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (module && !hasPermission(staff.role, module)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
