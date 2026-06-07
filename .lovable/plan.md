# CRM Genericization — Template v1.0

Mirror of storefront genericization. All identity strings funnel through a single `BRAND` token (shape locked to the storefront's); logo/favicon become neutral placeholders; Edge Functions read brand/host from env vars. No functional, RBAC, RLS, or migration changes.

## 1. Brand token module

Create `src/config/brand.ts` with the exact same shape as the storefront's `brand.ts` — literal `{TOKEN}` placeholders everywhere so unpopulated fields are visible during onboarding, and every social key both repos might use is present (each repo reads what it needs, ignores the rest):

```ts
export const BRAND = {
  name: "{BRAND_NAME}",
  address: "{BRAND_ADDRESS}",
  phone: "{BRAND_PHONE}",
  email: "{BRAND_EMAIL}",
  storefrontHost: "{STOREFRONT_HOST}",
  socials: {
    facebook: "{FACEBOOK_URL}",
    instagram: "{INSTAGRAM_URL}",
    messenger: "{MESSENGER_URL}",
    linkedin: "{LINKEDIN_URL}",
  },
  trustPillars: ["{TRUST_PILLAR_1}", "{TRUST_PILLAR_2}", "{TRUST_PILLAR_3}"] as const,
  promises: ["{PROMISE_1}", "{PROMISE_2}", "{PROMISE_3}"] as const,
};
export const TEMPLATE = { version: "1.0", family: "myanmar-horeca-b2b" };
```

Onboarding a client edits this one file and its twin in the storefront — identical shapes, single config source can write both.

## 2. Logo + favicon swap

- Add `src/assets/brand-logo-placeholder.svg` (neutral 200×60, identical to storefront).
- Add `public/favicon.svg` (neutral grey 32×32, identical to storefront).
- `index.html` → `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`; drop the `/favicon.png` references from og:image / twitter:image.
- Leave existing `public/favicon.ico`, `public/favicon.png`, `src/assets/ikon-logo.png` in place; flagged in `TEMPLATE.md` as optional cleanup.

## 3. Replace logo imports (3 files)

Discovered via `rg import.*[Ll]ogo`:

- `src/components/AdminSidebar.tsx` — swap `ikon-logo.png` import → `brand-logo-placeholder.svg`; replace hard-coded `"IKON"` text and alt with `BRAND.name`.
- `src/pages/Login.tsx` — same swap; "IKON MART" heading → `BRAND.name.toUpperCase()`; alt → `BRAND.name`.
- `src/pages/ResetPassword.tsx` — same swap; same heading replacement.

## 4. UI text scrub

Discovered files (full list from `rg -i 'ikon|ikonmart|ucogold'`):

| File | Change |
|---|---|
| `index.html` | `<title>`, meta description, author, og:title/description, twitter:title/description/site → `{BRAND_NAME}` literal placeholders (static HTML, no JS imports). |
| `src/pages/Dashboard.tsx` | `"IKON Mart CRM · ..."` → `` `${BRAND.name} CRM · ...` `` |
| `src/pages/Settings.tsx` | `defaultValue="IKON"` → `defaultValue={BRAND.name}` |
| `src/pages/ContactInquiries.tsx` | `"ikonmart.com Contact Us form"` → `` `${BRAND.name} Contact Us form` `` |
| `src/pages/CustomerList.tsx` | filename `ikon_customers_...csv` → `` `${BRAND.name.toLowerCase()}_customers_...csv` `` |
| `src/pages/RiskRevenue.tsx` | placeholder `"IKON-..."` → generic `"Order #..."` |
| `src/pages/ArticleEditor.tsx` | Keep the preview block; replace `"ucogold.com/articles/..."` → `` `${BRAND.storefrontHost}/articles/${slug || "..."}` `` so the public-URL preview survives and reads cleanly even with `{STOREFRONT_HOST}` unpopulated. |
| `src/pages/BannerList.tsx` | `const BASE_URL = "https://ucogold.com"` → `const BASE_URL = BRAND.storefrontHost;` |
| `src/components/orders/PackingSlipWindow.tsx` | `<h1>IKON Mart</h1>` → `{BRAND.name}` |
| `src/components/AdminSidebar.tsx`, `src/pages/Login.tsx`, `src/pages/ResetPassword.tsx` | covered in §3 |

No `document.title` calls or toast strings reference IKON in the current grep — nothing extra to scrub there.

## 5. Edge Function scrub

- `supabase/functions/send-order-email/index.ts`:
  `from: "IKON Mart <orders@ikonmart.com>"` →
  `` `${Deno.env.get('BRAND_NAME') ?? '{BRAND_NAME}'} <${Deno.env.get('BRAND_FROM_EMAIL') ?? '{BRAND_FROM_EMAIL}'}>` ``
- `supabase/functions/invite-staff/index.ts` and `supabase/functions/manage-staff/index.ts`:
  Replace `https://ikoncrm.lovable.app/reset-password` →
  `` `${Deno.env.get('CRM_HOST') ?? '{CRM_HOST}'}/reset-password` ``.
  Neither function composes brand-labeled subject/body text, so only the host needs scrubbing.
- No other functions in `supabase/functions/` emit brand text.

Required Edge Function secrets on the shared Supabase project (called out in `TEMPLATE.md`, not added by Lovable): `BRAND_NAME`, `BRAND_FROM_EMAIL`, `CRM_HOST`.

## 6. Database

No CRM-only UPDATEs scheduled. Storefront genericization already covers shared tables. If `communication_templates` later turns out to hold CRM-specific rows (staff_invite, password_reset), scrub those in a follow-up.

## 7. Versioning artifact

- `TEMPLATE` constant lives in `brand.ts` (§1).
- Add `TEMPLATE.md` at repo root: version table (v1.0 — Initial genericization from IKON Mart CRM), cross-link to storefront `TEMPLATE.md`, notes on unused IKON assets, opaque `text-ikon-*` Tailwind tokens, and the required Edge Function secrets.

## 8. Verification

```text
rg -i 'ikon mart|ikonmart|ucogold|mingalardon|kempinski|novotel|cci france|89009 0301|since 1995|160\+ brands' \
   --glob '!supabase/migrations/**' --glob '!docs/build-screenshots/**' \
   --glob '!src/config/brand.ts' src/ index.html public/ supabase/functions/
```

Expected: zero matches. Smoke-check Login, Sidebar, Reset Password, Dashboard, Article Editor preview — all should render `{BRAND_NAME}` / `{STOREFRONT_HOST}` placeholders.

## Out of scope

Module names, permission slugs, `activity_log` history, RPCs/RLS/triggers, `text-ikon-*` Tailwind tokens (opaque, documented), `supabase/migrations/**`, leftover `ikon-logo.png` / `favicon.png` files.

## Lockstep

Must ship together with the storefront commit. `BRAND_NAME` / `BRAND_FROM_EMAIL` / `CRM_HOST` must exist in the shared Supabase project's Edge Function secrets at the same time both repos deploy.
