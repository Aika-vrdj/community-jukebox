# Temporary: no-login testing mode

Goal: browse and use the whole app without signing in, with everything still writing to the real database. Reversible with one flag.

## How it works

- Turn on anonymous sign-in in the backend.
- On app load, if there's no session, silently create an anonymous one. Every visitor becomes a real (throwaway) user, so playlists, songs and votes all save normally.
- The sign-in page and header sign-in button are bypassed while the flag is on; `/library` no longer redirects to `/auth`.
- The header shows "Guest (test mode)" instead of a Discord name.

## The flag

A single constant `AUTH_DISABLED` in a small config file. Flip it to `false` later and the Discord/Google login flow returns exactly as it is now — no other code changes needed.

## Technical details

- Backend: enable `external_anonymous_users_enabled` via auth config.
- `src/hooks/useAuth.tsx`: when `AUTH_DISABLED` and `getSession()` returns null, call `supabase.auth.signInAnonymously()` once (guarded so it runs a single time per tab), then continue with the normal `onAuthStateChange` flow.
- `src/routes/auth.tsx`: when the flag is on, redirect to `/library` rather than showing the Discord button.
- `src/routes/library.tsx`: existing `!user` redirect stays but never fires since an anonymous session always exists.
- `src/components/SiteHeader.tsx`: hide the sign-out control and show a "test mode" label while the flag is on.
- No RLS/policy changes — anonymous users are authenticated users to Postgres, so existing `auth.uid()` policies keep working.

## Before launch

Flip `AUTH_DISABLED` to `false`, disable anonymous sign-in in the backend, and clean up any test rows created by anonymous accounts.
