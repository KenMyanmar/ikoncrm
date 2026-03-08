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

interface RolePermissions {
  canManageStaff: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageCustomers: boolean;
  canManageBanners: boolean;
  canViewReports: boolean;
  canManageCategories: boolean;
  canManageBrands: boolean;
  canManageQuotes: boolean;
  canManageDelivery: boolean;
  canViewActivityLog: boolean;
  canExportData: boolean;
}

const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  super_admin: {
    canManageStaff: true, canManageProducts: true, canManageOrders: true,
    canManageCustomers: true, canManageBanners: true, canViewReports: true,
    canManageCategories: true, canManageBrands: true, canManageQuotes: true,
    canManageDelivery: true, canViewActivityLog: true, canExportData: true,
  },
  admin: {
    canManageStaff: true, canManageProducts: true, canManageOrders: true,
    canManageCustomers: true, canManageBanners: true, canViewReports: true,
    canManageCategories: true, canManageBrands: true, canManageQuotes: true,
    canManageDelivery: true, canViewActivityLog: true, canExportData: true,
  },
  manager: {
    canManageStaff: false, canManageProducts: true, canManageOrders: true,
    canManageCustomers: true, canManageBanners: true, canViewReports: true,
    canManageCategories: true, canManageBrands: true, canManageQuotes: true,
    canManageDelivery: true, canViewActivityLog: false, canExportData: false,
  },
  staff: {
    canManageStaff: false, canManageProducts: true, canManageOrders: true,
    canManageCustomers: true, canManageBanners: false, canViewReports: false,
    canManageCategories: false, canManageBrands: false, canManageQuotes: true,
    canManageDelivery: false, canViewActivityLog: false, canExportData: false,
  },
  delivery: {
    canManageStaff: false, canManageProducts: false, canManageOrders: false,
    canManageCustomers: false, canManageBanners: false, canViewReports: false,
    canManageCategories: false, canManageBrands: false, canManageQuotes: false,
    canManageDelivery: true, canViewActivityLog: false, canExportData: false,
  },
};

const MODULE_TO_PERMISSION: Record<string, keyof RolePermissions> = {
  products: "canManageProducts",
  categories: "canManageCategories",
  brands: "canManageBrands",
  orders: "canManageOrders",
  quotes: "canManageQuotes",
  customers: "canManageCustomers",
  banners: "canManageBanners",
  staff: "canManageStaff",
  reports: "canViewReports",
  activity: "canViewActivityLog",
  settings: "canManageStaff",
  delivery: "canManageDelivery",
};

export function hasPermission(role: string, module: string): boolean {
  if (module === "dashboard") return true;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  const key = MODULE_TO_PERMISSION[module];
  if (!key) return false;
  return perms[key];
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
