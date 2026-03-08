

# Marketing & Promotions Hub — Super App Implementation

## Database Migration (single migration)

### Tables to create:
1. **promotions** — percentage/fixed/BOGO/bundle deals with date ranges, applies_to targeting, usage tracking, banner image
2. **flash_deals** — product-linked urgent deals with computed discount_percentage, stock limits, countdown support
3. **coupons** — unique codes with per-user limits, multiple discount types including free_shipping
4. **coupon_usage** — tracks per-user/per-order redemptions

### RLS Strategy (dual-access):
- **Staff (CRM)**: Full CRUD via `is_staff(auth.uid())` check for ALL operations
- **Public (E-Mall)**: SELECT only on active items within valid date ranges — uses `anon` role
- **coupon_usage**: Users can read their own; staff can manage all

### Important adjustments from user's SQL:
- Replace `CHECK` constraints with validation triggers (Supabase best practice — CHECK must be immutable, conflicts with `now()` in RLS)
- Remove `REFERENCES auth.users(id)` on `created_by` columns (Supabase guideline — no FK to auth.users). Keep as plain `uuid`
- Generated column `discount_percentage` on flash_deals is fine (pure math, no time dependency)
- Public read policies need `TO anon, authenticated` to work for E-Mall anonymous shoppers

## Sidebar Changes

Rename "Content" group → **"Marketing"** in `AdminSidebar.tsx`. Items:
- Banners (Image) — existing
- Promotions (Percent) — `/promotions`
- Flash Deals (Zap) — `/flash-deals`
- Coupons (Ticket) — `/coupons`

## Permissions

Add `canManagePromotions: boolean` to `RolePermissions` in `StaffContext.tsx`:
- `true`: super_admin, admin, manager
- `false`: staff, delivery

Map modules: `promotions`, `flash_deals`, `coupons` → `canManagePromotions`

## New Pages

### Promotions (`src/pages/Promotions.tsx`)
- **Stats row**: 4 cards — Total, Active (green pulse dot), Upcoming (blue), Expired (gray)
- **Filters**: Search by title, filter by type, filter by status
- **Table**: Title, Type badge (color-coded), Discount display, Applies to tag, Date range, Status badge (auto-computed from dates), Usage bar (count/limit)
- **Create/Edit dialog**: Full form with type-dependent fields (BOGO shows buy/get qty fields), category/brand/product multi-select for targeting, date range picker, banner image URL
- **Row actions**: Edit, Toggle active, Delete confirmation
- **Design**: Status auto-calculated — `now < start_date` = Scheduled (blue), between = Active (green), `now > end_date` = Expired (gray)

### Flash Deals (`src/pages/FlashDeals.tsx`)
- **Hero countdown banner**: Shows time remaining until next active deal ends, orange/red gradient background, animated
- **Stats row**: Active deals, Total sold today, Revenue from flash deals
- **Grid view**: Product card with thumbnail, name, original price (strikethrough), flash price (bold red), discount % badge, stock progress bar (orange fill, "45/100 sold"), countdown timer per deal
- **Create dialog**: Product search (queries products table), auto-fills original_price from product's selling_price, enter flash_price, stock_limit, time range, badge text
- **Row actions**: Edit, Duplicate (pre-fills form for re-running), Toggle active, Delete
- **Urgency design**: Orange/red accents, animated countdown digits, progress bars with "SELLING FAST" labels when >70% sold

### Coupons (`src/pages/Coupons.tsx`)
- **Stats row**: Total, Active, Total redemptions (sum of used_count), Most popular (highest used_count)
- **Table**: Code (monospace `font-mono`, click-to-copy with toast), Title, Type badge, Discount, Min order, Usage progress (used/max), Per-user limit, Date range, Status
- **Create/Edit dialog**: Auto-generate button (random 8-char uppercase alphanumeric), custom code input, title, type selector, all fields
- **Bulk generate**: Input count N, prefix, generates N unique codes with same settings in one batch insert
- **Copy button**: Each row has clipboard icon, copies code with "Copied!" toast
- **Design**: Coupon codes feel like physical coupons — dotted border accent, monospace font

## Routes (`App.tsx`)

Add inside the admin layout:
```
/promotions → ProtectedRoute module="promotions"
/flash-deals → ProtectedRoute module="flash_deals"
/coupons → ProtectedRoute module="coupons"
```

## Files Summary

| File | Action |
|---|---|
| Database migration | Create 4 tables + RLS + validation triggers |
| `src/contexts/StaffContext.tsx` | Add `canManagePromotions` permission + module mappings |
| `src/components/AdminSidebar.tsx` | Rename Content → Marketing, add 3 nav items |
| `src/App.tsx` | Add 3 protected routes |
| `src/pages/Promotions.tsx` | Create — stats, table, CRUD dialog |
| `src/pages/FlashDeals.tsx` | Create — countdown, grid, stock bars, CRUD |
| `src/pages/Coupons.tsx` | Create — monospace codes, copy, bulk generate, CRUD |

