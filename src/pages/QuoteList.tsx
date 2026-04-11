import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const STATUSES = [
  { value: "all", label: "All", color: "" },
  { value: "pending", label: "Pending", color: "bg-muted text-muted-foreground" },
  { value: "responded", label: "Responded", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "accepted", label: "Accepted", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  { value: "converted", label: "Converted", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
];

const PAGE_SIZE = 25;

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(s => s.value === status) || STATUSES[1];
  return <Badge variant="secondary" className={`text-[10px] ${s.color}`}>{s.label}</Badge>;
}

export default function QuoteList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [status, debouncedSearch]);

  // Status counts
  const { data: counts } = useQuery({
    queryKey: ["quote-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("status");
      const c: Record<string, number> = { all: 0, pending: 0, responded: 0, accepted: 0, expired: 0, converted: 0 };
      (data || []).forEach((q: any) => { c[q.status] = (c[q.status] || 0) + 1; c.all++; });
      return c;
    },
  });

  // Quotes list
  const { data: quotes, isLoading } = useQuery({
    queryKey: ["admin-quotes", status, debouncedSearch, page],
    queryFn: async () => {
      let query = supabase
        .from("quotes")
        .select("*, customers(name, company_name, email, phone), assigned_staff:staff_profiles!quotes_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (status !== "all") query = query.eq("status", status);
      if (debouncedSearch) {
        query = query.or(`quote_number.ilike.%${debouncedSearch}%,company_name.ilike.%${debouncedSearch}%`);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const hasNext = (quotes?.length || 0) === PAGE_SIZE;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quote Management</h1>
          <p className="text-sm text-muted-foreground">View and respond to customer quote requests</p>
        </div>
        <NewQuoteDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} staff={staff} queryClient={queryClient} />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              status === s.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {s.label} {counts ? `(${counts[s.value] || 0})` : ""}
          </button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quote number or company name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center"># Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Quoted</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" /></TableCell></TableRow>
                ) : (quotes || []).length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No quotes found.</TableCell></TableRow>
                ) : (quotes || []).map((q: any) => {
                  const items = Array.isArray(q.items) ? q.items : [];
                  const isExpired = q.valid_until && new Date(q.valid_until) < new Date();
                  const customerName = q.company_name || q.customers?.company_name || q.customers?.name || "—";
                  const assignedName = q.assigned_staff?.full_name || "—";

                  return (
                    <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/quotes/${q.id}`)}>
                      <TableCell className="font-mono text-xs font-medium">{q.quote_number}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">{customerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(q.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center text-sm">{items.length}</TableCell>
                      <TableCell><StatusBadge status={q.status} /></TableCell>
                      <TableCell className="text-right text-sm whitespace-nowrap">
                        {q.total_quoted ? `MMK ${Number(q.total_quoted).toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className={`text-xs whitespace-nowrap ${isExpired ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{assignedName}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); navigate(`/quotes/${q.id}`); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <p className="text-xs text-muted-foreground">Page {page + 1}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── New Quote Dialog ─── */
function NewQuoteDialog({ open, onOpenChange, staff, queryClient }: { open: boolean; onOpenChange: (v: boolean) => void; staff: any; queryClient: any }) {
  const [form, setForm] = useState({ company_name: "", contact_person: "", contact_email: "", contact_phone: "", project_type: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("quotes").insert({
        company_name: form.company_name,
        contact_person: form.contact_person || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        project_type: form.project_type || null,
        additional_notes: form.notes || null,
        items: [],
        source: "manual",
        status: "pending",
        assigned_to: staff?.id || null,
      } as any);
      if (error) throw error;
      toast.success("Quote created");
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote-counts"] });
      onOpenChange(false);
      setForm({ company_name: "", contact_person: "", contact_email: "", contact_phone: "", project_type: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Quote</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Manual Quote</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Business name" /></div>
          <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} placeholder="Full name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="email@example.com" /></div>
            <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="+95 9 XXX" /></div>
          </div>
          <div>
            <Label>Project Type</Label>
            <Select value={form.project_type} onValueChange={v => set("project_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New Kitchen Setup">New Kitchen Setup</SelectItem>
                <SelectItem value="Hotel Renovation">Hotel Renovation</SelectItem>
                <SelectItem value="Restaurant Opening">Restaurant Opening</SelectItem>
                <SelectItem value="Equipment Replacement">Equipment Replacement</SelectItem>
                <SelectItem value="Bulk Consumables / Supplies">Bulk Consumables / Supplies</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional details…" rows={3} /></div>
          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Quote"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
