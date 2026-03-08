

# Add FileUpload Component for Datasheets

## Overview
Create a reusable `FileUpload` component (similar to `ImageUpload` but for documents) and replace the datasheet URL text input with it. Files upload to the existing `product-images` bucket under a `datasheets/` folder.

## Changes

### 1. Create `src/components/ui/FileUpload.tsx`
A drag-and-drop file upload component accepting PDF and common document types:
- **Props**: `bucket`, `value`, `onChange`, `folder?`, `maxSizeMB?` (default 10), `accept?` (default PDF), `label?`
- Shows upload zone with drag-and-drop + click-to-browse
- When file is uploaded: shows filename (extracted from URL) with a "view" link and remove button (not an image preview)
- Validates file type and size
- Uploads to Supabase Storage with unique filename

### 2. Update `src/pages/ProductEdit.tsx` (line ~478-480)
Replace:
```tsx
<Input value={form.datasheet_url || ""} onChange={...} placeholder="https://..." />
```
With:
```tsx
<FileUpload
  bucket="product-images"
  folder="datasheets"
  value={form.datasheet_url || ""}
  onChange={(url) => update("datasheet_url", url)}
  maxSizeMB={10}
  accept=".pdf,.doc,.docx,.xls,.xlsx"
  label="PDF, DOC, XLS — Max 10MB"
/>
```

### File summary
| File | Action |
|------|--------|
| `src/components/ui/FileUpload.tsx` | **Create** — Reusable document upload component |
| `src/pages/ProductEdit.tsx` | **Edit** — Replace datasheet URL input with FileUpload |

No database/storage changes needed — reuses existing `product-images` bucket.

