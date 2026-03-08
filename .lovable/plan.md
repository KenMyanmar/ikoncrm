

# Fix: Flash Deal Product Selection Gets "Stuck"

## Problem
When selecting a product for a flash deal, the product search list stays open after selection. Clicking products keeps overwriting the title field with no visual confirmation. The UI feels unresponsive/stuck.

## Root Cause
The `selectProduct` function updates form state but never:
1. Collapses/hides the product list
2. Clears the search input
3. Provides visual feedback that selection is complete

## Solution
Update `selectProduct` in `FlashDeals.tsx` to:
1. **Clear `productSearch`** after selection — this collapses the dropdown since the list only shows when there are results
2. **Add a "selected product" display** — show a confirmation card with the product name/image replacing the search list
3. **Add a "Change product" button** to re-open search if needed

### Changes to `src/pages/FlashDeals.tsx`:

**In `selectProduct` function** — add `setProductSearch("")` to clear search after selection.

**In the dialog's product search section** — restructure to show either:
- The search input + results list (when no product selected, or user clicks "Change")
- A selected product confirmation card (when product is chosen) showing thumbnail, name, price, with a "Change" button

This gives clear visual feedback that a product was selected and stops the "stuck" feeling.

