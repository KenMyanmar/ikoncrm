# Manual Order — Effective Price Display

The Manual Order page already exists at `src/pages/CreateOrder.tsx` (route `/orders/create`). It currently pre-fills `Unit Price` with `products.selling_price`, which mismatches the price the RPC actually records when a flash deal or promotion is active (Migration 27).

## Changes

### 1. New hook: `src/hooks/useEffectivePrice.ts`

Exports `getEffectivePrice(productId, categoryId, sellingPrice)` — single function (not a hook), reusable from QuoteDetail later. Implementation matches the spec:

1. Query `flash_deals` for an active row for `product_id` (active, within `start_time`/`end_time`, ordered by soonest end). If found and stock available (`stock_limit IS NULL OR sold_count < stock_limit`), return `{ price: flash_price, source: "flash_deal" }`.
2. Else query `promotions` filtered by active dates and `applies_to` matching `all` / this product / this category, ordered by `priority DESC`. Apply `percentage` or `fixed_amount` against `sellingPrice`. Return `{ price, source: "promotion" }`.
3. Else return `{ price: sellingPrice, source: "catalog" }`.

Single round-trip per call. Called only on add-to-line, never in the search dropdown.

### 2. Update `src/pages/CreateOrder.tsx`

- Extend `OrderItem` with `price_source: "flash_deal" | "promotion" | "catalog"`.
- Extend product search query select to also fetch `category_id` so we can pass it to `getEffectivePrice`.
- Make `addProduct` async: call `getEffectivePrice(product.id, product.category_id, product.selling_price)`, then push the line with `unit_price = result.price` and `price_source = result.source`. Existing duplicate handling (`+1 qty`) stays untouched and keeps the original price snapshot.
- In `updateItemPrice`, when staff edits the input, set `unit_price_override` (already exists) — derived badge becomes "Manual override".
- Render a small badge to the right of the Unit Price input:
  - `unit_price_override != null` → muted badge "✎ Manual override"
  - `price_source === "flash_deal"` → destructive badge "⚡ Flash deal"
  - `price_source === "promotion"` → secondary/accent badge "Promotion"
  - `catalog` → no badge
- Wrap the Unit Price cell in a flex column so the badge sits under the input on narrow widths.

No change to `createOrderMutation` — it already passes `unit_price_override` through to the RPC, and the RPC re-applies the discount server-side, keeping recorded price consistent with what's displayed.

## Out of scope

- No DB / migration changes.
- No change to `create_manual_order` RPC.
- No change to product search dropdown queries (avoids N+1).
- No live re-fetch if the deal expires while composing — snapshot at add-time.
- No countdown timer.

## Files

- New: `src/hooks/useEffectivePrice.ts`
- Edit: `src/pages/CreateOrder.tsx`
