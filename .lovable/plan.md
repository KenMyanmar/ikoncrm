

# Order Command Center (Kanban + SLA)

## Overview
Replace the current OrderList table view with a dual-mode Order Command Center featuring a Kanban board (default), enhanced table view, live KPI stats from `get_live_kpis()` RPC, and SLA countdown timers from the existing `sla_tracking` table.

## Scope

This is a large feature. I'll implement it without drag-and-drop initially (cards have action buttons instead) to avoid complexity and reliability issues with DnD libraries. Drag-and-drop can be added later as an enhancement.

## Files to Create

### `src/components/orders/OrderCommandCenter.tsx`
Top bar component with:
- Title "Order Command Center" + "Create Order" button
- Live stats row using `get_live_kpis()` RPC (auto-refresh 30s): Today orders, Revenue, SLA breaches/warnings, Open tasks, Risk flags
- View toggle (Kanban/Table) stored in `localStorage`
- Search input

### `src/components/orders/OrderKanbanBoard.tsx`
5-column Kanban layout:
- **Payment Queue**: `awaiting_payment_proof`, `payment_under_review`
- **Warehouse**: `confirmed_cod`, `paid`, `packed`
- **Delivery**: `out_for_delivery`
- **Done**: `delivered` (today only)
- **Exceptions**: `payment_rejected`, `cancelled`, `expired`

Each column: icon, name, count badge, scrollable card list. Columns use `flex` layout with horizontal scroll on mobile.

### `src/components/orders/OrderKanbanCard.tsx`
Compact card showing:
- SLA timer (green/amber/red, queried from `sla_tracking` where `resolved_at IS NULL`)
- Payment method badge (COD=red, KBZ=blue, MyanPay=purple)
- Order number, customer name/company
- Item count + total (MMK)
- Delivery zone
- Risk flags (if `risk_score >= 40`)
- Context action button (Review Payment / Mark Packed / Assign Driver / Mark Delivered)
- "..." dropdown menu (View Details, Print Slip, Cancel)

SLA timer updates every 10s via `useEffect` interval (client-side countdown from `target_at`).

### `src/components/orders/useSlaTimers.ts`
Custom hook that:
- Fetches active SLA records for a set of order IDs from `sla_tracking`
- Returns a map of `orderId → { targetAt, warningAt, isBreached, queue }`
- Re-fetches every 60s, client-side countdown every 10s

### `src/components/orders/SlaTimerBadge.tsx`
Reusable badge component:
- Calculates remaining time from `target_at`
- Green (>50% remaining), Amber (<50%, pulse), Red (overdue, shows "OVERDUE +MM:SS")
- Monospace font for countdown

## Files to Modify

### `src/pages/OrderList.tsx` — Major rewrite
Replace current content with `OrderCommandCenter` wrapper that renders either `OrderKanbanBoard` or the existing enhanced table view based on toggle state. Keep all existing table logic (stats, tabs, search, mutations, dialogs) but wrap them in the table view mode.

### `src/pages/OrderDetail.tsx` — Add SLA + Risk cards
Add to the right column:
- **SLA Performance Card**: Shows all SLA entries for this order (resolved + active) with status indicators
- **Risk Assessment Card** (if `risk_score > 0`): Shows score, flag descriptions, and action buttons

### `src/components/orders/orderConstants.ts`
Add column-to-status mapping for Kanban:
```ts
export const KANBAN_COLUMNS = [
  { key: 'payment', label: 'Payment Queue', icon: 'CreditCard', statuses: [...] },
  { key: 'warehouse', label: 'Warehouse', icon: 'Package', statuses: [...] },
  ...
];
```

Add risk flag labels map and SLA timer utility functions.

## Dependencies
No new npm packages. The Kanban board uses CSS grid/flex layout with action buttons instead of drag-and-drop. This avoids DnD library complexity while delivering the same operational value.

## Database
No schema changes needed. `sla_tracking`, `sla_rules`, and `get_live_kpis()` RPC already exist. RLS policies on `sla_tracking` need to be checked — if missing, I'll add a policy allowing staff to read SLA records.

## Key Technical Decisions
- **No drag-and-drop initially**: Action buttons provide the same status transitions more reliably. DnD can be layered on later.
- **Client-side SLA countdown**: Fetch `target_at` timestamps once, count down locally, re-sync every 60s.
- **Kanban query**: Single query fetching all active orders (not delivered before today), grouped client-side into columns.
- **Mobile**: Kanban columns become horizontally scrollable with snap points.

