

# Delivery Tracking System

## Overview
Enhance the existing delivery workflow with: (1) improved assign dialog with priority/date/notifications, (2) mobile-first driver dashboard replacing the current table view, (3) delivery tracking card in OrderDetail, (4) dedicated storage bucket, (5) failed delivery flow.

## Database

**Migration: Create `delivery-proofs` storage bucket + RLS**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true);

CREATE POLICY "Drivers can upload proofs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'delivery-proofs' AND EXISTS (
    SELECT 1 FROM staff_profiles WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Anyone can view proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-proofs');
```

No table schema changes needed -- `delivery_assignments`, `delivery_tracking_log` already exist with all required columns.

## Files to Create

### `src/components/orders/DeliveryTrackingCard.tsx`
For OrderDetail right column. Queries `delivery_assignments` + `delivery_tracking_log` for the order. Shows:
- Driver name, assigned time, current status
- Vertical timeline of tracking events (assigned → picked_up → in_transit → arrived → delivered/failed)
- Photo proof thumbnail (if exists) with lightbox
- Driver call button (tel: link)

## Files to Modify

### `src/components/orders/DeliveryAssignDialog.tsx` — Enhance
Add:
- Expected delivery date picker (defaults to today/tomorrow)
- Priority radio: Normal / Urgent / Same-Day
- After assignment: insert `staff_notifications` for driver (`type: 'order_assigned'`)
- Insert `delivery_tracking_log` entry with status `assigned`

### `src/pages/MyDeliveries.tsx` — Major Rewrite (Mobile-First)
Replace current table view with:
- **Stats bar**: Assigned / In Route / Done counts for today
- **Filter tabs**: Today / Upcoming / Completed
- **Card-based list** (not table): Each card shows order number, address, phone (tel: link), COD amount in red, delivery notes, priority border color
- **Status flow buttons**: Start Delivery → I've Arrived → Complete Delivery
- **Completion dialog**: Recipient name, photo upload (to `delivery-proofs` bucket), driver notes, COD checkbox, confirm button
- **Failed delivery dialog**: Reason dropdown, details textarea, photo evidence upload
- On complete: update `delivery_assignments`, `orders.status` → delivered, `orders.delivered_at`, COD → `payment_status: 'collected'`, insert tracking log + status history, activity log
- Large touch targets (min h-12 buttons), mobile-optimized layout

### `src/pages/OrderDetail.tsx`
- Import and render `DeliveryTrackingCard` in right column when order has delivery assignment
- Query `delivery_assignments` for the order

### `src/pages/OrderList.tsx`
- No changes needed (delivery status already visible in kanban "Delivery" column)

## Key Technical Decisions
- Photo uploads go to new `delivery-proofs` bucket (not `product-images` as currently)
- `delivery_tracking_log` entries created at each status transition for full audit trail
- Mobile-first: cards with large buttons, `tel:` links for phone numbers
- COD collection prominently displayed and tracked via `payment_status` update
- Failed deliveries stay as `out_for_delivery` on the order, `failed` on the assignment -- allows re-assignment

