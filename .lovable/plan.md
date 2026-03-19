

# Category Delete Confirmation + Soft Delete

## Problem
Categories are deleted instantly with no confirmation dialog, using a hard `.delete()` call. A user accidentally deleted "Linen".

## Changes — `src/pages/CategoryList.tsx`

### 1. Add imports
- Import `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` from alert-dialog
- Import `RotateCcw` icon

### 2. Add state
- `deleteTarget: { id: string; name: string } | null` — controls confirmation dialog
- `showInactive: boolean` (default `false`) — filter toggle

### 3. Replace hard delete with soft delete
Replace `deleteMutation` (lines 146-162):
- Check for assigned products via `.select('id', { count: 'exact', head: true }).eq('category_id', id)` — block if > 0
- Check for active subcategories via `.eq('parent_id', id)` — block if > 0
- Soft delete: `.update({ is_active: false }).eq('id', id)`
- Add `reactivateMutation`: `.update({ is_active: true }).eq('id', id)`

### 4. Add confirmation dialog
- AlertDialog controlled by `deleteTarget` state
- Shows category name, explains deactivation is reversible
- Destructive-styled "Deactivate" button triggers mutation

### 5. Update delete button clicks
- Lines 240, 265: Change `onClick={() => deleteMutation.mutate(cat)}` to `onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}`

### 6. Filter inactive categories
- Add "Show inactive" toggle next to the header
- Filter tree to exclude `is_active === false` categories unless toggle is on
- Show inactive categories with `opacity-50` and "Inactive" badge
- Show "Reactivate" button (RotateCcw icon) instead of trash for inactive categories

### 7. ProductList.tsx — already has confirmation
Verified: ProductList.tsx already uses AlertDialog + soft delete pattern. No changes needed.

**Files modified:** `src/pages/CategoryList.tsx` only

