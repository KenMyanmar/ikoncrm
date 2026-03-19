

# Fix: Product Create Page Infinite Loading

## Root Cause
The route `/products/new` is defined **without** an `:id` parameter, so `useParams()` returns `{ id: undefined }`. The check `const isNew = id === "new"` evaluates to `false`, causing `form` to initialize as `null` and the loading spinner to show forever.

## Fix — `src/pages/ProductEdit.tsx`

Change the `isNew` detection on line 64:

```typescript
// Before:
const isNew = id === "new";

// After:
const isNew = !id || id === "new";
```

This handles both the case where `id` is `undefined` (from `/products/new` route) and where `id` is literally `"new"` (from `/products/:id` route matching).

**Files modified:** `src/pages/ProductEdit.tsx` (1 line change)

