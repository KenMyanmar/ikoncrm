

# Risk & Revenue Dashboard

## Overview
Create a comprehensive risk management and revenue protection center with COD risk scoring, refund control, discount approval workflows, and COD analytics. This is a single new page plus minor modifications to existing files.

## Files to Create

### `src/pages/RiskRevenue.tsx` — Main Page (~600 lines)
Five-tab page with stats bar at top:

**Stats Bar**: Queries `orders` (flagged count, pending approval count), `order_refunds` (weekly sum), and revenue (weekly net). Uses individual count/sum queries.

**Tab 1: Risk Monitor**
- Table of orders where `risk_score >= 20` OR `requires_approval = true`, joined with `customers` for name
- Risk score color coding: green (<20), amber (20-39), red (40-59), dark red (60+)
- Actions: Approve (clears `requires_approval`, sets `approved_by`/`approved_at`), Hold (creates CRM task), Cancel (with reason dialog)
- Expandable row showing customer risk profile: total orders, cancellations, COD success rate, failed deliveries, risk tier, fraud flags

**Tab 2: Refund Control**
- Refund request form: order search (combobox), amount, reason dropdown, refund method radio
- Refund approval queue: table from `order_refunds` where `status = 'pending'`, with approve/reject actions
- Threshold logic: <100K auto-approved on submit, 100K-500K needs manager, >500K needs admin (client-side gating)
- Weekly refund total display

**Tab 3: Discount Approvals**
- Table from `discount_requests` where `status = 'pending'`
- Shows order, staff who requested, discount amount, original/new total, reason
- Approve/reject actions (manager+ only)

**Tab 4: COD Analytics**
- Stats cards: COD orders this month, delivery success/fail rates, revenue collected vs lost
- COD risk leaderboard: customers sorted by COD failure rate
- Queries `orders` with `payment_method = 'cod'` and `delivery_assignments`

**Tab 5: Revenue Protection**
- Revenue waterfall: gross orders, cancellations, failed COD, refunds, expired → net revenue (bar chart via recharts)
- Loss breakdown donut chart by reason

### No new components needed — everything lives in the page file with inline sub-sections.

## Files to Modify

### `src/App.tsx`
- Import `RiskRevenue` and add route: `<Route path="risk" element={<ProtectedRoute module="reports"><RiskRevenue /></ProtectedRoute>} />`

### `src/components/AdminSidebar.tsx`
- Add nav item `{ title: "Risk & Revenue", url: "/risk", icon: Shield, module: "reports" }` to the System group

### `src/contexts/StaffContext.tsx`
- No changes needed — risk page uses existing `reports` module permission (manager+ access)

### `src/components/orders/OrderKanbanCard.tsx`
- Lower risk badge threshold from `riskScore >= 40` to `riskScore >= 20` for amber dots
- Add visual distinction: 20-39 amber dot, 40-59 red badge, 60+ pulsing red badge

### `src/pages/CustomerDetail.tsx`
- Add a "Risk Profile" card showing: risk_tier, fraud_flags, total_cod_orders, total_cod_delivered, total_failed_deliveries, total_cancelled_orders
- Add "Flag Customer" dropdown button (inserts into `fraud_flags` array on customers table)

## No Database Changes
All required tables (`order_refunds`, `discount_requests`) and functions (`assess_order_risk`) already exist. The `customers` table already has `risk_tier`, `fraud_flags`, `total_cod_orders`, `total_cancelled_orders`, `total_failed_deliveries` columns.

## Key Technical Decisions
- Uses recharts (already installed) for waterfall and donut charts
- Refund/discount approval thresholds enforced client-side with role checks from `useStaff()`
- COD analytics queries orders table directly with aggregation
- Risk page mapped to `reports` module permission (manager, admin, super_admin)
- Customer flagging updates `fraud_flags` text array on `customers` table directly

