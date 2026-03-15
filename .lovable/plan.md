

# KPI Dashboard & Weekly Review

## Overview
Replace the simple Dashboard with a KPI-driven command center using `get_live_kpis()` RPC, and create a Weekly Review page for management. Add a `take_kpi_snapshot` DB function for historical tracking.

## Database Changes

**Migration: Add `take_kpi_snapshot` function + unique constraint on `kpi_snapshots`**
- Add unique constraint on `(snapshot_date, period)` for upsert support
- Create `take_kpi_snapshot(p_period text)` function that computes metrics from orders, order_refunds, sla_tracking, customers and upserts into `kpi_snapshots`

## Files to Create

### `src/pages/WeeklyReview.tsx` (~400 lines)
- Week selector (prev/next arrows with date range display)
- Executive summary card (revenue, orders, customers, SLA met %)
- KPI comparison table: This Week vs Last Week with Change, Target, Status (✅/⚠️/❌)
- Metrics computed from `kpi_snapshots` (weekly period) or live queries for the selected week
- Cancellation breakdown table by `cancelled_reason`
- SLA performance by queue from `sla_tracking`
- Top products table from `order_items` joined with orders in the period

## Files to Modify

### `src/pages/Dashboard.tsx` — Major Rewrite
Replace current simple dashboard with:

**Real-time section (top)**: Call `get_live_kpis()` RPC with 30s auto-refresh via `refetchInterval`. Show: Orders Today, Revenue Today, Delivered Today, Avg Verify Time, SLA Breaches. Queue health row below (payment/warehouse/delivery/tasks counts).

**KPI cards row**: 7 metric cards with sparkline trends from `kpi_snapshots` (last 7 daily snapshots). Metrics: Checkout→Paid Conversion, Proof Verify Time (p50), On-Time Dispatch, 1st Attempt Delivery, Cancellation Rate, Repeat Purchase Rate, Net Revenue. Each card shows value, trend arrow (▲/▼), and a small recharts `<Line>` sparkline.

**Charts section** (4 rows, 2 charts each):
1. Revenue: Daily revenue line chart (30d from orders) + Revenue by payment method stacked bar
2. Orders: Daily order count bar + Orders by status donut (current)
3. Customer: New customers/week line + RFM segment bar (from `customer_metrics`)
4. Operations: SLA breach rate line (daily) + Orders by hour heatmap (simplified as bar chart)

All charts via recharts. Sparkline data from `kpi_snapshots` where `period = 'daily'` ordered by `snapshot_date` desc limit 7.

### `src/App.tsx`
- Import `WeeklyReview`, add route: `<Route path="reports/weekly" element={<ProtectedRoute module="reports"><WeeklyReview /></ProtectedRoute>} />`

### `src/components/AdminSidebar.tsx`
- Add "Weekly Review" nav item under System group after Reports, with `BarChart3` icon, module: `reports`

## Key Technical Decisions
- `get_live_kpis()` already exists as an RPC — use `supabase.rpc('get_live_kpis')` directly
- Sparklines use recharts `<ResponsiveContainer>` with tiny `<LineChart>` (no axes, no tooltip)
- KPI snapshot function created via migration; can be called manually or via pg_cron later
- Weekly Review computes metrics from live queries for the selected week range (not dependent on snapshots existing)
- Export/PDF deferred — focus on the dashboard and review views first
- Target configuration deferred — hardcoded targets for now (can be moved to settings later)

