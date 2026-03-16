

# Fix: Delivery Assignment Gap + MyDeliveries Refinements

## Investigation Results

**MyDeliveries.tsx** already has the mobile-first card layout with stats bar, tabs, completion dialog, and failed dialog. The "old table view" the user saw was likely confusion from an empty state (no delivery_assignments exist). The core UI is correct but needs refinement to match the exact 3-step flow (Start → Arrived → Complete) described in P5.

**OrderList.tsx** already shows the Truck icon on packed rows in table view (line 217). The kanban board also passes `onAssignDelivery`. This is working.

**DeliveryAssignDialog.tsx** only queries `role = 'delivery'` — if no staff have that role, dropdown is empty with no explanation. No batch mode support.

## Changes

### 1. `src/components/orders/DeliveryAssignDialog.tsx`
- **Widen driver query**: Change from `.eq("role", "delivery")` to `.in("role", ["delivery", "admin", "manager", "super_admin"])` so admins can self-assign for testing
- **Empty state message**: When `drivers` array is empty, show info message: "No delivery drivers found. Add staff with 'delivery' role in Staff Management."
- **Batch mode**: Accept optional `orderIds?: string[]` prop. When provided:
  - Show "Assigning {n} orders" in dialog header instead of single order number
  - On submit, loop through all order IDs creating individual `delivery_assignments` rows, updating each order status, inserting status history for each
  - Single activity log entry: "Batch assigned {n} orders to {driverName}"
- **Interface change**: Props become `{ open, onOpenChange, order?, orderIds? }` — single order mode uses `order`, batch mode uses `orderIds`

### 2. `src/pages/OrderList.tsx`
- **Batch select state**: Add `selectedPackedIds: string[]` state
- **Checkbox column**: In table view, add a checkbox on each row where `status === 'packed'`. Checkbox toggles inclusion in `selectedPackedIds`
- **Batch toolbar**: When `selectedPackedIds.length > 0`, show a sticky bar above the table: "{n} packed orders selected — [Assign to Driver]" button
- **Batch assign button**: Opens `DeliveryAssignDialog` with `orderIds={selectedPackedIds}` instead of single `order`
- **Clear selection** after successful assignment
- **Table header**: Add `<TableHead>` with select-all checkbox for packed orders

### 3. `src/pages/MyDeliveries.tsx` — Refinements (not a full rewrite)
The file already has the correct mobile-first layout. Refinements:
- **Fix 3-step flow**: Currently has `assigned → picked_up → in_transit → complete`. Simplify to match spec: `assigned → in_transit → arrived → complete`
  - "Start Delivery" button: sets status to `in_transit` (not `picked_up`), sets `picked_up_at`
  - "I've Arrived" button: sets status to `arrived`
  - "Complete Delivery" button: opens completion dialog
- **Remove extra "In Transit" button** (line 170) — merge into the flow so Start goes directly to `in_transit`
- **Add "Copy Address" button** on each card (clipboard copy of full address string)
- **Ensure COD amount styling**: Already has red COD banner — verify `text-lg font-bold` on amount

## No Database Changes
All required tables and storage buckets exist.

## Files Modified
- `src/components/orders/DeliveryAssignDialog.tsx` — Widen driver query + empty state + batch mode
- `src/pages/OrderList.tsx` — Add batch select checkboxes + batch assign toolbar
- `src/pages/MyDeliveries.tsx` — Simplify to 3-step flow, add copy address

