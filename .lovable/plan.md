

# Sub-Category Support: Tree View, Hierarchical Dropdowns, Breadcrumb Paths

## Overview
Three coordinated changes to support the existing parent-child category hierarchy across the CRM.

## Task 1: Rewrite `src/pages/CategoryList.tsx` — Collapsible Tree View

**Query**: Fetch categories with joins to `product_groups` and parent categories, plus child_count via a subquery or client-side grouping.

**UI structure**:
- Group by `product_groups` — render group headers (bold, muted background)
- Under each group, show depth=0 categories as expandable rows (ChevronRight/ChevronDown toggle)
- Clicking chevron reveals indented depth=1 sub-categories beneath
- State: `expandedIds: Set<string>` tracking which parent categories are open
- Each row: Name (indented for subs) | Slug | Product Count | Active ✓/— | Sort Order | Edit button

**Add/Edit dialog updates**:
- Add `group_id` dropdown (product_groups)
- Add `parent_id` dropdown (only depth=0 categories, filtered)
- Add `image_url` field (text input)
- Auto-set `depth` based on `parent_id` presence (0 if null, 1 if set)
- On save, include `group_id`, `parent_id`, `depth`, `image_url`
- When editing a category with children, disable parent_id field (prevent making it a sub-category)
- Delete validation: if category has sub-categories, show warning toast and block delete

**Client-side tree building**:
```
1. Group categories by group_id
2. Within each group, separate depth=0 (parents) and depth=1 (children)
3. Render: GroupHeader → [ParentRow → [ChildRow, ChildRow], ParentRow → [...]]
```

## Task 2: Update `src/pages/ProductEdit.tsx` — Hierarchical Category Dropdown (lines 49-55, 380-389)

**Query change**: Fetch `id, name, depth, parent_id` from categories where `is_active = true`, ordered by `depth, name`.

**Dropdown rendering**: Replace flat `SelectItem` list with grouped display:
- depth=0 categories that have children → render as bold disabled labels (using a div or SelectLabel)
- depth=1 categories → render as indented selectable `SelectItem` with `pl-6`
- depth=0 categories with NO children → render as selectable `SelectItem` (no indent)

## Task 3: Update `src/pages/ProductList.tsx` — Category Breadcrumb Column

**Query change** (line 27): Add `category_id` to select, then use a separate categories query (or join via a view). Since Supabase JS client doesn't support arbitrary joins, fetch all categories once and build a lookup map client-side.

**Approach**:
- Add a `useQuery` for categories: `id, name, parent_id`
- Build a map: `categoryId → { name, parentName }`
- Add a "Category" column to the table
- Display: `parentName > categoryName` if parent exists, else just `categoryName`

## Files to modify

| File | Changes |
|------|---------|
| `src/pages/CategoryList.tsx` | Full rewrite — tree view with groups, collapsible parents, enhanced dialog |
| `src/pages/ProductEdit.tsx` | Update categories query and dropdown rendering (~20 lines) |
| `src/pages/ProductList.tsx` | Add categories lookup query, add Category column to table |

No database changes needed.

