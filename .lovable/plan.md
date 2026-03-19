

# Remove Product Groups, Use Category Hierarchy

## Summary
Remove all `product_groups` references from the CRM frontend. Categories already have a clean 2-level hierarchy (depth 0 = main, depth 1 = sub). Three files need changes.

## Changes

### 1. `src/pages/CategoryList.tsx`

- **Remove** `ProductGroup` interface, `groups` query (lines 63-69)
- **Remove** `group_id` from `Category` interface and query select
- **Rewrite `tree` useMemo**: Simply group depth=1 children under depth=0 parents. No product_groups grouping. Structure becomes `{ parent: Category, children: Category[] }[]`
- **Main category product count**: Show sum of children's `product_count` instead of own `product_count`
- **Remove Group dropdown** from edit dialog (lines 369-378)
- **Remove `group_id`** from save payload (line 132) and `openEdit` defaults (lines 204, 206)
- **Update tree rendering**: Remove the product_groups group header row. Main categories become the top-level expandable rows directly

### 2. `src/pages/ProductEdit.tsx`

- **Remove** `groups` query (lines 104-110)
- **Remove** `group_id` from `emptyForm` (line 38) and save payload (line 141)
- **Remove** Group dropdown UI (lines 559-569)
- Category dropdown already shows hierarchy — verify it only allows selecting depth=1 subcategories (already implemented per previous work)

### 3. `src/pages/ProductList.tsx`

- Check if there are any `group_id` or `product_groups` references — based on search results, there are none in this file. No changes needed.

## Files modified
- `src/pages/CategoryList.tsx`
- `src/pages/ProductEdit.tsx`

