

# Plan: Update CRM to 5-Role Hierarchy + My Deliveries Page

## Files to Modify

### 1. `src/contexts/StaffContext.tsx`
- Replace `ROLE_PERMISSIONS` (string-array based) with the new object-based permissions map using the 5 roles: `super_admin`, `admin`, `manager`, `staff`, `delivery`
- Update `hasPermission(role, module)` to map module names to permission keys (e.g., `"products"` → `canManageProducts`, `"staff"` → `canManageStaff`)
- Add a new module mapping for `"delivery"` → `canManageDelivery`

### 2. `src/components/AdminSidebar.tsx`
- Add a "My Deliveries" nav item under a new "Delivery" group (icon: `Truck`, url: `/my-deliveries`, module: `delivery`)
- Update the filter logic: instead of hardcoding `super_admin` checks for staff/settings, use `hasPermission(role, "staff")` and `hasPermission(role, "settings")` (settings maps to `canManageStaff` since only super_admin/admin have it)
- Dashboard remains visible to all roles

### 3. `src/pages/StaffManagement.tsx`
- Change `ROLES` array to `["super_admin", "admin", "manager", "staff", "delivery"]`

### 4. `src/pages/MyDeliveries.tsx` (new file)
- Query `delivery_assignments` table joined with `orders` for the logged-in staff member's `id` as `driver_id`
- Display table: Order #, Status badge, Pickup/Delivered times, Actions
- Status update buttons (assigned → picked_up → in_transit → delivered / failed / returned)
- Proof-of-delivery photo upload to `product-images` bucket (or a dedicated path)
- Update `delivery_assignments` row with new status, `delivered_at`, `proof_image_url`

### 5. `src/pages/OrderDetail.tsx`
- Add an "Assign Delivery" card in the right column (visible to manager+ roles: super_admin, admin, manager)
- Dropdown to select a delivery staff member (query `staff_profiles` where `role = 'delivery'` and `is_active = true`)
- On assign: insert into `delivery_assignments` table with `order_id` and `driver_id`
- Show current assignment if one exists

### 6. `src/App.tsx`
- Add route: `<Route path="my-deliveries" element={<ProtectedRoute module="delivery"><MyDeliveries /></ProtectedRoute>} />`
- Add import for `MyDeliveries`

### 7. `src/components/ProtectedRoute.tsx`
- No structural changes needed; `hasPermission` will handle the new permission keys automatically

## Module-to-Permission Mapping
```text
module string    → permission key
"dashboard"      → always true (all roles)
"products"       → canManageProducts
"categories"     → canManageCategories
"brands"         → canManageBrands
"orders"         → canManageOrders
"quotes"         → canManageQuotes
"customers"      → canManageCustomers
"banners"        → canManageBanners
"staff"          → canManageStaff
"reports"        → canViewReports
"activity"       → canViewActivityLog
"settings"       → canManageStaff
"delivery"       → canManageDelivery
```

