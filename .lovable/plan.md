

# Customer 360 View — Implementation Plan

## Overview
Transform the customer section into a full CRM with enriched list (using `customer_metrics` view), enhanced detail page with communications tab, customer insights in OrderDetail, and dashboard widgets.

## No Database Changes Needed
The `customer_metrics` view, `customer_communications` table, `customer_addresses` table, and `customers.tags` column all already exist.

## Files to Modify

### 1. `src/pages/CustomerList.tsx` — Major Rewrite
- **Stats row**: 4 cards (Total Customers, Active 30d, New This Month, Total Revenue) queried from `customer_metrics`
- **Data source**: Switch from `customers` table to `customer_metrics` view for aggregated data (lifetime_value, total_orders, last_order_date, rfm_segment, etc.)
- **Enhanced columns**: Name, Company, Phone, Orders, Lifetime Value, Last Order (relative time), Status badge, Tags
- **Status logic**: Active (ordered in 30d), Recent (90d), Inactive (90d+), New (created 7d, no orders)
- **Filters**: Search (name/company/phone/email), status filter dropdown, sort by (LTV/Recent/Name/Joined), tag filter
- **CSV Export**: Button that generates `ikon_customers_{date}.csv` from current filtered data

### 2. `src/pages/CustomerDetail.tsx` — Major Enhancement
- **Header card**: Show customer name, email, phone, company, customer since date. 4 metric boxes (Lifetime Value, Orders, Avg Order Value, Last Order) from `customer_metrics` view
- **Action buttons**: Edit Customer, Create Order (navigate to /orders/create?customer=id), Send Message
- **Tags section**: Color-coded badges (vip=gold, wholesale=blue, hotel=purple, restaurant=green, repeat=emerald, at_risk=red). Staff can add/remove via dropdown
- **Tab 1 (Orders)**: Enhanced with payment method column, item count. Order count + total at top. Keep existing click-to-navigate
- **Tab 2 (Communications)**: Timeline view from `customer_communications` where `customer_id = id`. Shows channel icon, subject, body preview, order link, sent_by, timestamp. Filter by channel. "Send Message" button opens SendMessageDialog
- **Tab 3 (Addresses & Info)**: Keep existing address cards. Add customer edit form (name, company, email, phone, type, tags, internal notes). Activity timeline from `order_status_history` + `activity_log` for this customer's orders
- **Keep existing**: Risk Profile card and fraud flag system (already implemented)

### 3. `src/pages/OrderDetail.tsx` — Customer Card Enhancement (lines ~268-276)
- Query `customer_metrics` for the order's customer_id
- Show: order count, lifetime value, last order relative time, preferred payment method, tags
- Add "View Full Profile →" link to `/customers/{customer_id}`

### 4. `src/pages/Dashboard.tsx` — Add Customer Widgets
- **Top Customers widget**: Top 5 by lifetime_value from `customer_metrics`, showing name, LTV, order count
- **At Risk widget**: Customers with `rfm_segment = 'at_risk'` or `recency_days > 60`, showing name and days since last order
- Add after existing charts section

## Key Technical Decisions
- `customer_metrics` is a **view** (not a table), so query it with `.from("customer_metrics")` — it already has all aggregated fields
- Tags managed directly on `customers.tags` text array column (already exists)
- Communications tab reuses existing `SendMessageDialog` component with customer pre-filled
- CSV export done client-side using Blob/download pattern
- No new routes needed — `/customers` and `/customers/:id` already exist

