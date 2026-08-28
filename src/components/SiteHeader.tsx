import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { displayNameOf, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_DISABLED } from "@/lib/auth-config";

export function SiteHeader() {
  const { user } = useAuth();


  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
          rebel radio<span className="text-primary">.community</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 text-foreground bg-secondary" }}
            activeOptions={{ exact: true }}
          >
            Home
          </Link>
          <Link
            to="/library"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 text-foreground bg-secondary" }}
          >
            My playlists
          </Link>
          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <span className="hidden max-w-32 truncate text-xs text-muted-foreground sm:block">
                {displayNameOf(user)}
              </span>
              <button
                aria-label="Sign out"
                onClick={() => void supabase.auth.signOut()}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="ml-2 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}

        </nav>
      </div>
    </header>
  );
}
