import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, Search, Plus, ShoppingCart, DollarSign, AlertTriangle, ClipboardList, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LiveKpis {
  orders_today: number;
  revenue_today: number;
  active_sla_breaches: number;
  active_sla_warnings: number;
  open_tasks: number;
  queue_payment: number;
  queue_warehouse: number;
  queue_delivery: number;
}

interface OrderCommandCenterProps {
  viewMode: "kanban" | "table";
  onViewModeChange: (mode: "kanban" | "table") => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function OrderCommandCenter({ viewMode, onViewModeChange, search, onSearchChange }: OrderCommandCenterProps) {
  const navigate = useNavigate();

  const { data: kpis } = useQuery({
    queryKey: ["live-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_live_kpis");
      if (error) throw error;
      return data as unknown as LiveKpis;
    },
    refetchInterval: 30000,
  });

  const statCards = [
    { label: "Today", value: kpis?.orders_today ?? "—", icon: ShoppingCart, color: "text-foreground" },
    { label: "Revenue", value: kpis?.revenue_today ? `${(Number(kpis.revenue_today) / 1000000).toFixed(1)}M` : "—", icon: DollarSign, color: "text-success" },
    {
      label: "SLA",
      value: (kpis?.active_sla_breaches ?? 0) + (kpis?.active_sla_warnings ?? 0),
      icon: AlertTriangle,
      color: (kpis?.active_sla_breaches ?? 0) > 0 ? "text-destructive" : "text-warning",
      bg: (kpis?.active_sla_breaches ?? 0) > 0 ? "bg-destructive/5" : "",
    },
    { label: "Tasks", value: kpis?.open_tasks ?? "—", icon: ClipboardList, color: "text-info" },
    { label: "Risk", value: 0, icon: ShieldAlert, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Order Command Center</h1>
        <Button onClick={() => navigate("/orders/create")} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Create Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className={s.bg || ""}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div>
                <p className="text-xl font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && onViewModeChange(v as "kanban" | "table")}
          className="border border-border rounded-md"
        >
          <ToggleGroupItem value="kanban" aria-label="Kanban view" className="h-8 px-3 text-xs gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view" className="h-8 px-3 text-xs gap-1.5">
            <List className="h-3.5 w-3.5" /> Table
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders…" value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9 h-8" />
        </div>
      </div>
    </div>
  );
}
