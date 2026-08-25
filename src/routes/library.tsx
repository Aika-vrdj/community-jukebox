import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Playlist } from "@/lib/playlists";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "My playlists — community.fm" },
      {
        name: "description",
        content: "Create, share and manage your own community.fm playlists of YouTube tracks.",
      },
      { property: "og:title", content: "My playlists — community.fm" },
      { property: "og:description", content: "Create and manage your community.fm playlists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const playlists = useQuery({
    queryKey: ["my-playlists", user?.id ?? null],
    enabled: Boolean(user),
    queryFn: async (): Promise<Playlist[]> => {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Playlist[];
    },
  });

  async function createPlaylist() {
    if (!user || !name.trim()) return;
    const { error } = await supabase
      .from("playlists")
      .insert({ name: name.trim(), owner_id: user.id, is_public: isPublic });
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    void queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
    void queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
  }

  async function update(id: string, patch: Partial<Playlist>) {
    const { error } = await supabase.from("playlists").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    void queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
    void queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) toast.error(error.message);
    void queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
    void queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 pt-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">My playlists</h1>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="accent-primary"
          />
          Anyone can add songs
        </label>
        <button
          onClick={() => void createPlaylist()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Create
        </button>
      </div>

      <ul className="mt-8 divide-y divide-border">
        {(playlists.data ?? []).map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <Link
              to="/playlist/$playlistId"
              params={{ playlistId: p.id }}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.is_public ? "Public — anyone can add songs" : "Private — only you can add songs"}
                {p.is_hidden ? " · hidden" : ""}
              </p>
            </Link>
            <button
              onClick={() => void update(p.id, { is_public: !p.is_public })}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {p.is_public ? "Make private" : "Make public"}
            </button>
            <button
              onClick={() => void update(p.id, { is_hidden: !p.is_hidden })}
              aria-label={p.is_hidden ? "Unhide playlist" : "Hide playlist"}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {p.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => void remove(p.id)}
              aria-label="Delete playlist"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {playlists.data?.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">
            No playlists yet — create your first one above.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
