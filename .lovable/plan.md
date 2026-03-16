

# Fix V2: Server-Side Automations + Auto-Send — Implementation Plan

## Current State
- `autoSendTemplate()` exists **only** in `PaymentVerificationDialog.tsx` (lines 18-49, called on lines 93 and 124)
- No `autoSendTemplate` in DeliveryAssignDialog, MyDeliveries, OrderDetail, or `src/lib/`
- No `useStatusChangeAutomation` hook exists — nothing to delete
- No `src/lib/autoSendTemplate.ts` exists — nothing to delete
- `useAutomationRunner.ts` has no execution log inserts
- `Automations.tsx` has no Monitor tab — just a flat rules list + editor dialog

## Changes

### 1. `src/components/orders/PaymentVerificationDialog.tsx`
- Remove `autoSendTemplate` function (lines 18-49)
- Remove the two calls on lines 93 and 124
- Remove `resolveTemplate` import (line 3) and `PAYMENT_METHOD_LABELS` from import if only used by autoSend (check — it's also used on line 149, so keep it)

### 2. `src/hooks/useAutomationRunner.ts`
- After each successful action execution (after line 174), insert into `automation_execution_log` with `trigger_type: "time_based_rule"`, `action_result: "success"`
- In the catch block (line 182), insert with `action_result: "failed"` and `error_message`

### 3. `src/pages/Automations.tsx` — Add Monitor tab
- Wrap existing content in a Tabs component: "Rules" tab (existing) + "Monitor" tab (new)
- Monitor tab contents:
  - **Stats cards**: Call `supabase.rpc('get_automation_stats', { p_hours })` — display Auto-Send / Status Rules / Time Rules success/failed/deduped counts
  - **Time range selector**: 1h / 6h / 24h / 7d buttons
  - **Rule breakdown table**: Rule Name | Type | Success | Failed | Deduped
  - **Template breakdown table**: Template Key | Sent | Failed | Deduped
  - **Execution log**: Recent 100 entries from `automation_execution_log` with order number join, color-coded result badges, filter by result/trigger type
  - Auto-refresh every 30s

### Files Modified
- `src/components/orders/PaymentVerificationDialog.tsx` — Remove autoSendTemplate
- `src/hooks/useAutomationRunner.ts` — Add execution log inserts
- `src/pages/Automations.tsx` — Add Monitor tab with stats + log viewer

### No files to delete
Neither `src/lib/autoSendTemplate.ts` nor `src/hooks/useStatusChangeAutomation.ts` exist.

