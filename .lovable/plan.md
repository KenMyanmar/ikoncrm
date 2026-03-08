

# Settings Page — World-Class Profile & Settings

Transform the placeholder Settings page into a comprehensive profile and system settings page, similar to Google Admin / Workspace or enterprise CRM settings panels.

## Sections

### 1. My Profile (top section)
- Large avatar with initials (+ future upload), full name, email, role badge, department
- "Edit Profile" mode to update full_name and department (saves to `staff_profiles`)
- "Change Password" button that calls `supabase.auth.updateUser({ password })`
- Last login timestamp display

### 2. Appearance
- Theme toggle (light/dark) using `next-themes` (already installed)
- Compact/comfortable density toggle (stored in localStorage)

### 3. Security (visible to all staff for their own account)
- Change own password form (current password + new password + confirm)
- Active sessions info (last login)

### 4. System Settings (super_admin only)
- Company name / app title (stored in a `settings` key-value approach via localStorage for now, or a simple Supabase table later)
- Default currency display
- Placeholder sections for future: Email templates, Notification preferences

## Layout
- Left sidebar tabs (vertical) on desktop: Profile, Appearance, Security, System
- Stacked cards on mobile
- Clean Google-style spacing with section headers and descriptions

## Files

| File | Action |
|---|---|
| `src/pages/Settings.tsx` | Rewrite — full settings page with tabs |

## Technical Notes
- Uses existing `useStaff()` context for profile data
- Profile updates go directly to `staff_profiles` table via Supabase
- Password change uses `supabase.auth.updateUser()`
- Theme switching via `next-themes` ThemeProvider (needs adding to App.tsx)
- No new database tables required — profile edits use existing `staff_profiles`

