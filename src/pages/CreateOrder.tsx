import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, X, User, MapPin } from "lucide-react";

interface OrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  unit_price_override?: number;
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const { staff } = useStaff();

  // Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Products
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);

  // Delivery
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [deliveryZone, setDeliveryZone] = useState("yangon_metro");

  // Payment & Notes
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [internalNotes, setInternalNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [source, setSource] = useState("crm_manual");
  const [discount, setDiscount] = useState(0);

  // Confirm dialog
  const [showConfirm, setShowConfirm] = useState(false);

  // Customer search query
  const { data: customers } = useQuery({
    queryKey: ["customer-search", customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      const { data } = await supabase.from("customers")
        .select("id, name, company_name, phone, email")
        .or(`name.ilike.%${customerSearch}%,company_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
        .limit(10);
      return data || [];
    },
    enabled: customerSearch.length >= 2,
  });

  // Product search query
  const { data: products } = useQuery({
    queryKey: ["product-search-create", productSearch],
    queryFn: async () => {
      if (productSearch.length < 2) return [];
      const { data } = await supabase.from("products")
        .select("id, description, stock_code, selling_price, thumbnail_url")
        .or(`description.ilike.%${productSearch}%,stock_code.ilike.%${productSearch}%`)
        .eq("is_active", true)
        .limit(10);
      return data || [];
    },
    enabled: productSearch.length >= 2,
  });

  // Customer addresses
  const { data: addresses } = useQuery({
    queryKey: ["customer-addresses", selectedCustomer?.id],
    queryFn: async () => {
      const { data } = await supabase.from("customer_addresses")
        .select("*").eq("customer_id", selectedCustomer!.id);
      return data || [];
    },
    enabled: !!selectedCustomer?.id,
  });

  // Delivery fees
  const { data: deliveryFees } = useQuery({
    queryKey: ["delivery-fees"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_fees").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const deliveryFee = useMemo(() => {
    const zone = deliveryFees?.find(f => f.zone === deliveryZone);
    return zone ? Number(zone.fee) : 5000;
  }, [deliveryFees, deliveryZone]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (i.unit_price_override ?? i.unit_price) * i.quantity, 0), [items]);
  const total = useMemo(() => Math.max(0, subtotal + deliveryFee - discount), [subtotal, deliveryFee, discount]);

  const addProduct = useCallback((product: any) => {
    if (items.find(i => i.product_id === product.id)) {
      setItems(prev => prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, {
        product_id: product.id,
        product_name: product.description,
        sku: product.stock_code,
        quantity: 1,
        unit_price: Number(product.selling_price || 0),
      }]);
    }
    setProductSearch("");
    setShowProductDropdown(false);
  }, [items]);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  }, []);

  const updateItemQty = useCallback((productId: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  }, []);

  const updateItemPrice = useCallback((productId: string, price: number) => {
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, unit_price_override: price } : i));
  }, []);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const rpcItems = items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price_override: i.unit_price_override ?? null,
      }));

      const selectedAddr = addresses?.find(a => a.id === selectedAddressId);
      const { data, error } = await supabase.rpc("create_manual_order", {
        p_customer_id: selectedCustomer.id,
        p_created_by: staff!.id,
        p_payment_method: paymentMethod,
        p_delivery_address_id: selectedAddressId || null,
        p_delivery_zone: deliveryZone,
        p_contact_name: selectedAddr?.contact_phone ? (selectedCustomer.name || "") : (selectedCustomer.name || ""),
        p_contact_phone: selectedAddr?.contact_phone || selectedCustomer.phone || "",
        p_customer_notes: customerNotes || null,
        p_internal_notes: internalNotes || null,
        p_source: source,
        p_items: rpcItems,
      } as any);

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);

      // Apply discount if any
      if (discount > 0) {
        await supabase.from("orders").update({ discount, total: result.total - discount } as any).eq("id", result.order_id);
      }

      await logActivity(staff!.id, "order_created_manual", "order", result.order_id, result.order_number);
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Order ${result.order_number} created!`);
      navigate(`/orders/${result.order_id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSubmit = selectedCustomer && items.length > 0;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Create Manual Order</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Selection */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Customer</CardTitle></CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-foreground">{selectedCustomer.company_name || selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone} · {selectedCustomer.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setSelectedAddressId(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or company..."
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="pl-9"
                  />
                  {showCustomerDropdown && customers && customers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {customers.map((c: any) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b border-border last:border-0"
                          onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(""); }}
                        >
                          <p className="font-medium text-foreground">{c.company_name || c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone} · {c.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Picker */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Products</CardTitle></CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="pl-9"
                />
                {showProductDropdown && products && products.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {products.map((p: any) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b border-border last:border-0 flex items-center gap-3"
                        onClick={() => addProduct(p)}
                      >
                        {p.thumbnail_url && <img src={p.thumbnail_url} alt="" className="h-8 w-8 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{p.description}</p>
                          <p className="text-xs text-muted-foreground">{p.stock_code} · {p.selling_price ? `${Number(p.selling_price).toLocaleString()} MMK` : "No price"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-32">Unit Price</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <p className="text-sm text-foreground truncate max-w-[200px]">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItemQty(item.product_id, parseInt(e.target.value) || 1)}
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price_override ?? item.unit_price}
                            onChange={(e) => updateItemPrice(item.product_id, parseFloat(e.target.value) || 0)}
                            className="h-8 w-28"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {((item.unit_price_override ?? item.unit_price) * item.quantity).toLocaleString()} MMK
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeItem(item.product_id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No products added yet. Search above to add.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Delivery */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Delivery</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {addresses && addresses.length > 0 && (
                <div>
                  <Label className="text-xs">Saved Address</Label>
                  <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select address..." /></SelectTrigger>
                    <SelectContent>
                      {addresses.map((a: any) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.label || a.address_line} — {a.township}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Delivery Zone</Label>
                <Select value={deliveryZone} onValueChange={setDeliveryZone}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(deliveryFees || []).map((f: any) => (
                      <SelectItem key={f.id} value={f.zone} className="text-xs">
                        {f.label} — {Number(f.fee).toLocaleString()} MMK
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Payment & Source</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                    <SelectItem value="kbz_pay">KBZ Pay</SelectItem>
                    <SelectItem value="myanpay">MyanPay</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crm_manual">CRM Manual</SelectItem>
                    <SelectItem value="phone">Phone Order</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Order Discount (MMK)</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Internal Notes (staff only)</Label>
                <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Customer Notes</Label>
                <Textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={2} className="text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-primary/30">
            <CardHeader><CardTitle className="text-sm">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toLocaleString()} MMK</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{deliveryFee.toLocaleString()} MMK</span></div>
              {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{discount.toLocaleString()} MMK</span></div>}
              <div className="flex justify-between font-bold border-t border-border pt-2"><span>Total</span><span>{total.toLocaleString()} MMK</span></div>

              <Button
                className="w-full mt-3"
                disabled={!canSubmit || createOrderMutation.isPending}
                onClick={() => setShowConfirm(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Create Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order Creation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create order for <span className="font-medium text-foreground">{selectedCustomer?.company_name || selectedCustomer?.name}</span> —{" "}
            <span className="font-bold text-foreground">{total.toLocaleString()} MMK</span>?
          </p>
          <p className="text-xs text-muted-foreground">{items.length} item(s) · {paymentMethod.toUpperCase()} · {source}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={() => { setShowConfirm(false); createOrderMutation.mutate(); }} disabled={createOrderMutation.isPending}>
              Confirm & Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
