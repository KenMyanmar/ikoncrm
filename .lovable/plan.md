

# Add Features Field to ProductEdit

## Changes — `src/pages/ProductEdit.tsx`

### 1. Add `features` to save payload (line ~115, after `datasheet_url`)
Add `features: form.features || null,` to the update object.

### 2. Add Features textarea (between lines 359-361, after Short Description, before Long Description)
```tsx
<div>
  <Label className="text-xs">Features</Label>
  <Textarea
    value={form.features || ""}
    onChange={(e) => update("features", e.target.value)}
    rows={5}
    placeholder={"100% Cotton with long staple fiber\nMachine washable\nGreat for Hotels and Spas"}
  />
  <p className="text-xs text-muted-foreground mt-1">One feature per line. Displays as bullet points on E-Mall.</p>
</div>
```

No other files or DB changes needed — `features` is already in the products table and already loaded via `setForm(product)`.

