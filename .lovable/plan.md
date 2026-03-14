

# Upgrade CRM Reset Password Page

## Current State
`src/pages/ResetPassword.tsx` exists with a basic implementation — no state machine, no strength indicators, no CRM branding, no timeout/error handling. Route already exists in `App.tsx`.

## Changes

### Rewrite `src/pages/ResetPassword.tsx`

Replace with a 4-state machine (`loading` → `ready` → `success` → `error`):

- **loading**: Spinner + "Verifying your reset link..." — auto-fails after 5s if no session/recovery event
- **ready**: Password form with CRM navy branding (IKON logo, "CRM Admin" badge matching Login page), live strength checklist (8+ chars, uppercase, lowercase, number, special char), passwords-match indicator, visibility toggle
- **success**: Green CheckCircle, "Password Updated!", auto-redirect to `/login` after 3s with fallback link
- **error**: Red AlertCircle, "Reset Link Expired", button to go back to `/login`

Session detection: `onAuthStateChange` for `PASSWORD_RECOVERY` event + fallback `getSession()` check, with 5s timeout to error state.

On submit: `updateUser({ password })` → sign out → success state → redirect.

### No other file changes needed
- Route `/reset-password` already exists in `App.tsx` outside `ProtectedRoute`
- No DB changes required

