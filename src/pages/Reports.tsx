import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(235, 55%, 27%)", "hsl(356, 87%, 52%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)"];

export default function Reports() {
  const { data: ordersByStatus } = useQuery({
    queryKey: ["report-orders-status"],
    queryFn: async () => {
      const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
      const results = [];
      for (const s of statuses) {
        const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", s);
        results.push({ name: s, value: count || 0 });
      }
      return results;
    },
  });

  const { data: completenessBreakdown } = useQuery({
    queryKey: ["report-completeness"],
    queryFn: async () => {
      const ranges = [
        { label: "0-25%", min: 0, max: 25 },
        { label: "26-50%", min: 26, max: 50 },
        { label: "51-75%", min: 51, max: 75 },
        { label: "76-100%", min: 76, max: 100 },
      ];
      const results = [];
      for (const r of ranges) {
        const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).gte("data_completeness", r.min).lte("data_completeness", r.max);
        results.push({ name: r.label, value: count || 0 });
      }
      return results;
    },
  });

  const { data: quotesByStatus } = useQuery({
    queryKey: ["report-quotes-status"],
    queryFn: async () => {
      const statuses = ["pending", "quoted", "accepted", "rejected", "converted"];
      const results = [];
      for (const s of statuses) {
        const { count } = await supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", s);
        results.push({ name: s, value: count || 0 });
      }
      return results;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Reports</h1>
      <Tabs defaultValue="enrichment">
        <TabsList>
          <TabsTrigger value="enrichment">Data Enrichment</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
        </TabsList>

        <TabsContent value="enrichment">
          <Card>
            <CardHeader><CardTitle className="text-sm">Product Completeness Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completenessBreakdown || []}>
                    <XAxis dataKey="name" /><YAxis /><Tooltip />
                    <Bar dataKey="value" fill="hsl(235, 55%, 27%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader><CardTitle className="text-sm">Orders by Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ordersByStatus || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {(ordersByStatus || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader><CardTitle className="text-sm">Quotes by Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quotesByStatus || []}>
                    <XAxis dataKey="name" /><YAxis /><Tooltip />
                    <Bar dataKey="value" fill="hsl(356, 87%, 52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
