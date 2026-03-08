import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface StaffProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffContextType {
  user: User | null;
  staff: StaffProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType>({
  user: null,
  staff: null,
  loading: true,
  signOut: async () => {},
});

export const useStaff = () => useContext(StaffContext);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  admin: ["dashboard", "products", "orders", "quotes", "customers", "categories", "brands", "banners", "reports", "activity"],
  sales_manager: ["dashboard", "orders", "quotes", "customers", "reports"],
  sales_rep: ["dashboard", "orders", "quotes", "customers"],
  catalog_manager: ["dashboard", "products", "categories", "brands", "banners"],
  viewer: ["dashboard"],
};

export function hasPermission(role: string, module: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(module);
}

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase
          .from("staff_profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("is_active", true)
          .maybeSingle();
        setStaff(data as StaffProfile | null);
      } else {
        setStaff(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        supabase
          .from("staff_profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("is_active", true)
          .maybeSingle()
          .then(({ data }) => {
            setStaff(data as StaffProfile | null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStaff(null);
  };

  return (
    <StaffContext.Provider value={{ user, staff, loading, signOut }}>
      {children}
    </StaffContext.Provider>
  );
}
