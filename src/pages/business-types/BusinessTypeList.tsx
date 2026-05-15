import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Briefcase, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "inactive";

export default function BusinessTypeList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-business-types"],
    enabled: !!staff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_types")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active, label }: { id: string; is_active: boolean; label: string }) => {
      const { error } = await supabase.from("business_types").update({ is_active }).eq("id", id);
      if (error) throw error;
      if (staff) await logActivity(staff.id, is_active ? "reactivated" : "deactivated", "business_type", id, label);
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-business-types"] });
      const prev = queryClient.getQueryData<any[]>(["admin-business-types"]);
      queryClient.setQueryData<any[]>(["admin-business-types"], (old) =>
        (old || []).map((r) => (r.id === id ? { ...r, is_active } : r))
      );
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-business-types"], ctx.prev);
      toast.error(e.message || "Failed to update");
    },
    onSuccess: () => toast.success("Business type updated"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-business-types"] }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r: any) => {
      if (filter === "active" && !r.is_active) return false;
      if (filter === "inactive" && r.is_active) return false;
      if (q && !r.label.toLowerCase().includes(q) && !r.link_url.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Types</h1>
          <p className="text-sm text-muted-foreground">Homepage "Shop by Business Type" cards</p>
        </div>
        <Button size="sm" onClick={() => navigate("/business-types/new")}>
          <Plus className="h-4 w-4 mr-1" /> New Business Type
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(["all", "active", "inactive"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search label or URL"
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No business types match.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r: any) => (
            <Card
              key={r.id}
              className={cn("overflow-hidden transition-opacity cursor-pointer hover:border-primary/50", !r.is_active && "opacity-60")}
              onClick={() => navigate(`/business-types/${r.id}`)}
            >
              <div className="relative bg-muted aspect-square">
                {r.image_url ? (
                  <img src={r.image_url} alt={r.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Briefcase className="h-12 w-12" />
                  </div>
                )}
                <Badge variant="secondary" className="absolute top-2 left-2 text-xs">#{r.sort_order}</Badge>
              </div>
              <CardContent className="pt-3 pb-3 space-y-2">
                <div className="font-semibold text-foreground truncate">{r.label}</div>
                <div className="font-mono text-xs text-muted-foreground truncate">{r.link_url}</div>
                <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: r.id, is_active: v, label: r.label })}
                    />
                    <span className="text-xs text-muted-foreground">{r.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/business-types/${r.id}`)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}