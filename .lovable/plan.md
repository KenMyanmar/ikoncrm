

# Communication Log Enhancement + Resend Utility

## Summary
Two focused changes: (1) extract a reusable `resendCommunication` utility, (2) enhance `CommunicationLog.tsx` with pending status, resend button, and improved `is_auto` detection.

No auto-send wiring needed — the DB trigger handles that. No new files for status-change handlers.

## File 1: `src/lib/resendCommunication.ts` (NEW)

Simple utility function that re-invokes the `send-order-email` edge function for a given `customer_communications` record:

- Accepts `communicationId`, `toEmail`, `subject`, `body`
- Sets communication status to `pending` before invoking
- Calls `supabase.functions.invoke("send-order-email", { body: { to, subject, body, communication_id } })`
- Edge function already handles marking `delivered` or `failed`
- Returns `{ success, error }` — never throws
- Used by the resend button in CommunicationLog and could be used by SendMessageDialog in the future

## File 2: `src/components/orders/CommunicationLog.tsx` (MODIFY)

### Add `pending` to STATUS_BADGE map
- `pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" }`

### Improve `is_auto` detection
- Use `comm.is_auto` field (exists in DB) instead of heuristic `!!comm.template_key && !comm.sent_by`

### Add Resend button on failed communications
- Small "Retry" button (RefreshCw icon) visible when `comm.status === 'failed'`
- On click: calls `resendCommunication()` with the comm's data
- Needs customer email — add it to the query join: fetch order's customer email via the existing order_id → orders → customers join, or pass it as a prop
- Approach: add `customerEmail` prop to CommunicationLogProps (parent already has order data with customer email)
- Shows loading state on the button, toast on success/failure
- Invalidates `order-communications` query on completion

### No other changes
- Existing status badges, expand/collapse, channel icons, Auto badge all stay

## Files NOT modified
- `PaymentVerificationDialog.tsx` — no change (DB trigger handles auto-send)
- `DeliveryAssignDialog.tsx` — no change
- `OrderList.tsx` — no change
- `OrderDetail.tsx` — no change
- `MyDeliveries.tsx` — no change
- `SendMessageDialog.tsx` — no change (already works, already calls edge function)
- `send-order-email` edge function — no change (already handles Resend + status updates)

## No database changes needed

