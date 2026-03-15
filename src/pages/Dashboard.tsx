import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  Package, DollarSign, Truck, Clock, AlertTriangle, CreditCard, Warehouse,
  ClipboardList, TrendingUp, TrendingDown, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const CHART_COLORS = [
  "hsl(235, 55%, 27%)", "hsl(356, 87%, 52%)", "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)", "hsl(270, 60%, 50%)",
];

function MiniSparkline({ data, color = "hsl(235, 55%, 27%)" }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ v, i }));
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const { staff } = useStaff();
  const navigate = useNavigate();

  // Live KPIs (30s refresh)
  const { data: live } = useQuery({
    queryKey: ["live-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_live_kpis");
      if (error) throw error;
      return data as Record<string, number>;
    },
    refetchInterval: 30000,
    enabled: !!staff,
  });

  // KPI snapshots for sparklines (last 7 days)
  const { data: snapshots } = useQuery({
    queryKey: ["kpi-snapshots-7d"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kpi_snapshots")
        .select("*")
        .eq("period", "daily")
        .order("snapshot_date", { ascending: true })
        .limit(7);
      return data || [];
    },
    enabled: !!staff,
  });

  // Daily revenue (30 days)
  const { data: dailyRevenue } = useQuery({
    queryKey: ["dashboard-daily-revenue"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("created_at, total, status")
        .gte("created_at", thirtyDaysAgo)
        .not("status", "in", '("cancelled","expired")');
      if (!data) return [];
      const byDay: Record<string, number> = {};
      data.forEach((o: any) => {
        const d = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        byDay[d] = (byDay[d] || 0) + (o.total || 0);
      });
      return Object.entries(byDay).map(([date, revenue]) => ({ date, revenue }));
    },
    enabled: !!staff,
  });

  // Daily order counts (30 days)
  const { data: dailyOrders } = useQuery({
    queryKey: ["dashboard-daily-orders"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo);
      if (!data) return [];
      const byDay: Record<string, number> = {};
      data.forEach((o: any) => {
        const d = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        byDay[d] = (byDay[d] || 0) + 1;
      });
      return Object.entries(byDay).map(([date, count]) => ({ date, count }));
    },
    enabled: !!staff,
  });

  // Orders by status (current)
  const { data: ordersByStatus } = useQuery({
    queryKey: ["dashboard-orders-by-status"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status");
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1; });
      return Object.entries(counts).map(([name, value], i) => ({
        name: name.replace(/_/g, " "),
        value,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
    },
    enabled: !!staff,
  });

  // Revenue by payment method
  const { data: revenueByPayment } = useQuery({
    queryKey: ["dashboard-revenue-payment"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("payment_method, total")
        .gte("created_at", thirtyDaysAgo)
        .not("status", "in", '("cancelled","expired")');
      if (!data) return [];
      const byMethod: Record<string, number> = {};
      data.forEach((o: any) => {
        const m = o.payment_method || "unknown";
        byMethod[m] = (byMethod[m] || 0) + (o.total || 0);
      });
      return Object.entries(byMethod).map(([method, total]) => ({ method: method.toUpperCase(), total }));
    },
    enabled: !!staff,
  });

  const sparkFor = (key: string) => (snapshots || []).map((s: any) => s.metrics?.[key] || 0);

  const kpiCards = [
    { label: "Checkout→Paid", value: live ? pct(live.checkout_to_paid_rate || 0) : "—", spark: sparkFor("checkout_to_paid_rate"), target: 0.7, actual: live?.checkout_to_paid_rate },
    { label: "Avg Verify Time", value: live ? `${live.avg_verification_minutes || 0}m` : "—", spark: sparkFor("avg_verification_minutes") },
    { label: "Delivery Success", value: live ? pct(live.delivery_success_rate || 0) : "—", spark: sparkFor("delivery_success_rate"), target: 0.9, actual: live?.delivery_success_rate },
    { label: "Cancellation Rate", value: live ? pct(live.cancellation_rate || 0) : "—", spark: sparkFor("cancellation_rate"), invertColor: true },
    { label: "Revenue (Week)", value: live ? `${fmt(live.revenue_week || 0)} MMK` : "—", spark: sparkFor("gross_revenue") },
    { label: "Orders (Week)", value: live ? String(live.orders_week || 0) : "—", spark: sparkFor("total_orders") },
    { label: "Open Tasks", value: live ? String(live.open_tasks || 0) : "—", spark: [] },
  ];

  const realTimeCards = [
    { label: "Orders Today", value: live?.orders_today ?? 0, icon: Package, color: "text-primary" },
    { label: "Revenue Today", value: `${fmt(live?.revenue_today ?? 0)} MMK`, icon: DollarSign, color: "text-success" },
    { label: "Delivered Today", value: live?.delivered_today ?? 0, icon: Truck, color: "text-info" },
    { label: "Avg Verify", value: `${live?.avg_verification_minutes ?? 0}m`, icon: Clock, color: "text-warning" },
    { label: "SLA Breaches", value: live?.active_sla_breaches ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  const queueHealth = [
    { label: "Payment", count: live?.queue_payment ?? 0, warn: live?.active_sla_warnings ?? 0, icon: CreditCard },
    { label: "Warehouse", count: live?.queue_warehouse ?? 0, icon: Warehouse },
    { label: "Delivery", count: live?.queue_delivery ?? 0, icon: Truck },
    { label: "Tasks", count: live?.open_tasks ?? 0, icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            IKON Mart CRM · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {staff?.full_name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/reports/weekly")}>
          Weekly Review <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Real-time KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {realTimeCards.map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <c.icon className={`h-5 w-5 ${c.color} opacity-80`} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{typeof c.value === "number" ? c.value.toLocaleString() : c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Queue Health */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-6">
            {queueHealth.map(q => (
              <div key={q.label} className="flex items-center gap-2 text-sm">
                <q.icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{q.label}:</span>
                <Badge variant="secondary">{q.count}</Badge>
                {"warn" in q && (q.warn ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-[10px]">⏱ {q.warn} near SLA</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards with Sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpiCards.map(k => {
          const trend = k.spark.length >= 2 ? k.spark[k.spark.length - 1] - k.spark[k.spark.length - 2] : 0;
          const isGood = k.invertColor ? trend <= 0 : trend >= 0;
          return (
            <Card key={k.label} className="overflow-hidden">
              <CardContent className="pt-3 pb-2 px-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{k.value}</p>
                <div className="flex items-center justify-between mt-1">
                  {trend !== 0 && (
                    <span className={`text-[10px] flex items-center gap-0.5 ${isGood ? "text-success" : "text-destructive"}`}>
                      {isGood ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {trend > 0 ? "+" : ""}{typeof k.spark[0] === "number" && k.spark[0] < 1 ? pct(Math.abs(trend)) : Math.abs(trend).toFixed(0)}
                    </span>
                  )}
                  {k.spark.length > 1 && <MiniSparkline data={k.spark} color={isGood ? "hsl(142, 76%, 36%)" : "hsl(356, 87%, 52%)"} />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Revenue (30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} className="text-muted-foreground" />
                  <Tooltip formatter={(v: number) => [`${fmt(v)} MMK`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(235, 55%, 27%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Payment Method</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByPayment || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="method" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={(v: number) => [`${fmt(v)} MMK`, "Revenue"]} />
                  <Bar dataKey="total" fill="hsl(235, 55%, 27%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Orders (30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyOrders || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ordersByStatus || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {(ordersByStatus || []).map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopCustomersWidget />
        <AtRiskCustomersWidget />
      </div>
    </div>
  );
}

function TopCustomersWidget() {
  const navigate = useNavigate();
  const { data: top } = useQuery({
    queryKey: ["top-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customer_metrics").select("customer_id, name, company_name, lifetime_value, total_orders")
        .order("lifetime_value", { ascending: false }).limit(5);
      return (data || []) as any[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Top Customers (by LTV)</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(top || []).map((c: any, i: number) => (
            <div key={c.customer_id} className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 rounded p-1.5 -mx-1.5" onClick={() => navigate(`/customers/${c.customer_id}`)}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <span className="font-medium">{c.company_name || c.name || "—"}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium">{fmt(Number(c.lifetime_value) || 0)} MMK</span>
                <span className="text-xs text-muted-foreground ml-2">({c.total_orders || 0} orders)</span>
              </div>
            </div>
          ))}
          {(!top || top.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">No customer data yet</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AtRiskCustomersWidget() {
  const navigate = useNavigate();
  const { data: atRisk } = useQuery({
    queryKey: ["at-risk-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customer_metrics").select("customer_id, name, company_name, recency_days, last_order_date")
        .gt("recency_days", 60).gt("total_orders", 0)
        .order("recency_days", { ascending: false }).limit(5);
      return (data || []) as any[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">At Risk Customers</CardTitle>
          <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => navigate("/customers")}>View All →</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(atRisk || []).map((c: any) => (
            <div key={c.customer_id} className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 rounded p-1.5 -mx-1.5" onClick={() => navigate(`/customers/${c.customer_id}`)}>
              <span className="font-medium">{c.company_name || c.name || "—"}</span>
              <span className="text-xs text-destructive">Last order: {c.recency_days}d ago</span>
            </div>
          ))}
          {(!atRisk || atRisk.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">No at-risk customers 🎉</p>}
        </div>
      </CardContent>
    </Card>
  );
}
