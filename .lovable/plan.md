

# Articles & Blog Management — CRM

## Summary
Create two new pages (list + editor) for managing blog articles, wire into router and sidebar. Uses existing `articles` table (Migration 18). No database changes needed.

## Files to Create

### 1. `src/pages/ArticlesManagement.tsx` — Article list page
- Status filter tabs: All / Published / Draft / Archived (with counts from query)
- Search input filtering by title (ilike)
- Responsive card grid (3 cols desktop, 2 tablet, 1 mobile)
- Each card: featured image (or gradient placeholder), title, date, view count, tag badges, excerpt, status dot, Edit button
- Sort dropdown: newest, most viewed, recently updated
- "+ New Article" button navigates to `/articles/new`
- Edit button navigates to `/articles/{id}/edit`

### 2. `src/pages/ArticleEditor.tsx` — Full-page article editor
- Detects create vs edit mode via `useParams` (same pattern as ProductEdit: `!id || id === "new"`)
- Fields: title, slug (auto-generated, editable, shows URL preview), excerpt (max 200 chars), featured image (ImageUpload component to `article-images` bucket or URL input), body (textarea with markdown/HTML), tags (checkbox group: kitchen, insights, brands, care, guides), category_id (select depth=0 categories), is_featured checkbox, meta_title, meta_description
- **Rich text**: Use a plain `<Textarea>` for body content (HTML/markdown). Keep it simple — no external WYSIWYG dependency. Staff can write formatted content.
- Slug auto-generation from title with `generateSlug` helper
- "Back to Articles" link at top
- Two action buttons: "Save Draft" (status=draft) + "Publish" (status=published)
- If editing a published article: "Unpublish" option (with confirmation dialog)
- `isSubmitting` guard to prevent double-submit
- On save: insert or update via Supabase, invalidate query, navigate back or show toast

## Files to Modify

### 3. `src/App.tsx`
- Import `ArticlesManagement` and `ArticleEditor`
- Add routes inside the protected layout:
  - `articles` → `ArticlesManagement` (module: `banners` — content management permission, same tier as banners)
  - `articles/new` → `ArticleEditor` (before `articles/:id`)
  - `articles/:id` → `ArticleEditor`

### 4. `src/components/AdminSidebar.tsx`
- Add `Newspaper` icon import from lucide-react
- Add a "Content" nav group (between Marketing and Delivery) with:
  - `{ title: "Articles", url: "/articles", icon: Newspaper, module: "banners" }`

### 5. `src/contexts/StaffContext.tsx`
- No changes needed — articles will use the `banners` module permission (staff with banner access can manage content). This keeps it simple without adding a new permission.

## Technical Details
- Featured image uses existing `ImageUpload` component with a new `article-images` storage bucket (need migration for bucket creation)
- Actually, to avoid a migration, use the existing `banners` bucket or allow URL-only input for featured images
- Tags stored as `text[]` array — checkbox group maps to array on save
- `author_id` set from `staff.id`, `author_name` from `staff.full_name`
- Category dropdown fetches `categories` where `depth=0, is_active=true`
- Slug uniqueness: catch unique constraint error on save and show toast

## No database changes needed
The `articles` table and RLS policies already exist from Migration 18.

