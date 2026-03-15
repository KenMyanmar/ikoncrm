

# Staff Actions: Manual Orders, Edit Orders, Notes & Notifications

## Overview
This is a large feature set. I'll implement it in focused chunks: (1) Create Manual Order page, (2) Order editing in OrderDetail, (3) Internal notes with @mentions, (4) Notification bell in sidebar.

## Database

The required tables (`order_notes`, `order_edits`) already exist. I need to create:

**Migration: `staff_notifications` table**
```sql
CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'mention',
  title text NOT NULL,
  body text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff see own notifications" ON public.staff_notifications
  FOR ALL USING (staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid()));
```

## Files to Create

### 1. `src/pages/CreateOrder.tsx` — Manual Order Page
Two-column layout (left: customer + products, right: summary + delivery + notes):

**A. Customer Selection**: Debounced combobox searching `customers` by name/phone/company. Shows customer card after selection. Inline "Create New Customer" mini-form.

**B. Product Picker**: Debounced combobox searching `products` table. Click adds to items list.

**C. Items Table**: Editable qty, unit price override, per-line remove. Auto-calculates totals.

**D. Delivery**: Dropdown of customer's saved addresses or manual entry. Auto-calc delivery fee from `delivery_fees` table by zone.

**E. Payment & Notes**: Payment method radio (COD/KBZ/MyanPay/Bank), order discount field, internal notes, customer notes, source dropdown.

**F. Submit**: Calls `create_manual_order()` RPC. Confirmation dialog before submit. Navigate to order detail on success. Logs activity.

### 2. `src/components/orders/OrderNotes.tsx` — Team Notes Component
- Fetches `order_notes` for the order, displays reverse-chronologically with pinned notes on top
- Each note: author name, relative time, content with highlighted @mentions, pin toggle
- Input area with `@` trigger showing staff dropdown (fetches `staff_profiles` where `is_active = true`)
- On submit: inserts `order_notes` with `mentions` array, creates `staff_notifications` for each mentioned staff

### 3. `src/components/orders/OrderEditItemsDialog.tsx` — Edit Items Dialog
- Modal with editable items table (qty, price override, remove)
- "Add Product" row with search
- Save: updates `order_items`, recalculates order totals, inserts `order_edits` audit record

### 4. `src/components/orders/ApplyDiscountDialog.tsx` — Discount Dialog
- Input for discount amount + optional reason
- Updates `orders.discount`, recalculates total
- Inserts `order_edits` record

### 5. `src/components/sidebar/NotificationBell.tsx` — Notification Bell
- Polls `staff_notifications` for unread count every 15s
- Bell icon with red badge
- Popover with recent notifications list
- Click → navigate to link, mark as read
- "Mark all read" button

## Files to Modify

### `src/App.tsx`
- Add route: `<Route path="orders/create" element={<CreateOrder />} />`

### `src/pages/OrderDetail.tsx`
- Replace the simple "Internal Notes" textarea with the new `OrderNotes` component
- Add "Edit Items" button (visible when status is editable: `confirmed_cod`, `awaiting_payment_proof`, `payment_under_review`, `paid`)
- Add "Apply Discount" button in summary card
- Import and render `OrderEditItemsDialog` and `ApplyDiscountDialog`
- Add editable contact info (inline edit for `contact_name`/`contact_phone`)

### `src/components/AdminSidebar.tsx`
- Import and render `NotificationBell` in the footer section next to the staff avatar
- Add "Create Order" button to the Orders nav group or as a quick action

### `src/components/orders/OrderCommandCenter.tsx`
- Add "Create Order" button (navigates to `/orders/create`)

## Permissions
- Create/edit order actions gated by `canManageOrders`
- Discount application restricted to admin/manager roles (checked client-side and noted in audit)
- Notes: any active staff can read/write
- Notifications: staff can only see their own (enforced by RLS)

## Key Technical Decisions
- Customer/product search uses debounced queries (300ms) with `ilike` matching
- @mention dropdown filters staff as user types after `@`
- Order editing only allowed in early statuses; shows lock icon otherwise
- All edits create audit trail in `order_edits` table
- Notification polling every 15s (lightweight head-only count query)

