

# CRM Automations Engine

## Overview
Build the automation management UI and a client-side automation runner. Two new pages (Automations rules manager, CRM Tasks board), a background hook that evaluates time-based rules, and notification enhancements.

## Files to Create

### `src/pages/Automations.tsx` (~500 lines)
- **Stats bar**: Active rules count, today's run count (sum of `run_count` delta), pending tasks count from `crm_tasks`
- **Rules list**: Card-based layout from `automation_rules` table. Each card shows name, trigger description, action description, run_count, last_run_at, is_active toggle
- **Rule Editor Dialog**: Create/edit form with:
  - Trigger type radio: `time_based` | `status_change` | `threshold`
  - Time-based config: status dropdown, delay_minutes input
  - Conditions: customer LTV min, first-time buyer checkbox, COD-only checkbox, payment method
  - Action type radio: `send_communication` | `update_status` | `create_notification` | `create_task` | `flag_order`
  - Action config fields change based on type (template_key, target status, notification title/priority, task title/queue)
  - Saves to `automation_rules` table
- **Pause/Resume**: Toggle `is_active` on the rule
- Permission: `reports` module (manager+)

### `src/pages/CrmTasks.tsx` (~350 lines)
- **Filter tabs**: All | My Tasks | Payment | Warehouse | Delivery | CRM | Management (filter by `queue`)
- **Task cards**: Left border colored by priority (red=urgent, amber=high, blue=normal, gray=low). Shows title, linked order number, customer name, description, assigned_to, created_at
- **Actions**: Take Task (set `assigned_to` to current staff), Complete (set `status = 'completed'`, `completed_by`, `completed_at`), Dismiss
- **Quick Task creation**: Dialog with title, queue, priority, optional order link, assign to staff dropdown
- Queries `crm_tasks` joined with `orders(order_number)` and `staff_profiles(full_name)` for assignee

### `src/hooks/useAutomationRunner.ts` (~150 lines)
Client-side polling hook (runs every 60s when any admin page is open):
- Fetches active `time_based` rules from `automation_rules`
- For each rule, queries orders matching `trigger_config.status` with `created_at < now() - delay_minutes`
- Dedup check: skips if `customer_communications` or `activity_log` already has an entry for this order+rule combo (uses `template_key` or `automation_rule_id`)
- Executes action based on `action_type`:
  - `send_communication`: Insert into `customer_communications` with template resolution
  - `update_status`: Update `orders.status`, insert `order_status_history`
  - `create_notification`: Insert into `staff_notifications` for target role
  - `create_task`: Insert into `crm_tasks`
  - `flag_order`: Update `orders.requires_approval = true`
- Updates `automation_rules.last_run_at` and increments `run_count`
- Logs to `activity_log`
- Only runs for manager+ roles to avoid duplicate execution from multiple clients

## Files to Modify

### `src/App.tsx`
- Import `Automations` and `CrmTasks`
- Add routes: `/automations` (module: `reports`) and `/tasks` (module: `orders`)

### `src/components/AdminSidebar.tsx`
- Add "Automations" nav item (Zap icon, module: `reports`) to System group
- Add "Tasks" nav item (ClipboardList icon, module: `orders`) to Sales group
- Add task badge count (open tasks assigned to current staff)

### `src/components/AdminLayout.tsx`
- Import and render `useAutomationRunner()` hook here so it runs on all admin pages

### `src/contexts/StaffContext.tsx`
- No changes needed — uses existing `reports` and `orders` module permissions

## Seed Data
Insert default automation rules into `automation_rules` table via the insert tool:
1. Payment Reminder 15min — time_based, awaiting_payment_proof, 15min, send_communication
2. Payment Reminder 2hr — time_based, awaiting_payment_proof, 120min, send_communication
3. Auto-Cancel Unpaid 24hr — time_based, awaiting_payment_proof, 1440min, update_status → expired
4. VIP Rescue Alert — time_based, payment_under_review, 15min, create_notification (condition: LTV > 1M)
5. COD Confirmation Call — status_change, confirmed_cod, create_task (condition: first_time + total > 500K)
6. Failed Delivery Reattempt — status_change, failed delivery, create_task

## No Database Changes
`automation_rules` and `crm_tasks` tables already exist with all required columns and RLS policies.

## Key Decisions
- Client-side runner (not edge function cron) for simplicity — runs in `AdminLayout` for manager+ staff
- Deduplication via checking existing records prevents double-execution
- SLA header widget deferred (existing SLA timers + notification bell cover this)
- Notification categories (type field) already supported by `staff_notifications.type` column

