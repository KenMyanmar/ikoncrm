import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, AlertTriangle, ShoppingCart, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { staff } = useStaff();
  const navigate = useNavigate();

  const { data: productCount } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: needsEnrichment } = useQuery({
    queryKey: ["dashboard-enrichment"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).lt("data_completeness", 50);
      return count || 0;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: pendingQuotes } = useQuery({
    queryKey: ["dashboard-quotes"],
    queryFn: async () => {
      const { count } = await supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const kpis = [
    { label: "Total Products", value: productCount ?? 0, icon: Package, color: "text-primary" },
    { label: "Needs Enrichment", value: needsEnrichment ?? 0, icon: AlertTriangle, color: "text-warning" },
    { label: "Pending Orders", value: pendingOrders ?? 0, icon: ShoppingCart, color: "text-info" },
    { label: "Pending Quotes", value: pendingQuotes ?? 0, icon: FileText, color: "text-accent" },
  ];

  const enrichmentData = [
    { name: "Complete", value: (productCount ?? 0) - (needsEnrichment ?? 0), color: "hsl(142, 76%, 36%)" },
    { name: "Incomplete", value: needsEnrichment ?? 0, color: "hsl(38, 92%, 50%)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {staff?.full_name}</h1>
        <p className="text-muted-foreground text-sm">Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold text-foreground">{kpi.value.toLocaleString()}</p>
                </div>
                <kpi.icon className={`h-10 w-10 ${kpi.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => navigate("/products")}>
          <Package className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Enrich Products</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => navigate("/quotes")}>
          <FileText className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium">Process Quotes</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => navigate("/orders")}>
          <ShoppingCart className="h-5 w-5 text-info" />
          <span className="text-sm font-medium">View Orders</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Data Enrichment</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={enrichmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {enrichmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[200px] overflow-auto">
              {(recentActivity || []).length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              {(recentActivity || []).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.action}</Badge>
                  <span className="truncate text-muted-foreground">{item.entity_type}: {item.entity_name || item.entity_id}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
