import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, GripVertical, Search, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAvailableSubcategories, useBusinessTypeMappings,
  type WorkingMapping, type ServerMapping, type CategoryNode,
} from "./hooks/useBusinessTypeMappings";

export type CuratorHandle = {
  isDirty: () => boolean;
  getWorking: () => WorkingMapping[];
  reset: () => void;
};

type Props = {
  businessTypeId: string;
  onDirtyChange?: (dirty: boolean) => void;
};

const toWorking = (server: ServerMapping[]): WorkingMapping[] =>
  server.map((m) => ({
    id: m.id,
    business_type_id: m.business_type_id,
    category_id: m.category_id,
    sort_order: m.sort_order,
    is_active: m.is_active,
    _deleted: false,
    _category_name: m.category?.name ?? "(unknown)",
    _parent_name: m.category?.parent?.name ?? null,
    _category_depth: m.category?.depth ?? 1,
  }));

const equalSets = (a: WorkingMapping[], b: WorkingMapping[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.category_id !== y.category_id || x.sort_order !== y.sort_order ||
        x.is_active !== y.is_active || x._deleted !== y._deleted ||
        (x.id ?? "") !== (y.id ?? "")) return false;
  }
  return true;
};

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function SortableRow({ row, onToggle, onRemove }: {
  row: WorkingMapping;
  onToggle: (v: boolean) => void;
  onRemove: () => void;
}) {
  const key = row.id ?? `new-${row.category_id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5",
        !row.is_active && "opacity-60"
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none p-1"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{row._category_name}</div>
        {row._parent_name && (
          <div className="text-xs text-muted-foreground truncate">{row._parent_name}</div>
        )}
      </div>
      <Switch checked={row.is_active} onCheckedChange={onToggle} />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} aria-label="Remove">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export const BusinessTypeCurator = forwardRef<CuratorHandle, Props>(function BusinessTypeCurator(
  { businessTypeId, onDirtyChange },
  ref
) {
  const { data: server = [], isLoading: loadingServer } = useBusinessTypeMappings(businessTypeId);
  const { data: tree = [], isLoading: loadingTree } = useAvailableSubcategories();

  const [working, setWorking] = useState<WorkingMapping[]>([]);
  const [baseline, setBaseline] = useState<WorkingMapping[]>([]);
  const [search, setSearch] = useState("");
  const [openMains, setOpenMains] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<null | "activate" | "deactivate" | "clear">(null);

  // Sync server → working set on load
  useEffect(() => {
    const w = toWorking(server);
    setWorking(w);
    setBaseline(w);
  }, [server]);

  // Default-open all mains when tree loads
  useEffect(() => {
    setOpenMains((prev) => {
      const next = { ...prev };
      tree.forEach((m) => { if (next[m.id] === undefined) next[m.id] = true; });
      return next;
    });
  }, [tree]);

  const dirty = !equalSets(working, baseline);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    getWorking: () => working,
    reset: () => setWorking(baseline),
  }), [dirty, working, baseline]);

  // Index of category_id → working row (alive only)
  const aliveByCat = useMemo(() => {
    const m = new Map<string, WorkingMapping>();
    working.forEach((w) => { if (!w._deleted) m.set(w.category_id, w); });
    return m;
  }, [working]);

  const isChecked = (catId: string) => aliveByCat.has(catId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const setSortOrders = (rows: WorkingMapping[]) => {
    let order = 0;
    return rows.map((r) => r._deleted ? r : { ...r, sort_order: order++ });
  };

  const toggleCheck = (cat: { id: string; name: string }, parent: { name: string } | null) => {
    setWorking((prev) => {
      const idx = prev.findIndex((w) => w.category_id === cat.id);
      if (idx >= 0) {
        const row = prev[idx];
        if (!row._deleted) {
          // Uncheck → soft delete (keep id for proper DELETE later)
          const next = [...prev];
          next[idx] = { ...row, _deleted: true };
          return setSortOrders(next);
        } else {
          // Re-check → resurrect with original id, restore is_active=false default? No: keep prior is_active
          const next = [...prev];
          next[idx] = { ...row, _deleted: false };
          return setSortOrders(next);
        }
      }
      // New row appended at end, inactive by default (content-provenance)
      const aliveCount = prev.filter((w) => !w._deleted).length;
      const newRow: WorkingMapping = {
        business_type_id: businessTypeId,
        category_id: cat.id,
        sort_order: aliveCount,
        is_active: false,
        _deleted: false,
        _category_name: cat.name,
        _parent_name: parent?.name ?? null,
        _category_depth: 1,
      };
      return [...prev, newRow];
    });
  };

  const removeRow = (key: string) => {
    setWorking((prev) => {
      const next = prev.map((r) => {
        const k = r.id ?? `new-${r.category_id}`;
        if (k !== key) return r;
        // If it has a server id, soft delete; otherwise drop entirely
        return r.id ? { ...r, _deleted: true } : { ...r, _deleted: true };
      });
      // Drop new (no id) deleted rows so they vanish from arrays cleanly
      const cleaned = next.filter((r) => !(r._deleted && !r.id));
      return setSortOrders(cleaned);
    });
  };

  const toggleRowActive = (key: string, v: boolean) => {
    setWorking((prev) => prev.map((r) => {
      const k = r.id ?? `new-${r.category_id}`;
      return k === key ? { ...r, is_active: v } : r;
    }));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const alive = working.filter((w) => !w._deleted);
    const dead = working.filter((w) => w._deleted);
    const oldIndex = alive.findIndex((w) => (w.id ?? `new-${w.category_id}`) === active.id);
    const newIndex = alive.findIndex((w) => (w.id ?? `new-${w.category_id}`) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(alive, oldIndex, newIndex).map((r, i) => ({ ...r, sort_order: i }));
    setWorking([...reordered, ...dead]);
  };

  const aliveRows = working.filter((w) => !w._deleted).sort((a, b) => a.sort_order - b.sort_order);

  // Soft validator: any depth-0 alive in the working set?
  const hasMainCategoryRow = aliveRows.some((r) => r._category_depth === 0);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    return tree
      .map((m) => {
        const mainHit = m.name.toLowerCase().includes(q);
        const subs = m.subs.filter((s) => s.name.toLowerCase().includes(q));
        if (mainHit || subs.length > 0) return { ...m, subs: mainHit ? m.subs : subs };
        return null;
      })
      .filter(Boolean) as CategoryNode[];
  }, [tree, search]);

  const applyBulk = (action: "activate" | "deactivate" | "clear") => {
    setWorking((prev) => {
      if (action === "clear") {
        // Soft-delete everything that has an id; drop new rows
        return prev
          .map((r) => (r.id ? { ...r, _deleted: true } : { ...r, _deleted: true }))
          .filter((r) => !(r._deleted && !r.id));
      }
      const v = action === "activate";
      return prev.map((r) => (r._deleted ? r : { ...r, is_active: v }));
    });
    setBulkAction(null);
  };

  return (
    <div className="space-y-4">
      {hasMainCategoryRow && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This is a main category. The landing page will render its heading only, with no chips beneath.
            Add sub-categories instead, or proceed if intentional.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT — Available */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Available</h3>
              <span className="text-xs text-muted-foreground">{tree.length} main</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories"
                className="pl-8"
              />
            </div>
            <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
              {loadingTree ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
              ) : filteredTree.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No matches</p>
              ) : filteredTree.map((m) => {
                const open = openMains[m.id] ?? true;
                return (
                  <div key={m.id} className="border rounded-md">
                    <button
                      type="button"
                      onClick={() => setOpenMains({ ...openMains, [m.id]: !open })}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-muted/50 rounded-md"
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="flex-1 text-left">{highlight(m.name, search)}</span>
                      <span className="text-xs text-muted-foreground">({m.subs.length})</span>
                    </button>
                    {open && (
                      <div className="pl-7 pr-2 pb-2 space-y-0.5">
                        {m.subs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">No sub-categories</p>
                        ) : m.subs.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={isChecked(s.id)}
                              onCheckedChange={() => toggleCheck(s, { name: m.name })}
                            />
                            <span className="text-sm">{highlight(s.name, search)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — Curated */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Curated <Badge variant="secondary" className="ml-1">{aliveRows.length}</Badge>
              </h3>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" disabled={aliveRows.length === 0} onClick={() => setBulkAction("activate")}>
                  Activate all
                </Button>
                <Button size="sm" variant="outline" disabled={aliveRows.length === 0} onClick={() => setBulkAction("deactivate")}>
                  Deactivate all
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" disabled={aliveRows.length === 0} onClick={() => setBulkAction("clear")}>
                  Clear all
                </Button>
              </div>
            </div>
            <div className="max-h-[480px] overflow-y-auto pr-1">
              {loadingServer ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
              ) : aliveRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  No sub-categories curated yet. Check items in the left pane to add them.
                </p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext
                    items={aliveRows.map((r) => r.id ?? `new-${r.category_id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {aliveRows.map((row) => {
                        const key = row.id ?? `new-${row.category_id}`;
                        return (
                          <SortableRow
                            key={key}
                            row={row}
                            onToggle={(v) => toggleRowActive(key, v)}
                            onRemove={() => removeRow(key)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={bulkAction !== null} onOpenChange={(o) => !o && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "activate" && `Activate ${aliveRows.length} sub-categories?`}
              {bulkAction === "deactivate" && `Deactivate ${aliveRows.length} sub-categories?`}
              {bulkAction === "clear" && `Remove all ${aliveRows.length} curated sub-categories?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "clear"
                ? "This will delete every junction row for this business type when you save. The categories themselves are not affected. This cannot be undone after saving."
                : "Changes apply to your working set and are persisted when you click Save."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={bulkAction === "clear" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => bulkAction && applyBulk(bulkAction)}
            >
              {bulkAction === "clear" ? "Remove all" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});