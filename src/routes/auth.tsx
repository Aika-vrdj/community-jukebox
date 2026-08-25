import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — community.fm" },
      {
        name: "description",
        content: "Sign in with Discord to create playlists, add songs and vote on community.fm.",
      },
      { property: "og:title", content: "Sign in — community.fm" },
      { property: "og:description", content: "Sign in with Discord to build community playlists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/library" });
  }, [user, navigate]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 pb-40 pt-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in with Discord to create playlists, add songs and vote.
      </p>
      <button
        onClick={() => void signIn()}
        disabled={busy}
        className="mt-8 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Continue with Discord"}
      </button>
      <p className="mt-6 text-xs text-muted-foreground">
        Listening never requires an account — public playlists are open to everyone.
      </p>
    </div>
  );
}
