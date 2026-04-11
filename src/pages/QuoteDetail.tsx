import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Send, Save, ShoppingCart, UserPlus, ExternalLink } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  responded: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  converted: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const LEAD_TIMES = ["1-3 days", "1 week", "2 weeks", "3 weeks", "4 weeks"];
const AVAILABILITY = [
  { value: "in_stock", label: "In Stock", dot: "bg-green-500" },
  { value: "low_stock", label: "Low Stock", dot: "bg-yellow-500" },
  { value: "out_of_stock", label: "Out of Stock", dot: "bg-red-500" },
  { value: "back_order", label: "Back Order", dot: "bg-orange-500" },
];

interface ResponseItem {
  product_name: string;
  product_id?: string;
  qty_requested: number;
  quoted_price: number | "";
  available_qty: number | "";
  lead_time: string;
  availability: string;
  notes: string;
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();

  const [responseItems, setResponseItems] = useState<ResponseItem[]>([]);
  const [validUntil, setValidUntil] = useState<Date | undefined>(addDays(new Date(), 14));
  const [internalNotes, setInternalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch quote
  const { data: quote, isLoading } = useQuery({
    queryKey: ["admin-quote", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*, customers(name, company_name, email, phone), assigned_staff:staff_profiles!quotes_assigned_to_fkey(full_name)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch staff list for assignment
  const { data: staffList } = useQuery({
    queryKey: ["staff-list-simple"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_profiles").select("id, full_name").eq("is_active", true).order("full_name");
      return data || [];
    },
  });

  // Initialize form from quote data
  useEffect(() => {
    if (!quote || initialized) return;
    const items = Array.isArray(quote.items) ? quote.items : [];
    const existing = Array.isArray(quote.response_items) ? quote.response_items as any[] : [];

    const mapped: ResponseItem[] = items.map((item: any, i: number) => {
      const ex = existing[i] || {};
      return {
        product_name: item.description || item.product_name || `Item ${i + 1}`,
        product_id: item.product_id || null,
        qty_requested: item.quantity || item.qty || 0,
        quoted_price: ex.quoted_price ?? "",
        available_qty: ex.available_qty ?? "",
        lead_time: ex.lead_time || "",
        availability: ex.availability || "",
        notes: ex.notes || "",
      };
    });
    setResponseItems(mapped);
    setInternalNotes(quote.admin_internal_notes || "");
    if (quote.valid_until) setValidUntil(new Date(quote.valid_until));
    setInitialized(true);
  }, [quote, initialized]);

  // Auto-calculate total
  const calculatedTotal = useMemo(() => {
    return responseItems.reduce((sum, r) => {
      const price = typeof r.quoted_price === "number" ? r.quoted_price : 0;
      const qty = typeof r.available_qty === "number" ? r.available_qty : 0;
      return sum + price * qty;
    }, 0);
  }, [responseItems]);

  // Update a response item
  const updateItem = (index: number, field: keyof ResponseItem, value: any) => {
    setResponseItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ send }: { send: boolean }) => {
      const responseData = responseItems.map(r => ({
        product_name: r.product_name,
        product_id: r.product_id,
        qty_requested: r.qty_requested,
        quoted_price: r.quoted_price === "" ? null : r.quoted_price,
        available_qty: r.available_qty === "" ? null : r.available_qty,
        lead_time: r.lead_time,
        availability: r.availability,
        notes: r.notes,
      }));

      const updates: any = {
        response_items: responseData,
        total_quoted: calculatedTotal,
        valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
        admin_internal_notes: internalNotes || null,
      };

      if (send) {
        updates.status = "responded";
      }

      const { error } = await supabase.from("quotes").update(updates).eq("id", id!);
      if (error) throw error;

      if (staff) await logActivity(staff.id, send ? "sent_response" : "saved_draft", "quote", id!, quote?.quote_number);
    },
    onSuccess: (_, { send }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote-counts"] });
      toast.success(send ? "Quote response sent" : "Draft saved");
      if (send) navigate("/quotes");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (staffId: string | null) => {
      const { error } = await supabase.from("quotes").update({ assigned_to: staffId } as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", id] });
      toast.success("Assignment updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Convert to order mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!quote?.customer_id || !staff) throw new Error("Missing customer or staff");
      const items = (Array.isArray(quote.response_items) ? quote.response_items as any[] : [])
        .filter((r: any) => r.quoted_price && r.available_qty)
        .map((r: any) => ({
          product_id: r.product_id || null,
          quantity: r.available_qty,
          unit_price_override: r.quoted_price,
        }));

      if (items.length === 0) throw new Error("No priced items to convert");

      const { data, error } = await supabase.rpc("create_manual_order", {
        p_customer_id: quote.customer_id,
        p_created_by: staff.id,
        p_source: "quote",
        p_items: items,
        p_internal_notes: `Converted from ${quote.quote_number}`,
      });
      if (error) throw error;

      // Update quote with converted_order_id
      const { error: updateErr } = await supabase
        .from("quotes")
        .update({ converted_order_id: data, status: "converted" } as any)
        .eq("id", id!);
      if (updateErr) throw updateErr;

      return data;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote-counts"] });
      toast.success("Order created from quote");
      navigate(`/orders/${orderId}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = (send: boolean) => {
    if (send) {
      const hasPrice = responseItems.some(r => r.quoted_price !== "" && r.quoted_price !== 0);
      if (!hasPrice) { toast.error("At least one item must have a quoted price"); return; }
    }
    setIsSubmitting(true);
    saveMutation.mutate({ send }, { onSettled: () => setIsSubmitting(false) });
  };

  if (isLoading || !quote) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const items = Array.isArray(quote.items) ? quote.items : [];
  const customerName = quote.company_name || (quote as any).customers?.company_name || (quote as any).customers?.name || "—";
  const contactEmail = quote.contact_email || (quote as any).customers?.email;
  const contactPhone = quote.contact_phone || (quote as any).customers?.phone;
  const isConverted = quote.status === "converted";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{quote.quote_number}</h1>
            <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[quote.status] || ""}`}>{quote.status}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!quote.assigned_to && staff && (
            <Button variant="outline" size="sm" onClick={() => assignMutation.mutate(staff.id)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign to Me
            </Button>
          )}
          {quote.status === "accepted" && !isConverted && (
            <Button variant="default" size="sm" onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
              <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Convert to Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Customer Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{customerName}</span></div>
                {quote.contact_person && <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{quote.contact_person}</span></div>}
                {contactEmail && <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a></div>}
                {contactPhone && <div><span className="text-muted-foreground">Phone:</span> <a href={`tel:${contactPhone}`} className="text-primary hover:underline">{contactPhone}</a></div>}
                {quote.project_type && <div><span className="text-muted-foreground">Project:</span> {quote.project_type}</div>}
                {quote.timeline && <div><span className="text-muted-foreground">Timeline:</span> {quote.timeline}</div>}
                {quote.budget_range && <div><span className="text-muted-foreground">Budget:</span> {quote.budget_range}</div>}
              </div>
            </CardContent>
          </Card>

          {/* Requested Items */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Requested Items ({items.length})</CardTitle></CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items requested</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3 text-sm">
                      <p className="font-medium">{item.description || item.product_name || `Item ${i + 1}`}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity || item.qty || "—"}</p>
                      {item.notes && <p className="text-muted-foreground mt-1 text-xs">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Builder */}
          {!isConverted && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Quote Response</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {responseItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items to respond to. Add items via the New Quote dialog or E-Mall form.</p>
                ) : (
                  <div className="space-y-4">
                    {responseItems.map((r, i) => (
                      <div key={i} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{r.product_name}</p>
                            <p className="text-xs text-muted-foreground">Qty requested: {r.qty_requested}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Quoted Price (MMK)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={r.quoted_price}
                              onChange={e => updateItem(i, "quoted_price", e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Available Qty</Label>
                            <Input
                              type="number"
                              min={0}
                              value={r.available_qty}
                              onChange={e => updateItem(i, "available_qty", e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Lead Time</Label>
                            <Select value={r.lead_time} onValueChange={v => updateItem(i, "lead_time", v)}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {LEAD_TIMES.map(lt => <SelectItem key={lt} value={lt}>{lt}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Availability</Label>
                            <Select value={r.availability} onValueChange={v => updateItem(i, "availability", v)}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {AVAILABILITY.map(a => (
                                  <SelectItem key={a.value} value={a.value}>
                                    <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${a.dot}`} />{a.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <Input value={r.notes} onChange={e => updateItem(i, "notes", e.target.value)} placeholder="Notes for customer…" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total + Valid Until */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end pt-4 border-t">
                  <div className="flex-1">
                    <Label className="text-xs">Total Quoted</Label>
                    <p className="text-lg font-bold text-foreground">MMK {calculatedTotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Valid Until</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !validUntil && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {validUntil ? format(validUntil, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    {validUntil && validUntil < new Date() && (
                      <p className="text-xs text-destructive mt-1">This date is in the past</p>
                    )}
                  </div>
                </div>

                {/* Internal Notes */}
                <div>
                  <Label className="text-xs">Internal Notes (staff only)</Label>
                  <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Internal notes…" rows={3} />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleSave(true)} disabled={isSubmitting}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Save & Send Response
                  </Button>
                  <Button variant="outline" onClick={() => handleSave(false)} disabled={isSubmitting}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save Draft
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Quote Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Quote #</span><span className="font-mono">{quote.quote_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(quote.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[quote.status] || ""}`}>{quote.status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="capitalize">{quote.source?.replace("_", " ") || "—"}</span></div>
              {quote.valid_until && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span className={new Date(quote.valid_until) < new Date() ? "text-destructive font-medium" : "text-green-600"}>
                    {new Date(quote.valid_until).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Assignment */}
              <div className="pt-2 border-t">
                <Label className="text-xs">Assigned To</Label>
                <Select
                  value={quote.assigned_to || "unassigned"}
                  onValueChange={v => assignMutation.mutate(v === "unassigned" ? null : v)}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(staffList || []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Convert to Order / Converted */}
          {isConverted && quote.converted_order_id && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="pt-4">
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 mb-2">Converted to Order</Badge>
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate(`/orders/${quote.converted_order_id}`)}>
                  View Order <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {quote.status === "accepted" && !isConverted && (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-medium">Ready to Convert</p>
                <p className="text-xs text-muted-foreground">Create an order from this accepted quote's response items.</p>
                <Button size="sm" className="w-full" onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Convert to Order
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Additional Notes from customer */}
          {quote.additional_notes && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Customer Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{quote.additional_notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
