import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { X, Plus, Search } from "lucide-react";

interface EditItem {
  id?: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  isNew?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentItems: any[];
  order: any;
}

export function OrderEditItemsDialog({ open, onOpenChange, orderId, currentItems, order }: Props) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<EditItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(currentItems.map(i => ({
        id: i.id,
        product_id: i.product_id,
        product_name: i.product_name || "",
        sku: i.sku || "",
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
      })));
    }
  }, [open, currentItems]);

  const { data: products } = useQuery({
    queryKey: ["product-search-edit", productSearch],
    queryFn: async () => {
      if (productSearch.length < 2) return [];
      const { data } = await supabase.from("products")
        .select("id, description, stock_code, selling_price")
        .or(`description.ilike.%${productSearch}%,stock_code.ilike.%${productSearch}%`)
        .eq("is_active", true).limit(8);
      return data || [];
    },
    enabled: productSearch.length >= 2,
  });

  const addProduct = (p: any) => {
    if (items.find(i => i.product_id === p.id)) {
      setItems(prev => prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, {
        product_id: p.id,
        product_name: p.description,
        sku: p.stock_code,
        quantity: 1,
        unit_price: Number(p.selling_price || 0),
        isNew: true,
      }]);
    }
    setProductSearch("");
    setShowDropdown(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const oldIds = currentItems.map(i => i.id);
      const newIds = items.filter(i => i.id).map(i => i.id!);
      const removedIds = oldIds.filter(id => !newIds.includes(id));

      // Delete removed items
      for (const rid of removedIds) {
        await supabase.from("order_items").delete().eq("id", rid);
      }

      // Update existing items
      for (const item of items.filter(i => i.id)) {
        await supabase.from("order_items").update({
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }).eq("id", item.id!);
      }

      // Insert new items
      for (const item of items.filter(i => i.isNew)) {
        await supabase.from("order_items").insert({
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        });
      }

      // Recalculate totals
      const newSubtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const newTotal = newSubtotal + Number(order.shipping_cost || 0) - Number(order.discount || 0);
      await supabase.from("orders").update({ subtotal: newSubtotal, total: newTotal } as any).eq("id", orderId);

      // Audit trail
      await (supabase as any).from("order_edits").insert({
        order_id: orderId,
        edited_by: staff!.id,
        edit_type: "items_changed",
        description: `Items edited: ${removedIds.length} removed, ${items.filter(i => i.isNew).length} added`,
        old_value: { items: currentItems.map(i => ({ id: i.id, qty: i.quantity, price: i.unit_price })) },
        new_value: { items: items.map(i => ({ product_id: i.product_id, qty: i.quantity, price: i.unit_price })) },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-items", orderId] });
      toast.success("Items updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit Order Items</DialogTitle></DialogHeader>

        {/* Add product */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Add product..."
            value={productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setShowDropdown(true); }}
            className="pl-9 h-8"
          />
          {showDropdown && products && products.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
              {products.map((p: any) => (
                <button key={p.id} className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs" onClick={() => addProduct(p)}>
                  {p.description} — {p.stock_code}
                </button>
              ))}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-28">Price</TableHead>
              <TableHead className="w-24 text-right">Total</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.product_id + idx} className={item.isNew ? "bg-accent/20" : ""}>
                <TableCell className="text-xs">{item.product_name}<br /><span className="text-muted-foreground font-mono">{item.sku}</span></TableCell>
                <TableCell>
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => {
                    const q = parseInt(e.target.value) || 1;
                    setItems(prev => prev.map((i, j) => j === idx ? { ...i, quantity: q } : i));
                  }} className="h-7 w-16 text-xs" />
                </TableCell>
                <TableCell>
                  <Input type="number" value={item.unit_price} onChange={(e) => {
                    const p = parseFloat(e.target.value) || 0;
                    setItems(prev => prev.map((i, j) => j === idx ? { ...i, unit_price: p } : i));
                  }} className="h-7 w-24 text-xs" />
                </TableCell>
                <TableCell className="text-right text-xs font-medium">{(item.quantity * item.unit_price).toLocaleString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setItems(prev => prev.filter((_, j) => j !== idx))}>
                    <X className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || items.length === 0}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
