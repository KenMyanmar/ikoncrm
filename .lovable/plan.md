

# Add Target Selector to Promotion Form

## Problem
The promotion form's "Applies To" dropdown works, but there's no way to select specific products/categories/brands. The `target_ids` UUID[] column never gets populated.

## Changes — Single file: `src/pages/Promotions.tsx`

### 1. Add `target_ids` to form state
- Add `target_ids: string[]` to `emptyForm` (default `[]`)
- Add `targetSearch` state for the search input
- Add `selectedTargets` state with label+id pairs for display chips

### 2. Add target selector UI below "Applies To" dropdown (after line 328)
- Only visible when `form.applies_to !== "all"`
- A search input + dropdown results list + selected chips pattern:
  - **Product**: query `products` by `description.ilike` or `stock_code.ilike`, show `stock_code — description (price)`
  - **Category**: query `categories` by `name.ilike`, show category name
  - **Brand**: query `brands` by `name.ilike`, show brand name
- Use debounced search with `useQuery` keyed on `[targetSearch, form.applies_to]`
- Selected items render as Badge chips with ✕ remove button
- Clicking a result adds its UUID to `form.target_ids` and its label to display state

### 3. Include `target_ids` in save payload (line 97-109)
Add to payload: `target_ids: form.applies_to === 'all' ? [] : form.target_ids`

### 4. Load existing selections on edit (in `openEdit` function)
- Set `form.target_ids` from `p.target_ids || []`
- Fetch display labels for those IDs based on `p.applies_to`:
  - Query the relevant table with `.in('id', target_ids)` to get names
  - Populate `selectedTargets` state for chip display

### 5. Clear targets when "Applies To" changes
When `applies_to` changes, reset `form.target_ids` to `[]` and clear `selectedTargets`

### No database changes needed
The `promotions.target_ids` UUID[] column already exists.

