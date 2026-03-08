

# Update Product Edit Page — Add All Missing Fields

## Overview
Rewrite `src/pages/ProductEdit.tsx` to expose all editable product columns, organized into clear card sections with dropdowns for brands/categories/groups, a JSONB key-value editor for specifications, and a tag input.

## Changes — `src/pages/ProductEdit.tsx`

### 1. Add dropdown data queries
Fetch `brands`, `categories`, and `product_groups` using `useQuery` for Select dropdowns.

### 2. Add specifications state
Maintain a `specs` array of `{key, value}` pairs, initialized from `product.specifications`. Convert back to JSONB object on save.

### 3. Add tags state
Maintain a `tagInput` string state. Display tags as badges with remove buttons. Enter/comma adds a new tag.

### 4. Expand the save mutation
Include all new editable fields in the update payload:
- `other_code`, `brand_id`, `category_id`, `group_id`, `unit_of_measure`, `packing`, `item_type`, `main_vendor`, `moq`, `unit_cost`, `currency`, `stock_status`, `onhand_qty`, `min_qty`, `max_qty`, `reorder_qty`, `specifications` (from specs state), `datasheet_url`, `tags`, `thumbnail_url`

### 5. Reorganize form into 8 card sections

**Left column (col-span-2):**
- **Images card** — existing ImageUpload (keep as-is)
- **Toggles card** — is_active, is_featured switches
- **Tags card** — tag input with badge display

**Right column (col-span-3):**
- **Basic Info** — stock_code (disabled), slug (disabled), other_code (editable), description, short_description, long_description
- **Product Details** — brand_id (Select dropdown), category_id (Select dropdown), group_id (Select dropdown), unit_of_measure, packing, item_type, moq, main_vendor
- **Pricing** — selling_price, currency (Select: MMK/USD/EUR), unit_cost
- **Specifications** — dynamic key-value editor with Add/Remove rows
- **Stock & Inventory** — stock_status (Select: in_stock/low_stock/out_of_stock/pre_order), onhand_qty, min_qty, max_qty, reorder_qty
- **Additional** — datasheet_url text input

### 6. Imports
Add: `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from ui/select, `Plus, Trash2, X` from lucide-react.

### File summary
| File | Action |
|------|--------|
| `src/pages/ProductEdit.tsx` | **Rewrite** — full form with all sections |

No database changes needed — all columns already exist.

