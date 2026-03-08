import {
  LayoutDashboard, Package, Grid3X3, Tag, ShoppingCart, FileText,
  Users, Image, UserCog, BarChart3, Activity, Settings, LogOut, Truck,
  Percent, Zap, Ticket,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useStaff, hasPermission } from "@/contexts/StaffContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import ikonLogo from "@/assets/ikon-logo.png";

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", url: "/products", icon: Package, module: "products" },
      { title: "Categories", url: "/categories", icon: Grid3X3, module: "categories" },
      { title: "Brands", url: "/brands", icon: Tag, module: "brands" },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Orders", url: "/orders", icon: ShoppingCart, module: "orders" },
      { title: "Quotes", url: "/quotes", icon: FileText, module: "quotes" },
      { title: "Customers", url: "/customers", icon: Users, module: "customers" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Banners", url: "/banners", icon: Image, module: "banners" },
      { title: "Promotions", url: "/promotions", icon: Percent, module: "promotions" },
      { title: "Flash Deals", url: "/flash-deals", icon: Zap, module: "flash_deals" },
      { title: "Coupons", url: "/coupons", icon: Ticket, module: "coupons" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { title: "Delivery Management", url: "/my-deliveries", icon: Truck, module: "delivery" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Staff", url: "/staff", icon: UserCog, module: "staff" },
      { title: "Reports", url: "/reports", icon: BarChart3, module: "reports" },
      { title: "Activity Log", url: "/activity", icon: Activity, module: "activity" },
      { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
    ],
  },
];

export function AdminSidebar() {
  const { staff, signOut } = useStaff();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const role = staff?.role || "viewer";

  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(role, item.module)),
    }))
    .filter(g => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 py-5 flex items-center gap-3">
            <img src={ikonLogo} alt="IKON Mart" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">IKON</h1>
              <p className="text-[10px] font-semibold tracking-[0.25em] text-sidebar-primary uppercase">ADMIN</p>
            </div>
          </div>
        )}
        {filteredGroups.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-sm"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground border-l-2 border-sidebar-primary"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && staff && (
          <>
            <Separator className="bg-sidebar-border" />
            <div className="p-3 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
                  {staff.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{staff.full_name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{staff.role.replace("_", " ")}</p>
              </div>
              <button onClick={signOut} className="text-sidebar-foreground/50 hover:text-sidebar-foreground" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
