

# Order Management System (OMS) Upgrade

## Overview
Major rewrite of OrderList and OrderDetail pages into a full OMS with payment verification, status pipeline, packing slips, delivery assignment, and audit trail. This is a large feature split into manageable files.

## Scope and Approach

Given the size, I'll split the OMS into focused components to keep files maintainable:

### Files to Create

**`src/components/orders/PaymentVerificationDialog.tsx`**
- Shows payment proof image (from `payment_proof_url`), order details, payment method/reference
- "Approve" button: updates status to `paid`, payment_status to `verified`, sets `payment_verified_by`/`payment_verified_at`, inserts `order_status_history`, logs activity
- "Reject" button: opens sub-form with preset reason dropdown + textarea, updates status to `payment_rejected`, saves `payment_rejection_reason`, inserts history, logs activity

**`src/components/orders/DeliveryAssignDialog.tsx`**
- Driver dropdown (staff_profiles where role=delivery, is_active=true)
- Delivery notes textarea
- On submit: inserts `delivery_assignments`, updates order status to `out_for_delivery` + `shipped_at = now()`, inserts history, logs activity

**`src/components/orders/PackingSlipWindow.tsx`**
- Print-optimized component opened in new window
- Shows: IKON logo, order#, date, customer info, delivery address, items table (qty/SKU/name), total items, payment method (COD shows amount to collect), customer notes
- Uses `@media print` CSS

**`src/components/orders/OrderStatusTimeline.tsx`**
- Reads from `order_status_history` table for the order
- Visual vertical timeline: status change, who, when, reason

### Files to Rewrite

**`src/pages/OrderList.tsx`** — Major rewrite:
- **Stats row**: 5 cards (Total, Pending Payment, Ready to Pack, Out for Delivery, Delivered Today) with color-coded badges
- **Filter tabs**: All | Payment Queue | Ready to Pack | In Delivery | Completed | Cancelled — each maps to specific status arrays
- **Enhanced table**: Order#, Customer, Items count, Total (MMK), Payment Method badge, Payment Status badge, Order Status badge (new color map for all statuses including `confirmed_cod`, `awaiting_payment_proof`, `payment_under_review`, `paid`, `packed`, `out_for_delivery`, `payment_rejected`), relative date, row action buttons
- **Row actions**: Context-dependent per status (Approve/Reject for `payment_under_review`, Mark Packed for `paid`/`confirmed_cod`, Assign Delivery for `packed`, Mark Delivered for `out_for_delivery`)
- Search + status count queries

**`src/pages/OrderDetail.tsx`** — Major rewrite:
- Replace generic status pipeline with proper action buttons based on current status
- Add 4-section layout: Items (with thumbnails), Customer & Delivery (address, zone, notes), Payment Info (method, proof image, verified by, rejection reason), Status Timeline
- Add action buttons matching row actions from list
- Keep existing internal notes and delivery assignment card (enhanced)

### Files to Modify

**`src/components/AdminSidebar.tsx`**
- Add a badge count on the Orders sidebar item showing `payment_under_review` count (query on mount)

### Database

No schema changes needed — all required columns already exist in `orders` table (`payment_proof_url`, `payment_verified_by`, `payment_verified_at`, `payment_rejection_reason`, `payment_status`, `payment_method`, `delivery_zone`, `contact_name`, `contact_phone`, `customer_notes`), `order_status_history` table exists, `delivery_assignments` table exists, `customer_addresses` table exists.

### Status Color Map (used in both OrderList and OrderDetail)
```
confirmed_cod → blue
awaiting_payment_proof → red (animate-pulse)
payment_under_review → amber
paid → green
packed → indigo
out_for_delivery → blue
delivered → green
cancelled → gray
payment_rejected → red
expired → gray
```

### Activity Logging
All status transitions call `logActivity()` with descriptive actions: `order_approved_payment`, `order_rejected_payment`, `order_packed`, `order_assigned_delivery`, `order_delivered`, `order_cancelled`.

