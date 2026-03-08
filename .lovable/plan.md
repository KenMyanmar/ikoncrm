

# Fix: Slow Dashboard Load After Login

## Root Causes
1. `fetchStaffProfile` has no `.catch()` — if the Supabase query fails, `loading` stays `true` forever → infinite spinner
2. Both `getSession()` and `onAuthStateChange` call `fetchStaffProfile` simultaneously on login → redundant queries that race each other
3. Dashboard queries fire without waiting for staff context to be ready

## Changes

### `src/contexts/StaffContext.tsx`
- Add `.catch()` to `fetchStaffProfile` so `loading` always resolves to `false`
- Use a ref flag (`profileFetched`) to deduplicate — skip the second call if one is already in flight
- Add error logging for debugging

```typescript
const fetchStaffProfile = (userId: string) => {
  supabase
    .from("staff_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) console.error("Staff profile fetch error:", error);
      setStaff(data as StaffProfile | null);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Staff profile fetch failed:", err);
      setStaff(null);
      setLoading(false);
    });
};
```

- In `useEffect`, use `setTimeout(..., 0)` wrapper for `onAuthStateChange` fetch to let `getSession` take priority and avoid racing:

```typescript
useEffect(() => {
  let isMounted = true;
  let profileLoaded = false;

  const loadProfile = (userId: string) => {
    if (profileLoaded) return;
    profileLoaded = true;
    fetchStaffProfile(userId);  // with error handling
  };

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!isMounted) return;
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    if (currentUser) {
      loadProfile(currentUser.id);
    } else {
      setLoading(false);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setStaff(null);
        setLoading(false);
        profileLoaded = false; // reset for next login
      }
    }
  );

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### `src/pages/Dashboard.tsx`
- Add `enabled: !!staff` to all React Query hooks so they don't fire until staff context is ready (avoids RLS failures on queries that need an authenticated session to be fully established):

```typescript
const { data: productCount } = useQuery({
  queryKey: ["dashboard-products"],
  queryFn: async () => { ... },
  enabled: !!staff,
});
```

Apply this to all 5 queries in Dashboard.

## Summary
- 2 files modified: `StaffContext.tsx`, `Dashboard.tsx`
- Fixes infinite spinner on error, eliminates duplicate fetches, ensures Dashboard queries only fire after auth is ready

