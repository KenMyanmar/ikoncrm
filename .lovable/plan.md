

# Add Forgot Password + Fix Recovery Redirect

## Overview
Three changes: add forgot password flow to Login page, intercept PASSWORD_RECOVERY in StaffContext to redirect to /reset-password, and improve ResetPassword.tsx session detection.

## File Changes

### 1. `src/pages/Login.tsx` — Add Forgot Password Flow
- Add states: `showForgotPassword`, `resetEmail`, `resetSent`, `resetLoading`
- When `showForgotPassword` is false: show existing login form + add right-aligned "Forgot Password?" link between password field and Sign In button
- When `showForgotPassword` is true: replace form with reset email input, "Send Reset Link" button calling `supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: \`${window.location.origin}/reset-password\` })`, success state with checkmark, and "Back to Login" link
- Pre-fill `resetEmail` from the login `email` state
- Keep same card/logo/badge styling

### 2. `src/contexts/StaffContext.tsx` — Intercept PASSWORD_RECOVERY
- In the `useEffect` (line 144), add early URL hash check before `getSession`:
  ```
  if hash includes "type=recovery" and pathname !== "/reset-password"
    → window.location.href = "/reset-password" + hash; return cleanup
  ```
- In `onAuthStateChange` callback (line 166), add at top:
  ```
  if (event === "PASSWORD_RECOVERY") {
    if (window.location.pathname !== "/reset-password") {
      window.location.href = "/reset-password";
    }
    return;
  }
  ```
  This prevents the normal login flow from kicking in and redirecting to dashboard.

### 3. `src/pages/ResetPassword.tsx` — Improve Session Detection
- Update the `useEffect` init logic: delay `init()` by 500ms to let auth state change fire first
- Extend timeout to 8s for hash-based recovery URLs
- If no hash and no session, immediately show error (don't wait 5s)

