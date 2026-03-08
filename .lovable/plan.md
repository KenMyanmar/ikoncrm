

# Add Multi-Image Gallery Upload to Product Edit

## Problem
The old IKONmart product page shows a carousel with multiple images and thumbnails (as seen in the screenshot). The `products` table already has an `images` JSONB column (`default '[]'`) for storing an array of image URLs, but the CRM only allows uploading a single thumbnail.

## Solution
Add a multi-image gallery uploader in the Product Edit page's Images card — below the existing thumbnail upload. Staff can upload multiple images that populate the `images` JSONB array. The first image can optionally auto-set as `thumbnail_url` if none is set.

## Changes — `src/pages/ProductEdit.tsx`

### 1. Expand the Images card
Below the existing `ImageUpload` for thumbnail, add a **Gallery Images** section:
- Display uploaded gallery images as a grid of thumbnails (3 columns)
- Each image has a remove (X) button and a "Set as thumbnail" star button
- Below the grid, show an `ImageUpload` component for adding new images
- When a new image is uploaded, append the URL to the `images` array in form state
- If no thumbnail is set, auto-set the first gallery image as thumbnail

### 2. Save `images` in mutation
Add `images: form.images || []` to the update payload (currently missing).

### 3. Initialize `images` from product data
Already handled by the generic `setForm(product)` initialization — just ensure it's an array.

### UI layout inside the Images card
```
Thumbnail (existing ImageUpload)
─────────────────────────
Gallery Images (3 per row grid)
[img1 ✕] [img2 ✕] [img3 ✕]
[img4 ✕] [img5 ✕]
[+ Upload another image]   ← ImageUpload that appends to array
```

### File summary
| File | Action |
|------|--------|
| `src/pages/ProductEdit.tsx` | **Edit** — Add gallery section in Images card, save `images` field |

No new components needed — reuses existing `ImageUpload`.

