import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Check, X } from "lucide-react";

interface PriceRow {
  stock_code: string;
  selling_price: number;
  matched?: boolean;
  product_id?: string;
}

export default function BulkPriceUpload() {
  const { staff } = useStaff();
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const lines = text.split("\n").filter(l => l.trim());
    const parsed: PriceRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const [stock_code, price] = lines[i].split(",").map(s => s.trim());
      if (stock_code && price) parsed.push({ stock_code, selling_price: Number(price) });
    }

    // Match against DB
    const codes = parsed.map(p => p.stock_code);
    const { data: products } = await supabase.from("products").select("id, stock_code").in("stock_code", codes);
    const codeMap = new Map((products || []).map(p => [p.stock_code, p.id]));
    
    setRows(parsed.map(p => ({
      ...p,
      matched: codeMap.has(p.stock_code),
      product_id: codeMap.get(p.stock_code),
    })));
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const matched = rows.filter(r => r.matched && r.product_id);
      for (const r of matched) {
        await supabase.from("products").update({ selling_price: r.selling_price } as any).eq("id", r.product_id!);
      }
      if (staff) await logActivity(staff.id, "bulk_price_update", "products", undefined, `${matched.length} products`);
      return matched.length;
    },
    onSuccess: (count) => {
      toast.success(`Updated ${count} product prices`);
      setRows([]);
      setFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const matchedCount = rows.filter(r => r.matched).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Bulk Price Upload</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Upload CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">CSV format: <code className="bg-muted px-1 rounded">stock_code,selling_price</code></p>
          <Input type="file" accept=".csv" onChange={handleFile} />
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Preview ({matchedCount}/{rows.length} matched)</CardTitle>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || matchedCount === 0}>
                <Upload className="h-4 w-4 mr-1" /> Apply Prices
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock Code</TableHead>
                  <TableHead>New Price</TableHead>
                  <TableHead>Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.stock_code}</TableCell>
                    <TableCell>{r.selling_price.toLocaleString()}</TableCell>
                    <TableCell>
                      {r.matched ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
