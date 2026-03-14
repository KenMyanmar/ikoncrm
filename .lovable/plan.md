

# CRM Admin: Review Moderation Page

## Overview
Create a new Reviews moderation page and wire it into the sidebar, routes, and permissions system.

## Files to Create

### `src/pages/ReviewList.tsx` (New)
Full review moderation page with:
- **Stats row**: Total / Pending (amber) / Approved (green) / Rejected (red) counts
- **Filters**: Status tabs (All/Pending/Approved/Rejected), search input, sort dropdown
- **Table**: Product (thumb+code+desc), Reviewer (name+company), Rating (stars), Comment (truncated), Status badge, Date (relative), Actions
- **Row actions**: Approve (instant, green CheckCircle), Reject (instant, red XCircle), Reply (blue MessageSquare opens dialog)
- **Verified Purchase**: Toggle checkbox per row, updates `is_verified_purchase`
- **Reply dialog**: Shows review details + textarea for `admin_response`, saves with `responded_by` and `responded_at`
- **Activity logging**: Log approve/reject/reply actions via `logActivity()`
- Query uses Supabase relational select on `products` and `customers`

## Files to Modify

### `src/contexts/StaffContext.tsx`
- Add `canManageReviews: boolean` to `RolePermissions`
- Set `true` for super_admin, admin, manager, staff; `false` for delivery
- Add `reviews: "canManageReviews"` to `MODULE_TO_PERMISSION`

### `src/components/AdminSidebar.tsx`
- Import `MessageSquare` from lucide-react
- Add `{ title: "Reviews", url: "/reviews", icon: MessageSquare, module: "reviews" }` to the Sales group (after Customers)

### `src/App.tsx`
- Import `ReviewList` from `@/pages/ReviewList`
- Add route: `<Route path="reviews" element={<ProtectedRoute module="reviews"><ReviewList /></ProtectedRoute>} />`

## UI Patterns
- Same table/card/badge styling as ProductList and OrderList
- Tabs component for status filtering
- Toast notifications for actions
- Dialog for reply

