# CRM Admin Template — v1.0

Family: `myanmar-horeca-b2b` · Companion to the storefront [TEMPLATE.md](https://github.com/) (see storefront repo).

This repo is a neutral B2B admin template. All client identity flows through `src/config/brand.ts` and Edge Function secrets.

## Onboarding a new client

1. Edit `src/config/brand.ts` — replace every `{TOKEN}` literal with client values. Shape is locked to the storefront's `brand.ts`; edit both files from one config source.
2. Replace `public/favicon.svg` and `src/assets/brand-logo-placeholder.svg` with client artwork (keep filenames).
3. Update `index.html` `{BRAND_NAME}` placeholders (static HTML, no JS imports here).
4. Set Edge Function secrets on the shared Supabase project:
   - `BRAND_NAME` — display name used in transactional email "from"
   - `BRAND_FROM_EMAIL` — sender address for transactional email
   - `CRM_HOST` — full origin (e.g. `https://crm.example.com`) used for password-reset redirect
5. Same `BRAND_NAME` must be set for the storefront's Edge Functions too — single Supabase project, shared secrets.

## Version history

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-06-07 | Initial genericization from IKON Mart CRM. |

## Known leftovers (optional cleanup)

- `src/assets/ikon-logo.png`, `public/favicon.ico`, `public/favicon.png` — legacy IKON assets, no longer referenced. Safe to delete per client.
- Tailwind `text-ikon-*` / `bg-ikon-*` tokens — opaque class names, treated as design-system primitives. Rename only if a client requests a token rename pass.
- `supabase/migrations/**` — historical, never edited.
- `activity_log` table rows — immutable audit history, not scrubbed.

## Verification

```bash
rg -i 'ikon mart|ikonmart|ucogold|mingalardon|kempinski|novotel|cci france|89009 0301|since 1995|160\+ brands' \
   --glob '!supabase/migrations/**' --glob '!docs/build-screenshots/**' \
   --glob '!src/config/brand.ts' src/ index.html public/ supabase/functions/
```

Expected: zero matches.