

# Delivery Management — Admin/Super Admin Overview

## What Changes

**Single file**: `src/pages/MyDeliveries.tsx`

### 1. Role detection
- Get `staff.role` from `useStaff()` (already imported)
- `const isAdmin = staff?.role === 'super_admin' || staff?.role === 'admin'`

### 2. Conditional query (lines 40-52)
- **Admin**: Remove `.eq("driver_id", staff!.id)`, add join for driver info: `staff_profiles!driver_id(id, full_name, email)`
- **Driver**: Keep existing query unchanged

### 3. Driver filter state + dropdown (admin only)
- Add `const [driverFilter, setDriverFilter] = useState("all")`
- Fetch drivers list: query `staff_profiles` where `role = 'delivery'`
- Render a `Select` dropdown above tabs when `isAdmin`, filtering cards client-side

### 4. Header (line 230-231)
- Title: `isAdmin ? "All Deliveries" : "My Deliveries"`

### 5. Stats bar (lines 69-77)
- No logic change needed — stats already count from `assignments` array, which will now contain all assignments for admin

### 6. Delivery cards (lines 251-336)
- When `isAdmin`: show driver name badge (`a.staff_profiles?.full_name`) and "View Order" / "Reassign" buttons instead of Start/Arrived/Complete
- When driver: keep existing card layout unchanged
- Add assignment status colored badge (already exists on line 274)

### 7. Admin action buttons
- "View Order" → `navigate(/orders/${order.id})`
- "Reassign" → open `DeliveryAssignDialog` with the order
- Hide Start/Arrived/Complete buttons for admin

### 8. Apply driverFilter
- In `filtered` useMemo, if `isAdmin && driverFilter !== "all"`, additionally filter by `a.driver_id === driverFilter`

### No database changes needed

