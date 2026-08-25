import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { usePlayer } from "@/components/player/PlayerProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlaylistSongs, type Playlist } from "@/lib/playlists";
import { extractVideoId, formatTime } from "@/lib/youtube";
import { fetchVideoMeta } from "@/lib/youtube.functions";

export const Route = createFileRoute("/playlist/$playlistId")({
  head: () => ({
    meta: [
      { title: "Playlist — community.fm" },
      {
        name: "description",
        content: "Listen to this community playlist back-to-back and add your own YouTube tracks.",
      },
      { property: "og:title", content: "Playlist — community.fm" },
      {
        property: "og:description",
        content: "A community playlist that plays back-to-back as audio.",
      },
      { property: "og:type", content: "music.playlist" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { playlistId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playQueue } = usePlayer();
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const playlist = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: async (): Promise<Playlist | null> => {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", playlistId)
        .maybeSingle();
      if (error) throw error;
      return (data as Playlist) ?? null;
    },
  });

  const songs = useQuery({
    queryKey: ["playlist-songs", playlistId],
    queryFn: () => fetchPlaylistSongs(playlistId),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`playlist-${playlistId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playlist_songs", filter: `playlist_id=eq.${playlistId}` },
        () => void queryClient.invalidateQueries({ queryKey: ["playlist-songs", playlistId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [playlistId, queryClient]);

  const canAdd = Boolean(
    user && playlist.data && (playlist.data.is_public || playlist.data.owner_id === user.id),
  );

  async function addSong() {
    if (!user) return;
    const videoId = extractVideoId(url);
    if (!videoId) {
      toast.error("That doesn't look like a YouTube link.");
      return;
    }
    setAdding(true);
    try {
      const meta = await fetchVideoMeta({ data: { videoId } });
      const { error } = await supabase.from("playlist_songs").insert({
        playlist_id: playlistId,
        youtube_video_id: meta.youtube_video_id,
        title: meta.title,
        thumbnail_url: meta.thumbnail_url,
        duration_seconds: meta.duration_seconds,
        added_by: user.id,
      });
      if (error) throw error;
      setUrl("");
      void queryClient.invalidateQueries({ queryKey: ["playlist-songs", playlistId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that song.");
    } finally {
      setAdding(false);
    }
  }

  async function removeSong(id: string) {
    const { error } = await supabase.from("playlist_songs").delete().eq("id", id);
    if (error) toast.error(error.message);
    void queryClient.invalidateQueries({ queryKey: ["playlist-songs", playlistId] });
  }

  if (playlist.isLoading) {
    return <p className="mx-auto max-w-3xl px-4 pt-10 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!playlist.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-40 pt-16">
        <h1 className="text-xl font-semibold text-foreground">Playlist unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted or hidden by its owner.
        </p>
      </div>
    );
  }

  const list = songs.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 pt-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {playlist.data.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {list.length} {list.length === 1 ? "song" : "songs"} ·{" "}
            {playlist.data.is_public ? "anyone can add songs" : "only the owner can add songs"}
          </p>
        </div>
        <button
          onClick={() => {
            if (list.length === 0) {
              toast.message("This playlist is empty.");
              return;
            }
            playQueue(list, playlist.data!.name, 0);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Play className="h-4 w-4" /> Play all
        </button>
      </div>

      {canAdd ? (
        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube link"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={() => void addSong()}
            disabled={adding}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add song"}
          </button>
        </div>
      ) : null}

      <ul className="mt-8 divide-y divide-border">
        {list.map((song, i) => (
          <li key={song.id} className="group flex items-center gap-3 py-3">
            <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            <img
              src={song.thumbnail_url ?? ""}
              alt=""
              loading="lazy"
              className="h-10 w-16 shrink-0 rounded object-cover"
            />
            <button
              onClick={() => playQueue(list, playlist.data!.name, i)}
              className="min-w-0 flex-1 truncate text-left text-sm text-foreground transition-colors hover:text-primary"
            >
              {song.title}
            </button>
            <span className="hidden font-mono text-xs text-muted-foreground sm:block">
              {song.duration_seconds ? formatTime(song.duration_seconds) : "--:--"}
            </span>
            {user && (user.id === song.added_by || user.id === playlist.data!.owner_id) ? (
              <button
                onClick={() => void removeSong(song.id)}
                aria-label="Remove song"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        ))}
        {list.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">No songs in this playlist yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
