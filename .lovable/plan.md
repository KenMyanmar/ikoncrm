

# Care Tips Management Page

## Summary
Create a new Care Tips management page and wire it into the sidebar and router. Single-page design with category selector + tip cards + add/edit dialog.

## Files to Create

### 1. `src/pages/CareTips.tsx` (NEW)
- Category selector dropdown at top (depth=0, is_active=true categories)
- Tips list for selected category, ordered by `sort_order`
- Each tip card: title, tip_text, icon badge, sort_order, active Switch toggle, Edit/Delete buttons
- "Add New Tip" button opens a Dialog with fields: title, tip_text, icon (Select from check/alert-triangle/info/star/shield), sort_order
- Edit opens same dialog pre-filled
- Delete with AlertDialog confirmation
- Title batch-update: when title changes, update all tips in that category
- Empty state when no tips exist
- Uses `useQuery` + `useMutation` with `@tanstack/react-query`

## Files to Modify

### 2. `src/App.tsx`
- Import `CareTips` page
- Add route: `<Route path="care-tips" element={<ProtectedRoute module="categories"><CareTips /></ProtectedRoute>} />`
- Uses `categories` module permission (staff+ can access)

### 3. `src/components/AdminSidebar.tsx`
- Add `{ title: "Care Tips", url: "/care-tips", icon: Heart, module: "categories" }` to the Catalog group items (after Brands)
- Import `Heart` from lucide-react

## No database changes needed
The `category_care_tips` table and RLS policies already exist.

