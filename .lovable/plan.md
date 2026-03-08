

# Google Workspace-Style Super Admin Controls

Like a Google Workspace domain admin, the super admin needs full control over staff accounts: reset passwords, force sign-out, suspend/reactivate, and delete accounts — all from the admin panel.

## What Google Workspace Admins Can Do (and what we'll build)

| Capability | Implementation |
|---|---|
| **Reset user password** | Edge function calls `auth.admin.updateUserById(id, { password })` |
| **Send password reset email** | Edge function calls `auth.resetPasswordForEmail(email)` |
| **Force sign out** | Edge function calls `auth.admin.updateUserById(id, { ban_duration: '0s' })` — effectively invalidates sessions |
| **Suspend account** | Already exists (is_active toggle) — enhance to also ban auth user |
| **Delete staff account** | Edge function calls `auth.admin.deleteUser(id)` + removes staff_profiles row |
| **Require password change on next login** | Set user metadata flag, check on login |

## Changes

### 1. New Edge Function: `supabase/functions/manage-staff/index.ts`
A single edge function handling multiple admin actions via an `action` field:

- **`reset_password`** — Super admin sets a new password directly for any staff member (like Google admin "Reset password" button). Returns the new password to show once.
- **`send_reset_email`** — Sends password reset email to the staff member's inbox
- **`force_signout`** — Invalidates all sessions for that user
- **`suspend`** — Bans the auth user + sets `is_active = false`
- **`unsuspend`** — Unbans + sets `is_active = true`
- **`delete`** — Deletes auth user + staff_profiles row permanently

All actions validate caller is super_admin (or admin for some actions) via JWT + staff_profiles lookup.

### 2. Update `StaffDetailSheet.tsx`
Add an "Admin Actions" section (visible only to super_admin) with:

- **Reset Password** button → opens a dialog where admin can either:
  - Auto-generate a random password (shown once, copyable)
  - Type a custom password
  - Or just send a reset email to the user
- **Force Sign Out** button — immediately signs out the staff member from all devices
- **Suspend / Unsuspend** toggle — replaces the basic is_active switch with proper auth-level suspension
- **Delete Account** button — in a danger zone with double-confirmation dialog

### 3. New Component: `ResetPasswordDialog.tsx`
Dialog with two tabs:
- **Set Password**: auto-generate or type custom password, with copy-to-clipboard
- **Send Reset Email**: one-click to send password reset link to their email

### 4. New Component: `DeleteStaffDialog.tsx`
Confirmation dialog requiring the admin to type the staff member's name to confirm deletion (like GitHub repo deletion pattern).

## Files

| File | Action |
|---|---|
| `supabase/functions/manage-staff/index.ts` | Create — multi-action edge function |
| `src/components/StaffDetailSheet.tsx` | Update — add Admin Actions section |
| `src/components/ResetPasswordDialog.tsx` | Create — password reset dialog |
| `src/components/DeleteStaffDialog.tsx` | Create — deletion confirmation dialog |
| `supabase/config.toml` | Update — add manage-staff function config |

## Security
- All actions require super_admin role (verified server-side via JWT → staff_profiles lookup)
- Service role key used only server-side in edge function
- Password is shown once and never stored/logged
- Delete requires name confirmation to prevent accidents

