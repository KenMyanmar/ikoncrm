

# Add Product Creation & Soft-Delete

## Changes

### 1. `src/pages/ProductList.tsx` — Add "Create Product" button + delete functionality

- Add `Plus, Trash2` icons import
- Add "+ Create Product" button next to "Bulk Price Upload" in header, navigates to `/products/new`
- Add `is_active` to the product query select columns
- Add an "active" filter toggle (default: hide inactive)
- Add a trash icon button per row (with `e.stopPropagation()` to prevent row click)
- Add confirmation dialog (AlertDialog) for deactivation
- Add soft-delete mutation: `.update({ is_active: false })` with toast feedback
- Show inactive products with faded style and "Inactive" badge
- Add "Reactivate" button for inactive products

### 2. `src/pages/ProductEdit.tsx` — Support create mode

- Detect create mode: `const isNew = id === "new"`
- When `isNew`:
  - Skip the product fetch query (`enabled: false`)
  - Initialize form with empty defaults instead of waiting for product data
  - Make `stock_code` and `slug` editable (not disabled)
  - Auto-generate slug from description on blur
  - Change save mutation to use `.insert()` instead of `.update()`
  - After successful insert, navigate to `/products/{newId}`
  - Hide "Save & Next" button in create mode
- Add `generateSlug` helper: lowercase, replace non-alphanumeric with hyphens, append timestamp
- Add "Delete Product" button at bottom of edit page (only in edit mode)
- Delete uses same soft-delete pattern (set `is_active: false`), then navigates back to list

### 3. `src/App.tsx` — Add route for `/products/new`

- Add route `<Route path="products/new" ...>` **before** `products/:id` so it matches first

### Files modified:
- `src/App.tsx` (1 line — add route)
- `src/pages/ProductList.tsx` (add button, delete UI, active filter)
- `src/pages/ProductEdit.tsx` (create mode logic, delete button)

