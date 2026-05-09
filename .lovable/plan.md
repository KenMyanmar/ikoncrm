## Goal

Enrich the CRM Quote Detail page so each requested item displays SKU, image, brand, and current reference price by joining `items[].product_id` to the `products` table at display time. No DB or JSONB shape changes.

## Files

- **New:** `src/hooks/useQuoteItemDetails.ts` — batch-fetch products + brands for an item list, return lookup Maps.
- **Modify:** `src/pages/QuoteDetail.tsx` — rewrite the "Requested Items" section as a real table with enriched columns, and enhance each Response Builder row with the same product context.

## Part A — `useQuoteItemDetails` hook

Per the spec:
- Dedupe `product_id`s via `Set`, run a single `products.select(id, stock_code, description, selling_price, currency, thumbnail_url, brand_id, is_active).in('id', ids)` query.
- From returned products, dedupe `brand_id`s and run a single `brands.select(id, name).in('id', ids)` query.
- React Query keys use sorted id list so identical id sets share cache across quotes; `staleTime` 60s for products, 5min for brands.
- Return `{ productMap, brandMap, isLoading, isError }`.

## Part B — Requested Items table (desktop)

Replace the current bordered-card list with a `<Table>` having columns:

`Image | SKU | Name | Brand | Requested Qty | Current Unit Price | Customer Notes`

- Image cell: 40×40 thumbnail in `rounded bg-muted`; fallback `Package` lucide icon when null/missing product.
- Name cell: shows `item.name`. If `product_id` set but no product row found → italic muted "Product no longer in catalog". If product exists and `is_active === false` → small `Badge` "Inactive in catalog".
- Brand: from `brandMap`, else "—".
- Current Unit Price: `MMK {selling_price.toLocaleString()}` or "—". Header tooltip/helper text clarifies "Reference only — not the quoted price".
- Notes: `item.notes?.trim() || "—"`.

### Mobile (< md)

Render as stacked cards: thumbnail + name on top row, then SKU · Brand line, qty + reference price line, notes line. Hide the table at `md:` and below.

## Part C — Response Builder enrichment

For each row in `responseItems` (which is keyed by index against `quote.items`), look up the same product:
- Header strip above the existing inputs:
  ```
  [thumb 32px] BATH TOWEL (DARK BLUE)
                SKU 118ABL020001 · Brand X · Reference: [MMK 44,280]
  ```
- "Reference: MMK 44,280" rendered as a `<button type="button" variant="link" size="sm">` that on click sets `quoted_price` for that row to `selling_price`. Tooltip: "Click to copy reference price into Quoted Price".
- No auto-fill on load. Existing draft values are preserved as today.
- If no product / no `selling_price`, omit the reference button (show plain "Reference: —").

Hook is called once at page level: `const { productMap, brandMap } = useQuoteItemDetails(quote?.items as any[] | undefined);` — both the items table and the response builder consume the same maps (no duplicate fetch).

## Edge cases (all handled, no crashes)

| Case | Behavior |
|------|----------|
| `product_id` null | Name + qty only; SKU/Brand/Image/Price = "—" or placeholder icon |
| Product hard-deleted | Cached `items[].name` + italic "Product no longer in catalog" |
| Product soft-deleted | Renders normally + "Inactive in catalog" badge |
| Duplicate product_ids across rows | Both rows render; one DB fetch (Set dedupe) |
| Empty/null items | Existing "No items requested" empty state preserved |
| `selling_price` null | "—" in price column; reference button hidden in builder |
| `thumbnail_url` null | Package icon in `bg-muted` square |
| Brand deleted | Brand column "—" |

## Out of scope (explicitly not touched)

- `items` JSONB schema / E-Mall write path
- DB migrations
- `create_manual_order` convert flow
- Auto-population of `response_items[i].unit_price` (click-to-copy only)
- `QuoteList.tsx`

## Acceptance verification

After implementation, mentally walk the BATH TOWEL example: row should show thumbnail, `118ABL020001`, "BATH TOWEL (DARK BLUE)", brand name, qty 1, `MMK 44,280`, "—" notes. Network tab should show exactly one `products?id=in.(...)` and one `brands?id=in.(...)` request per page load.
