import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff } = useStaff();
  const [totalQuoted, setTotalQuoted] = useState("");

  const { data: quote } = useQuery({
    queryKey: ["admin-quote", id],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("*, customers(name, company_name, email, phone)").eq("id", id!).single();
      if (data) setTotalQuoted(data.total_quoted?.toString() || "");
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("quotes").update(updates).eq("id", id!);
      if (error) throw error;
      if (staff) await logActivity(staff.id, "updated", "quote", id!, quote?.quote_number);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-quote", id] }); toast.success("Quote updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!quote) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const items = Array.isArray(quote.items) ? quote.items : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{quote.quote_number}</h1>
          <Badge variant="secondary" className="text-xs">{quote.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Requested Items</CardTitle></CardHeader>
            <CardContent>
              {items.length === 0 ? <p className="text-sm text-muted-foreground">No items</p> : (
                <div className="space-y-2">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="border rounded p-3 text-sm">
                      <p className="font-medium">{item.description || item.product_name || `Item ${i + 1}`}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity || item.qty || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Response</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Total Quoted</Label>
                <Input type="number" value={totalQuoted} onChange={e => setTotalQuoted(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateMutation.mutate({ status: "quoted", total_quoted: Number(totalQuoted) })}>Send Quote</Button>
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ status: "accepted" })}>Mark Accepted</Button>
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ status: "rejected" })}>Mark Rejected</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{(quote as any).customers?.company_name || (quote as any).customers?.name || "—"}</p>
              <p className="text-muted-foreground">{(quote as any).customers?.email}</p>
              <p className="text-muted-foreground">{(quote as any).customers?.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span>Project Type</span><span>{quote.project_type || "—"}</span></div>
              <div className="flex justify-between"><span>Budget</span><span>{quote.budget_range || "—"}</span></div>
              <div className="flex justify-between"><span>Timeline</span><span>{quote.timeline || "—"}</span></div>
              <div className="flex justify-between"><span>Valid Until</span><span>{quote.valid_until || "—"}</span></div>
            </CardContent>
          </Card>

          {quote.additional_notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Customer Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{quote.additional_notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
