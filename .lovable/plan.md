## Fix: Business Type Curator null-id constraint violation

### Problem
When staff curates new sub-categories in the Business Type Curator and clicks Save, new mappings without an existing server `id` are serialized with `id: null` (or `undefined` → `null` on the wire). This causes Postgres to attempt `id = NULL`, violating the `NOT NULL` constraint on `business_type_subcategories.id`.

### Root cause
`business_type_subcategories.id` has `DEFAULT gen_random_uuid()` — it only fires when the `id` column is **omitted** from the INSERT payload. The current spread-form conditional `...(m.id ? { id: m.id } : {})` is logically correct but may still leak `id` onto the wire in some edge cases.

### Fix (single file)
**File:** `src/pages/business-types/hooks/useBusinessTypeMappings.ts`

In `useSaveMappings`, replace the spread-form conditional with an explicit `Record<string, any>` build that only sets `row.id = m.id` when `m.id` exists. This guarantees the `id` key is entirely absent for new rows, allowing Postgres to fire the default.

```typescript
const toUpsert = working
  .filter(m => !m._deleted)
  .map(m => {
    const row: Record<string, any> = {
      business_type_id: m.business_type_id,
      category_id: m.category_id,
      sort_order: m.sort_order,
      is_active: m.is_active,
    };
    if (m.id) row.id = m.id;
    return row;
  });
```

No other changes needed. The delete-first → upsert order, query invalidation, and all other logic remain identical.

### Acceptance
1. Open Hotel → Curated Sub-categories tab → check a **new** sub-category (e.g. "Flatwork Ironers").
2. Click Save → success toast, no constraint error.
3. Refresh → new chip persists in Curated list and Preview tab.
4. Uncheck an existing chip → Save → row deleted cleanly.
5. Existing 96 seeded mappings load without regression.

### Out of scope
- No DB migration.
- No UI/UX changes.
- No changes to read hooks or seed data.