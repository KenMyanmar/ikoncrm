# Homepage Sections Admin Page

## Summary
New CRM page at `/homepage-sections` with two tabs to manage storefront homepage content:
1. **Category Images** — set/clear background image for each main category tile
2. **Business Types** — full CRUD for the "Shop by Business Type" cards

Database, RLS, seed data, and the `category-images` storage bucket are already in place. No DB migration needed.

## Files

### 1. `src/pages/HomepageSections.tsx` (CREATE)

Single page with `<Tabs>` (shadcn) — tabs: "Category Images", "Business Types".

**Header**
- Title: "Homepage Sections"
- Subtitle: "Manage category images and business type cards displayed on the storefront homepage"

**Tab 1 — Category Images**
- React Query: `["homepage-categories"]` → `categories` where `depth=0` AND `is_active=true`, ordered by `sort_order`. Select `id, name, slug, image_url, product_count`.
- Layout: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4`
- Each card (shadcn `Card`):
  - Image: `aspect-[4/3] rounded-lg overflow-hidden bg-muted` — shows `<img>` if `image_url`, otherwise `ImageIcon` placeholder
  - Name: `font-medium text-sm mt-2`
  - Count: `{product_count} products` `text-xs text-muted-foreground`
  - Buttons row: "Change Image" (outline, sm) + "Remove" (ghost destructive, sm, only when image set)
- "Change Image" uses a hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` per card (or a shared one tracked by selected category id).
- Upload mutation:
  - Validate type + size (≤ 5MB), reuse the validation pattern from `ImageUpload`
  - `supabase.storage.from("category-images").upload("{slug}.jpg", file, { upsert: true, cacheControl: "3600" })` — overwrites existing
  - Get public URL, update `categories` row: `update({ image_url: publicUrl }).eq("id", id)`
  - Invalidate `["homepage-categories"]`, `logActivity(staff.id, "updated", "category", id, name)`
  - Toast: `Image updated for {name}`
- Remove mutation: `update({ image_url: null }).eq("id", id)` + invalidate + toast.
  - Note: we don't delete the storage object (keeps storage simple; new uploads overwrite the same path).

**Tab 2 — Business Types**
- React Query: `["business-types"]` → `business_types` ordered by `sort_order asc`.
- Header row: "Add Business Type" button (top-right of tab content).
- List as `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` of cards:
  - Image thumbnail (`aspect-square` or `aspect-[4/3]`, fallback placeholder)
  - Label (font-medium)
  - Link URL (text-xs text-muted-foreground, truncate)
  - Sort order chip + Active/Inactive badge
  - Buttons: Edit, Delete (destructive)
- Add/Edit dialog (shadcn `Dialog`) with fields:
  - **Label** — `Input`, required
  - **Image** — reuse `<ImageUpload bucket="category-images" folder="business-types" .../>` (the existing component already handles drag/drop, upload, preview, validation; uses unique filename to avoid collisions). Acceptable trade-off vs the spec's `biz-{slug}.jpg` — it's the established pattern in the CRM.
  - **Link URL** — `Input`, required, helper: "Internal path like /category/tableware or full URL"
  - **Sort Order** — `Input type="number"`, default = `Math.max(...existing.sort_order) + 1` (or 0 if empty)
  - **Active** — `Switch`, default true
- Save mutation: insert if no `id`, else update; invalidate `["business-types"]`; close dialog; toast.
- Delete: `AlertDialog` confirmation "Remove {label} from Business Types?" → hard delete from `business_types`.

**Shared**
- Use `useStaff()` + `logActivity()` for write actions, mirroring `BannerList.tsx`.
- Use `sonner` `toast` for feedback.

### 2. `src/App.tsx` (MODIFY)
- Import: `import HomepageSections from "@/pages/HomepageSections";`
- Add route inside `AdminLayout`, near the Banners route:
  ```tsx
  <Route path="homepage-sections" element={<ProtectedRoute module="banners"><HomepageSections /></ProtectedRoute>} />
  ```
  (Module = `banners` — same permission as Banners, since the request says "staff who can manage banners should also manage homepage sections".)

### 3. `src/components/AdminSidebar.tsx` (MODIFY)
- Add `LayoutGrid` to the `lucide-react` import.
- Add a new entry to the existing **Marketing** group (where Banners lives), placed directly after Banners:
  ```ts
  { title: "Homepage Sections", url: "/homepage-sections", icon: LayoutGrid, module: "banners" },
  ```
- Do NOT create a separate "Homepage" group — the spec says to match Banners' group, which is "Marketing".

## Files NOT changed
- No DB migration (table, RLS, bucket all exist)
- `src/integrations/supabase/types.ts` — `business_types` is already in generated types (verified via the schema in context)
- Storefront / E-Mall code — out of scope for this repo

## Technical notes
- Storage bucket `category-images` is reused for both tabs (categories at root path `{slug}.jpg`; business types under `business-types/` folder via `ImageUpload`'s `folder` prop).
- All writes are gated by RLS (`is_staff(auth.uid())`); no client-side role check needed beyond `ProtectedRoute`.
- Drag-to-reorder is intentionally skipped (per spec: "optional"). Sort order is edited via the number input.
