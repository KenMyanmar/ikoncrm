import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

function getWeekRange(offset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

const KPI_TARGETS: Record<string, { target: number; higherIsBetter: boolean; format: "pct" | "min" | "num" }> = {
  checkout_to_paid: { target: 0.7, higherIsBetter: true, format: "pct" },
  avg_verify_p50: { target: 15, higherIsBetter: false, format: "min" },
  on_time_dispatch: { target: 0.95, higherIsBetter: true, format: "pct" },
  first_delivery: { target: 0.9, higherIsBetter: true, format: "pct" },
  cancellation_rate: { target: 0.05, higherIsBetter: false, format: "pct" },
  repeat_purchase: { target: 0.25, higherIsBetter: true, format: "pct" },
  net_revenue: { target: 0, higherIsBetter: true, format: "num" },
};

function StatusIcon({ value, target, higherIsBetter }: { value: number; target: number; higherIsBetter: boolean }) {
  if (target === 0) return <CheckCircle2 className="h-4 w-4 text-success" />;
  const ratio = higherIsBetter ? value / target : target / (value || 1);
  if (ratio >= 1) return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (ratio >= 0.9) return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

function fmtVal(v: number, format: "pct" | "min" | "num") {
  if (format === "pct") return `${(v * 100).toFixed(1)}%`;
  if (format === "min") return `${v.toFixed(0)} min`;
  return `${fmt(v)} MMK`;
}

export default function WeeklyReview() {
  const { staff } = useStaff();
  const [weekOffset, setWeekOffset] = useState(0);
  const week = getWeekRange(weekOffset);
  const prevWeek = getWeekRange(weekOffset - 1);

  const weekLabel = `${week.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${week.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Current week orders
  const { data: weekOrders } = useQuery({
    queryKey: ["weekly-orders", weekOffset],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total, payment_method, cancelled_reason, created_at, delivered_at")
        .gte("created_at", week.start.toISOString())
        .lte("created_at", week.end.toISOString());
      return data || [];
    },
    enabled: !!staff,
  });

  // Previous week orders
  const { data: prevWeekOrders } = useQuery({
    queryKey: ["weekly-orders-prev", weekOffset],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total, cancelled_reason")
        .gte("created_at", prevWeek.start.toISOString())
        .lte("created_at", prevWeek.end.toISOString());
      return data || [];
    },
    enabled: !!staff,
  });

  // New customers this week
  const { data: newCustomers } = useQuery({
    queryKey: ["weekly-customers", weekOffset],
    queryFn: async () => {
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .gte("created_at", week.start.toISOString())
        .lte("created_at", week.end.toISOString());
      return count || 0;
    },
    enabled: !!staff,
  });

  // Delivery assignments this week
  const { data: deliveries } = useQuery({
    queryKey: ["weekly-deliveries", weekOffset],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_assignments")
        .select("status, attempt_number")
        .gte("assigned_at", week.start.toISOString())
        .lte("assigned_at", week.end.toISOString());
      return data || [];
    },
    enabled: !!staff,
  });

  // Top products
  const { data: topProducts } = useQuery({
    queryKey: ["weekly-top-products", weekOffset],
    queryFn: async () => {
      const { data: orderIds } = await supabase
        .from("orders")
        .select("id")
        .gte("created_at", week.start.toISOString())
        .lte("created_at", week.end.toISOString())
        .not("status", "in", '("cancelled","expired")');
      if (!orderIds?.length) return [];
      const ids = orderIds.map((o: any) => o.id);
      const { data } = await supabase
        .from("order_items")
        .select("product_name, quantity, total")
        .in("order_id", ids);
      if (!data) return [];
      const agg: Record<string, { orders: number; revenue: number }> = {};
      data.forEach((item: any) => {
        const name = item.product_name || "Unknown";
        if (!agg[name]) agg[name] = { orders: 0, revenue: 0 };
        agg[name].orders += item.quantity;
        agg[name].revenue += item.total;
      });
      return Object.entries(agg)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
    enabled: !!staff,
  });

  // Compute metrics
  const orders = weekOrders || [];
  const prev = prevWeekOrders || [];
  const totalOrders = orders.length;
  const delivered = orders.filter(o => o.status === "delivered").length;
  const cancelled = orders.filter(o => o.status === "cancelled").length;
  const revenue = orders.filter(o => !["cancelled", "expired"].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0);
  const prevRevenue = prev.filter(o => !["cancelled", "expired"].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0);
  const revChange = prevRevenue ? ((revenue - prevRevenue) / prevRevenue * 100).toFixed(0) : "—";

  const paidStatuses = ["paid", "packed", "out_for_delivery", "delivered"];
  const convThis = totalOrders ? orders.filter(o => paidStatuses.includes(o.status)).length / totalOrders : 0;
  const convPrev = prev.length ? prev.filter(o => paidStatuses.includes(o.status)).length / prev.length : 0;

  const cancelThis = totalOrders ? cancelled / totalOrders : 0;
  const cancelPrev = prev.length ? prev.filter(o => o.status === "cancelled").length / prev.length : 0;

  const deliverySuccess = deliveries?.length ? deliveries.filter((d: any) => d.status === "delivered").length / deliveries.length : 0;
  const firstAttempt = deliveries?.length ? deliveries.filter((d: any) => d.status === "delivered" && d.attempt_number === 1).length / (deliveries.filter((d: any) => d.status === "delivered").length || 1) : 0;

  // Cancellation breakdown
  const cancelReasons: Record<string, number> = {};
  orders.filter(o => o.status === "cancelled").forEach(o => {
    const r = o.cancelled_reason || "Unknown";
    cancelReasons[r] = (cancelReasons[r] || 0) + 1;
  });
  const cancelBreakdown = Object.entries(cancelReasons).map(([reason, count]) => ({
    reason, count, pct: cancelled ? (count / cancelled * 100).toFixed(0) : "0",
  }));

  const kpiRows = [
    { label: "Checkout→Paid Conversion", key: "checkout_to_paid", thisWeek: convThis, lastWeek: convPrev },
    { label: "Cancellation Rate", key: "cancellation_rate", thisWeek: cancelThis, lastWeek: cancelPrev },
    { label: "1st Attempt Delivery", key: "first_delivery", thisWeek: firstAttempt, lastWeek: 0 },
    { label: "Delivery Success Rate", key: "on_time_dispatch", thisWeek: deliverySuccess, lastWeek: 0 },
    { label: "Net Revenue", key: "net_revenue", thisWeek: revenue, lastWeek: prevRevenue },
  ];

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Weekly Review</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[200px] text-center">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-5">
          <h2 className="text-lg font-semibold text-foreground mb-3">Executive Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">📈 Revenue</span>
              <p className="text-lg font-bold text-foreground">{fmt(revenue)} MMK</p>
              <span className="text-xs text-muted-foreground">{revChange !== "—" ? `${Number(revChange) >= 0 ? "▲" : "▼"} ${revChange}% vs last week` : "No comparison"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">📦 Orders</span>
              <p className="text-lg font-bold text-foreground">{totalOrders} total</p>
              <span className="text-xs text-muted-foreground">{delivered} delivered, {cancelled} cancelled</span>
            </div>
            <div>
              <span className="text-muted-foreground">👥 Customers</span>
              <p className="text-lg font-bold text-foreground">{newCustomers} new</p>
            </div>
            <div>
              <span className="text-muted-foreground">🚚 Delivery</span>
              <p className="text-lg font-bold text-foreground">{(deliverySuccess * 100).toFixed(0)}% success</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Comparison Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">KPI Performance</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">This Week</TableHead>
                <TableHead className="text-right">Last Week</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiRows.map(row => {
                const cfg = KPI_TARGETS[row.key];
                const change = row.thisWeek - row.lastWeek;
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{fmtVal(row.thisWeek, cfg.format)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtVal(row.lastWeek, cfg.format)}</TableCell>
                    <TableCell className="text-right">
                      <span className={change >= 0 === cfg.higherIsBetter ? "text-success" : "text-destructive"}>
                        {change >= 0 ? "+" : ""}{cfg.format === "pct" ? `${(change * 100).toFixed(1)}%` : cfg.format === "min" ? `${change.toFixed(0)}m` : fmt(change)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {cfg.target > 0 ? fmtVal(cfg.target, cfg.format) : "Growth"}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon value={row.thisWeek} target={cfg.target} higherIsBetter={cfg.higherIsBetter} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cancellation Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Cancellation Breakdown</CardTitle></CardHeader>
          <CardContent>
            {cancelBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cancellations this week 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelBreakdown.map(r => (
                    <TableRow key={r.reason}>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{r.pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Products This Week</CardTitle></CardHeader>
          <CardContent>
            {(topProducts || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No product data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topProducts || []).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[200px] truncate">{p.name}</TableCell>
                      <TableCell className="text-right">{p.orders}</TableCell>
                      <TableCell className="text-right">{fmt(p.revenue)} MMK</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
