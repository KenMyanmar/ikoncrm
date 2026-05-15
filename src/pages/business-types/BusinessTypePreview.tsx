import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useBusinessTypeMappings } from "./hooks/useBusinessTypeMappings";

export function BusinessTypePreview({ businessTypeId, label }: { businessTypeId: string; label: string }) {
  const { data: mappings = [], isLoading } = useBusinessTypeMappings(businessTypeId);

  // Group by parent main-category, preserving curated sort_order within each group;
  // group display order = first appearance of that parent in sort order.
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { name: string; rows: typeof mappings }>();
    [...mappings]
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((m) => {
        const parentId = m.category?.parent?.id ?? m.category?.id ?? "ungrouped";
        const parentName = m.category?.parent?.name ?? m.category?.name ?? "Ungrouped";
        if (!map.has(parentId)) {
          map.set(parentId, { name: parentName, rows: [] });
          order.push(parentId);
        }
        map.get(parentId)!.rows.push(m);
      });
    return order.map((id) => ({ id, ...map.get(id)! }));
  }, [mappings]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Storefront preview</p>
          <h2 className="text-2xl font-bold">{label || "Business Type"}</h2>
          <p className="text-sm text-muted-foreground">Read-only mock of how the chip rail will render on /business/&lt;slug&gt;</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center border rounded-md">
            No sub-categories curated yet.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.id} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{g.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {g.rows.map((r) => (
                    <Badge
                      key={r.id}
                      variant={r.is_active ? "secondary" : "outline"}
                      className={cn("text-sm font-normal py-1 px-3", !r.is_active && "opacity-50")}
                    >
                      {r.category?.name ?? "(unknown)"}
                      {!r.is_active && <span className="ml-1.5 text-[10px] uppercase">(inactive)</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}