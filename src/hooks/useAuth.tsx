import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AUTH_DISABLED } from "@/lib/auth-config";

let guestSignInPromise: Promise<unknown> | null = null;

function ensureGuestSession() {
  guestSignInPromise ??= supabase.auth.signInAnonymously();
  return guestSignInPromise;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session && AUTH_DISABLED) {
        await ensureGuestSession();
        const { data: next } = await supabase.auth.getSession();
        if (!active) return;
        setSession(next.session);
        setLoading(false);
        return;
      }
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading };
}


export function displayNameOf(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  return (
    (meta["full_name"] as string) ??
    (meta["name"] as string) ??
    (meta["user_name"] as string) ??
    user.email ??
    "Member"
  );
}
