

# Enhance Delivery Tracking Card — Proof Photo, COD Status, Driver Notes

## Current State
The `DeliveryTrackingCard` already displays:
- Driver info, status badge, recipient name
- A small 20×20px proof thumbnail (from `proof_image_url || delivery_proof_url`)
- Timeline with tracking log entries
- Failed reason

## What's Missing
1. **Proof photo is too small** (80×80px) — needs to be larger with a label
2. **COD collection status** — not shown. No `cod_collected` column exists; instead, `orders.payment_status = 'collected'` indicates COD was collected. The component needs the order's payment info passed in.
3. **Driver notes** — column exists in `delivery_assignments` but not displayed

## Changes

### File: `src/components/orders/DeliveryTrackingCard.tsx`

1. **Accept optional order prop** for payment info: add `order?: { payment_method?: string; payment_status?: string; total?: number; currency?: string }` to props

2. **Enlarge proof photo section** — replace the small 80×80 thumbnail with a labeled "Delivery Proof" section showing a larger image (max-w-xs) that opens in the lightbox on click

3. **Add COD collected badge** — after recipient name, if `order?.payment_method === 'cod' && order?.payment_status === 'collected'`, show a green badge: "✅ Cash Collected: {total} {currency}"

4. **Add driver notes** — after COD badge, if `assignment.driver_notes` exists, display it with a "Driver Notes:" label

### File: `src/pages/OrderDetail.tsx`

5. **Pass order data** to `DeliveryTrackingCard`: change `<DeliveryTrackingCard orderId={id!} />` to `<DeliveryTrackingCard orderId={id!} order={order} />`

### No database changes needed
All fields already exist: `delivery_proof_url`, `proof_image_url`, `driver_notes`, `recipient_name` on `delivery_assignments`; `payment_status`, `payment_method` on `orders`.

