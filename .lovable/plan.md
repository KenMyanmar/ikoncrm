

# Banner Management System Redesign

## Summary
Complete rewrite of `src/pages/BannerList.tsx` — from a basic table + tiny dialog to a card-grid list with a large two-column edit dialog featuring live preview, smart link destination, position presets, scheduling, and soft-delete confirmation.

## Changes — `src/pages/BannerList.tsx` (full rewrite)

### 1. Card-Grid List (replaces table)
- 2-column responsive grid of banner cards (`grid-cols-1 md:grid-cols-2`)
- Each card: image preview at 16:5 aspect ratio, title, position badge, active status dot, truncated link, schedule info, Edit + Deactivate buttons
- "Show inactive" toggle in header; inactive cards shown with opacity + "Inactive" badge + Reactivate button
- Schedule display logic: both dates → "Mar 20 – Mar 25", only start → "From Mar 20", neither → "Always active", expired → red badge

### 2. Large Two-Column Edit Dialog
- `max-w-5xl max-h-[90vh] overflow-y-auto`
- **Left column (60%)**: Title, Subtitle, Position dropdown, Image upload, Click Destination selector, Schedule dates, Sort Order + Active toggle, Save/Cancel buttons
- **Right column (40%)**: Live preview panel showing banner at correct aspect ratio with title/subtitle overlay, updating in real-time as user types

### 3. Position Dropdown with Presets
```typescript
const POSITION_OPTIONS = [
  { value: 'hero', label: 'Hero Banner', dimensions: '1920×600px', ratio: '16/5' },
  { value: 'promotional', label: 'Promotional Strip', dimensions: '1920×200px', ratio: '48/5' },
  { value: 'category', label: 'Category Banner', dimensions: '800×400px', ratio: '2/1' },
];
```
- Select component; selected option shows recommended dimensions
- ImageUpload `aspectHint` updates dynamically based on position

### 4. Smart Click Destination (replaces Link URL free-text)
- Radio group: None / Category / Flash Deals / All Categories / Custom URL
- "Category" → fetches depth=0 categories, shows dropdown, auto-generates `https://ucogold.com/category/{slug}`
- "Flash Deals" → auto-sets `https://ucogold.com/flash-deals`
- "Custom URL" → shows text input
- "None" → sets `link_url` to null
- Resolved URL saved to existing `link_url` column

### 5. Soft Delete with AlertDialog Confirmation
- Deactivate button triggers AlertDialog: "Deactivate this banner? It will be hidden from the E-Mall."
- Sets `is_active = false`
- Inactive banners show Reactivate button (sets `is_active = true`)

### 6. Schedule Date Pickers
- Two optional date pickers (starts_at, ends_at) using Popover + Calendar
- Saved to existing `starts_at` / `ends_at` columns
- Include in save payload

### 7. Live Preview Panel
- Right side of dialog
- Shows image at position-appropriate aspect ratio
- Overlays title + subtitle text
- Updates in real-time as form fields change
- Labels: "Desktop Preview"

### 8. Image Upload Hint
- Below upload area: "Use a professional marketing banner image, not a product screenshot"
- Dynamic dimensions hint based on selected position

## No database changes needed
The `banners` table already has: `title`, `subtitle`, `image_url`, `link_url`, `position`, `sort_order`, `starts_at`, `ends_at`, `is_active`.

## Files modified
- `src/pages/BannerList.tsx` (full rewrite)

