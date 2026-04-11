

# CRM Quote Management — Final Plan

## Summary
Full rewrite of `QuoteList.tsx` and `QuoteDetail.tsx`. No database changes needed.

## Verified Items
- **Status value**: Use `'responded'` (no CHECK constraint exists, but matches project convention)
- **Internal notes column**: `admin_internal_notes` (confirmed in DB)
- **`create_manual_order` RPC**: Exists, accepts `p_items` as `jsonb` array of `{product_id, quantity, unit_price_override}`

---

## File 1: `src/pages/QuoteList.tsx` (full rewrite)

### Header
- Title "Quote Management", subtitle "View and respond to customer quote requests"
- "New Quote" button opens dialog (manual creation: company_name, contact_person, contact_email, contact_phone, project_type, items jsonb, source='manual')

### Filters
- Debounced search: quote_number OR company_name (ilike)
- Status chip group: All / Pending / Responded / Accepted / Expired / Converted — with per-status counts from separate count query
- Badge colors: gray/blue/green/red/purple

### Table
- Columns: Quote #, Customer (company_name), Date, # Items (items array length), Status Badge, Total Quoted (MMK format), Valid Until (red text if past today), Assigned To (staff name), Actions (view icon → navigate)
- Click row → `/quotes/{id}`
- Sort by created_at desc, paginated 25/page

---

## File 2: `src/pages/QuoteDetail.tsx` (full rewrite)

### Header
- Back → `/quotes`, quote_number + status badge
- Quick actions: "Assign to Me", "Save & Send Response", "Save Draft", "Convert to Order" (if accepted)

### Left Column (lg:col-span-2)

#### Customer Info Card
- company_name, contact_person, contact_email (mailto), contact_phone (tel)
- project_type, timeline, budget_range — read-only
- Falls back to joined `customers` data if contact fields null

#### Requested Items Card
- Read-only table from `items` JSONB: product description, quantity, notes

#### Response Builder Card
- For each item, editable row: Product (read-only), Qty Requested (read-only), Quoted Price (number input), Available Qty (number input), Lead Time (Select: "1-3 days" / "1 week" / "2 weeks" / "3 weeks" / "4 weeks"), Availability (Select: In Stock / Low Stock / Out of Stock / Back Order), Notes (text input)
- Pre-populated from `response_items` JSONB if it exists
- Auto-calculated total = sum(quoted_price * available_qty)

#### Valid Until date picker (default: today + 14 days)

#### Internal Notes textarea → saves to `admin_internal_notes`

#### Actions
- "Save & Send Response" → updates response_items, total_quoted, valid_until, status='responded', toast
- "Save Draft" → saves response_items without changing status
- Both with `isSubmitting` guard

### Right Column (lg:col-span-1)

#### Quote Metadata Card
- Quote #, created_at, status badge, source
- Assigned To with Select to reassign (fetches staff_profiles)
- Valid Until with color indicator

#### Convert to Order
- Visible only when status = 'accepted'
- Button calls `create_manual_order` RPC:
  - Maps response_items to `[{product_id, quantity, unit_price_override}]`
  - Sets `p_source='quote'`, `p_created_by=staff.id`, `p_customer_id=quote.customer_id`
- On success: updates quote `converted_order_id` and `status='converted'`
- Shows link to order if already converted

#### Additional Notes display (from `additional_notes` field)

---

## Files Modified
- `src/pages/QuoteList.tsx` — full rewrite
- `src/pages/QuoteDetail.tsx` — full rewrite

## No other files changed
Routes (`/quotes`, `/quotes/:id`) and sidebar entry already exist.

## No database changes needed
All columns, RLS policies, triggers, and the `create_manual_order` RPC are in place.

