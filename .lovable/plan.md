

# Fix: Password Reset Email Redirects to localhost

## Problem
When a new staff member clicks the password reset link in their email, they're sent to `localhost:3000` instead of your live app. This happens because:

1. The `redirectTo` in the invite function points to the Supabase URL (not the app)
2. Supabase's default site URL is likely still set to `localhost:3000`

## Fix

### 1. Update `supabase/functions/invite-staff/index.ts`
Change the `redirectTo` on line 161 from the Supabase URL to your published app URL:
```
redirectTo: "https://ikoncrm.lovable.app"
```

### 2. Update `supabase/functions/manage-staff/index.ts`
Same fix for the `send_reset_email` action — ensure it also uses the published URL.

### 3. Configure Supabase Auth Settings (manual step)
In your Supabase dashboard under **Authentication > URL Configuration**:
- Set **Site URL** to `https://ikoncrm.lovable.app`
- Add `https://ikoncrm.lovable.app` to **Redirect URLs**

This tells Supabase to allow redirects to your app domain.

### 4. Add a password reset page
Your app needs a route (e.g., `/reset-password`) that reads the token from the URL hash and lets the user set a new password. Currently there's no such page — the user would land on your app but have no way to actually set their password.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/invite-staff/index.ts` | Fix `redirectTo` URL |
| `supabase/functions/manage-staff/index.ts` | Fix `redirectTo` URL in send_reset_email |
| `src/pages/ResetPassword.tsx` | Create — new page to handle password reset token |
| `src/App.tsx` | Add `/reset-password` route |

