

# Fix Build Error + Flash Deal/Promotions Timezone (MMT)

## Two Issues to Fix

### Issue 1: Build Error — `@swc/core` native binding failure
`@swc/core` is incorrectly listed as a direct dependency in `package.json` (line 45). The `@vitejs/plugin-react-swc` plugin manages its own SWC dependency internally. Having `@swc/core` as a separate dependency causes version/platform mismatches with the native binary.

**Fix:** Remove `"@swc/core": "^1.15.18"` from `package.json` dependencies. Also move `@vitejs/plugin-react-swc` from dependencies to devDependencies where it belongs.

### Issue 2: Timezone Fix — MMT (UTC+6:30)

**File 1: `src/pages/FlashDeals.tsx`**

1. Add `toMMT` helper: appends `":00+06:30"` to datetime-local strings before saving
2. Add `fromMMT` helper: converts UTC ISO string to MMT datetime-local format
3. **Save payload** (line 109-110): wrap `start_time` and `end_time` with `toMMT()`
4. **Edit form** (line 155-156): wrap with `fromMMT()` instead of `.slice(0, 16)`
5. **Labels** (line 351-352): change "Start Time" → "Start Time (MMT)" and "End Time" → "End Time (MMT)"

**File 2: `src/pages/Promotions.tsx`**

1. Add same `toMMT`/`fromMMT` helpers
2. **Save payload** (line 242): wrap `start_date` and `end_date` with `toMMT()`
3. **Edit form** (line 305-306): wrap with `fromMMT()` instead of `.slice(0, 16)`
4. **Labels** (line 509-510): add "(MMT)" to "Start Date" and "End Date" labels

**Helper functions (same in both files):**
```typescript
const toMMT = (v: string) => v ? v + ':00+06:30' : v;
const fromMMT = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mmt = new Date(d.getTime() + (6 * 60 + 30) * 60 * 1000);
  return mmt.toISOString().slice(0, 16);
};
```

No database changes needed — Supabase `timestamptz` handles offset-aware strings correctly.

