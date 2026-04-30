# Add Contact Inquiries Page

## Summary
New CRM page that lists submissions from the ikonmart.com Contact Us form. Table, RLS, and authenticated SELECT policy already exist — no DB changes.

## Schema reconciliation (verified against live DB)
The actual `contact_inquiries` table differs from the original prompt:
- No `subject` column
- Has `phone` (text, nullable), `business_type` (text[], not null), `inquiry_type` (text[], not null)
- `message` is nullable

UI will reflect the actual schema.

Columns shown in table:
- Created (relative time, absolute on hover via `title`)
- Name
- Email (mailto link)
- Phone (tel link, if present)
- Company (— if null)
- Inquiry Type (badges from array)
- Business Type (badges from array)
- Message (truncated, click row to expand)

## File 1: `src/pages/ContactInquiries.tsx` (NEW)
- React Query: `useQuery(["contact-inquiries"], …)` selecting `*` from `contact_inquiries` ordered by `created_at desc`
- Header: title "Contact Inquiries", subtitle, total count badge, Refresh button
- Search input: client-side filter across name / email / company / message
- Table layout matching `OrderList` / `QuoteList` styling (Card wrapper, Table, Skeleton loader, empty state)
- Click row opens Dialog showing full details (all fields, formatted arrays, full message, copy-email button)
- Loading: skeleton rows; Error: toast

## File 2: `src/App.tsx` (MODIFY)
- Import `ContactInquiries`
- Add route inside protected `AdminLayout`:
  `<Route path="inquiries" element={<ProtectedRoute module="customers"><ContactInquiries /></ProtectedRoute>} />`

## File 3: `src/components/AdminSidebar.tsx` (MODIFY)
- Add `Mail` to the `lucide-react` import
- Insert into the **Sales** nav group, after Reviews:
  `{ title: "Inquiries", url: "/inquiries", icon: Mail, module: "customers" },`

## No database changes
- Table exists with RLS enabled (public INSERT + authenticated SELECT)
- `contact_inquiries` already present in generated `types.ts`

## Files NOT changed
- Anything else
