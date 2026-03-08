

# Universal Image Upload — Replace URL Fields with File Upload

## Overview
Create a reusable `ImageUpload` component that handles drag-and-drop file upload to Supabase Storage, then integrate it into Banners, Promotions, and Product Edit forms.

## Changes

### 1. Storage RLS Policies (SQL Migration)
Add upload/read policies for the `banners`, `product-images`, and `category-images` buckets so authenticated staff can upload and the public can view:

```sql
-- Banners bucket
CREATE POLICY "Staff upload banners" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners');
CREATE POLICY "Staff manage banners" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'banners');
CREATE POLICY "Staff delete banners" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'banners');
CREATE POLICY "Public view banners" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'banners');

-- Product-images bucket
CREATE POLICY "Staff upload product-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Staff manage product-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY "Staff delete product-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY "Public view product-images" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');
```

### 2. Create `src/components/ui/ImageUpload.tsx`
Reusable component with:
- **Props**: `bucket`, `value` (current URL), `onChange` (new URL callback), `folder?`, `maxSizeMB?` (default 5), `aspectHint?`
- Drag-and-drop zone with click-to-browse fallback
- File type validation (JPEG, PNG, WebP, GIF only)
- Size validation
- Upload progress spinner
- Image preview with remove (X) button
- Generates unique filenames with timestamp + random suffix

### 3. Integrate into Banner Dialog (`src/pages/BannerList.tsx`)
- Replace the `Image URL` text `<Input>` (line ~84) with `<ImageUpload bucket="banners" value={editing.image_url} onChange={url => setEditing({...editing, image_url: url})} aspectHint="1920x600px for hero banners" />`

### 4. Integrate into Promotions Dialog (`src/pages/Promotions.tsx`)
- Replace the `Banner Image URL` text `<Input>` (line 337) with `<ImageUpload bucket="banners" folder="promotions" value={form.banner_image_url} onChange={url => setForm(f => ({...f, banner_image_url: url}))} aspectHint="1200x400px" />`

### 5. Integrate into Product Edit (`src/pages/ProductEdit.tsx`)
- Replace the static "Image upload coming in next iteration" placeholder with `<ImageUpload bucket="product-images" folder="thumbnails" value={form.thumbnail_url || ""} onChange={url => update("thumbnail_url", url)} aspectHint="Square 800x800px" />`

## Files Summary

| File | Action |
|------|--------|
| `src/components/ui/ImageUpload.tsx` | **Create** — Reusable upload component |
| `src/pages/BannerList.tsx` | **Edit** — Replace Image URL input |
| `src/pages/Promotions.tsx` | **Edit** — Replace Banner Image URL input |
| `src/pages/ProductEdit.tsx` | **Edit** — Replace placeholder with upload |
| SQL Migration | **Run** — Storage bucket RLS policies |

