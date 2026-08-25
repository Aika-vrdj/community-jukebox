import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { PlaylistCard } from "@/components/PlaylistCard";
import { usePlayer } from "@/components/player/PlayerProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlaylistSongs, fetchPublicPlaylists, fetchRecentSongs } from "@/lib/playlists";
import { formatTime } from "@/lib/youtube";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "community.fm — Community playlists, played as audio" },
      {
        name: "description",
        content:
          "Build and share community music playlists from YouTube links. Vote on playlists and listen back-to-back in a persistent audio player.",
      },
      { property: "og:title", content: "community.fm — Community playlists" },
      {
        property: "og:description",
        content: "Community-built YouTube playlists that play back-to-back as audio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playQueue } = usePlayer();

  const recent = useQuery({ queryKey: ["recent-songs"], queryFn: () => fetchRecentSongs(12) });
  const playlists = useQuery({
    queryKey: ["public-playlists", user?.id ?? null],
    queryFn: () => fetchPublicPlaylists(user?.id),
  });

  useEffect(() => {
    const channel = supabase
      .channel("home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_songs" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["recent-songs"] });
        void queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_votes" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-40 pt-10 sm:px-6">
      <section className="mb-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Playlists, built by the community.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Drop a YouTube link, it becomes a track. Hit play and the whole playlist runs
          back-to-back — audio only, no clicking next.
        </p>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Recently added songs
        </h2>
        {recent.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recent.data?.length ? (
          <ul className="divide-y divide-border">
            {recent.data.map((song) => (
              <li key={song.id} className="flex items-center gap-3 py-3">
                <img
                  src={song.thumbnail_url ?? ""}
                  alt=""
                  loading="lazy"
                  className="h-10 w-16 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{song.title}</p>
                  <Link
                    to="/playlist/$playlistId"
                    params={{ playlistId: song.playlist_id }}
                    className="text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    {song.playlist_name}
                  </Link>
                </div>
                <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                  {song.duration_seconds ? formatTime(song.duration_seconds) : "--:--"}
                </span>
                <button
                  onClick={() =>
                    void fetchPlaylistSongs(song.playlist_id).then((songs) => {
                      const start = Math.max(
                        0,
                        songs.findIndex((s) => s.id === song.id),
                      );
                      playQueue(songs, song.playlist_name, start);
                    })
                  }
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Play
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No songs yet — be the first to add one.</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Most voted playlists
        </h2>
        {playlists.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : playlists.data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.data.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No public playlists yet.{" "}
            <Link to="/library" className="text-primary hover:underline">
              Create one
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
