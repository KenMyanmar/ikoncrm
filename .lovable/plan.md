

# Customer Communication System

## Overview
Add communication capabilities to the CRM: a communication log and send-message dialog in OrderDetail, template variable resolution, and quick-send buttons for common status updates. Email sending will be logged but actual delivery deferred until a provider (Resend) is configured.

## Files to Create

### `src/components/orders/CommunicationLog.tsx`
- Queries `customer_communications` for the order, sorted by `created_at DESC`
- Each entry: channel icon, subject, body preview (expandable), sender name (joins `staff_profiles`), relative time, status badge (sent/delivered/failed)
- Auto-sent messages show "Auto" badge
- "Send Message" button in header opens `SendMessageDialog`

### `src/components/orders/SendMessageDialog.tsx`
- Dialog with: recipient info (customer name + email from order), template dropdown (from `communication_templates`), subject input, body textarea, channel toggle (Email / Manual Note)
- Template selection auto-fills subject + body with variable replacement (`{{customer_name}}`, `{{order_number}}`, `{{total}}`, `{{payment_method}}`, `{{rejection_reason}}`)
- On submit: inserts into `customer_communications`, logs activity, optionally calls `send-order-email` edge function if channel is email
- For MVP: "Manual Note" just logs; email sends if edge function is deployed

### `src/components/orders/templateUtils.ts`
- `resolveTemplate(template: string, vars: Record<string, string>): string` — replaces `{{var}}` placeholders
- Shared between SendMessageDialog and auto-send logic

## Files to Modify

### `src/pages/OrderDetail.tsx`
- Add `CommunicationLog` component in the left column (after Status Timeline)
- Add quick-send buttons in the header action bar:
  - `payment_rejected` → "Notify Customer" (pre-fills rejection template)
  - `out_for_delivery` → "Send Delivery Update"
  - `delivered` → "Send Confirmation"
- Add `SendMessageDialog` state management

### `src/components/orders/PaymentVerificationDialog.tsx`
- After successful approve/reject, check for auto-send template matching the new status and insert a `customer_communications` record

## Edge Function

### `supabase/functions/send-order-email/index.ts`
- Accepts `{ to, subject, body, communication_id }`
- Attempts to send via Resend API (if `RESEND_API_KEY` secret exists)
- Updates `customer_communications.status` to `delivered` or `failed`
- If no Resend key configured, logs and returns success (graceful degradation)
- CORS headers included, JWT validation via `getClaims()`

## No Database Changes
`customer_communications` and `communication_templates` tables already exist with appropriate RLS policies.

## No New Secrets Required Initially
The edge function will gracefully handle missing `RESEND_API_KEY` — communications are logged regardless. Email delivery can be enabled later by adding the secret.

## Key Decisions
- Template management UI deferred (staff can manage templates via Supabase dashboard for now) — keeps scope manageable
- Auto-send on status change added only to PaymentVerificationDialog initially; other mutations can be enhanced incrementally
- Channel defaults to "Manual Note" for MVP safety

