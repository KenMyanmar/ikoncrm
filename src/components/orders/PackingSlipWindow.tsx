import { useEffect, useRef } from "react";
import { BRAND } from "@/config/brand";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PackingSlipWindowProps {
  orderId: string;
  onClose: () => void;
}

export function PackingSlipWindow({ orderId, onClose }: PackingSlipWindowProps) {
  const printRef = useRef(false);

  const { data: order } = useQuery({
    queryKey: ["packing-slip-order", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("*, customers(name, company_name, phone, email), customer_addresses!orders_delivery_address_id_fkey(address_line, township, city, region, contact_phone, delivery_notes)")
        .eq("id", orderId).single();
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["packing-slip-items", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      return data || [];
    },
  });

  useEffect(() => {
    if (order && items && !printRef.current) {
      printRef.current = true;
      setTimeout(() => window.print(), 500);
    }
  }, [order, items]);

  if (!order || !items) return <div className="p-8 text-center">Loading packing slip…</div>;

  const address = (order as any).customer_addresses;
  const totalItems = items.reduce((sum: number, i: any) => sum + i.quantity, 0);

  return (
    <div className="packing-slip p-8 max-w-[800px] mx-auto font-sans text-sm">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .packing-slip, .packing-slip * { visibility: visible; }
          .packing-slip { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex gap-2">
        <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Print</button>
        <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Close</button>
      </div>

      <div className="flex justify-between items-start border-b pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold">{BRAND.name}</h1>
          <p className="text-xs text-gray-500">Industrial & Commercial Supplies</p>
          <p className="text-xs text-gray-500">Yangon, Myanmar</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold">PACKING SLIP</h2>
          <p className="font-mono text-xs">{order.order_number}</p>
          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-semibold text-xs uppercase text-gray-500 mb-1">Customer</h3>
          <p className="font-medium">{(order as any).customers?.company_name || (order as any).customers?.name || "—"}</p>
          <p className="text-xs">{order.contact_name}</p>
          <p className="text-xs">{order.contact_phone || (order as any).customers?.phone}</p>
        </div>
        <div>
          <h3 className="font-semibold text-xs uppercase text-gray-500 mb-1">Delivery Address</h3>
          {address ? (
            <>
              <p className="text-xs">{address.address_line}</p>
              <p className="text-xs">{[address.township, address.city, address.region].filter(Boolean).join(", ")}</p>
              {address.contact_phone && <p className="text-xs">Tel: {address.contact_phone}</p>}
            </>
          ) : (
            <p className="text-xs text-gray-400">No address on file</p>
          )}
        </div>
      </div>

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-left py-2 text-xs font-semibold">Qty</th>
            <th className="text-left py-2 text-xs font-semibold">SKU</th>
            <th className="text-left py-2 text-xs font-semibold">Product</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-1.5 text-xs font-medium">{item.quantity}</td>
              <td className="py-1.5 text-xs font-mono">{item.sku || "—"}</td>
              <td className="py-1.5 text-xs">{item.product_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between border-t-2 border-gray-800 pt-2 mb-4">
        <span className="font-semibold text-xs">Total Items: {totalItems}</span>
        <span className="font-semibold text-xs">
          {order.payment_method === "cod" ? `COD — Collect: ${Number(order.total || 0).toLocaleString()} MMK` : "PREPAID"}
        </span>
      </div>

      {order.customer_notes && (
        <div className="border rounded p-3 bg-gray-50 mb-4">
          <h3 className="font-semibold text-xs uppercase text-gray-500 mb-1">Customer Notes</h3>
          <p className="text-xs">{order.customer_notes}</p>
        </div>
      )}

      {address?.delivery_notes && (
        <div className="border rounded p-3 bg-gray-50">
          <h3 className="font-semibold text-xs uppercase text-gray-500 mb-1">Delivery Notes</h3>
          <p className="text-xs">{address.delivery_notes}</p>
        </div>
      )}
    </div>
  );
}
