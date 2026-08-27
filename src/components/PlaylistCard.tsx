import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Play } from "lucide-react";
import { toast } from "sonner";

import { usePlayer } from "@/components/player/PlayerProvider";
import { useAuth } from "@/hooks/useAuth";
import { fetchPlaylistSongs, toggleVote, type PlaylistWithMeta } from "@/lib/playlists";

export function PlaylistCard({ playlist }: { playlist: PlaylistWithMeta }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playQueue } = usePlayer();

  async function onVote() {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    try {
      await toggleVote(playlist.id, user.id, playlist.voted);
      void queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
    } catch {
      toast.error("Could not register your vote.");
    }
  }

  async function onPlay() {
    const songs = await fetchPlaylistSongs(playlist.id);
    if (songs.length === 0) {
      toast.message("This playlist is empty.");
      return;
    }
    playQueue(songs, playlist.name, 0);
  }

  return (
    <article className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/40">
      <div className="flex items-start justify-between gap-3">
        <Link
          to="/playlist/$playlistId"
          params={{ playlistId: playlist.id }}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
            {playlist.cover_image_url ? (
              <img src={playlist.cover_image_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-foreground">{playlist.name}</h3>
            {playlist.owner_name ? (
              <p className="truncate text-xs text-muted-foreground">
                by @{playlist.owner_name}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {playlist.songs} {playlist.songs === 1 ? "song" : "songs"}
              {playlist.is_public ? " · open to everyone" : " · private"}
            </p>
          </div>
        </Link>
        <button
          onClick={() => void onVote()}
          aria-label={playlist.voted ? "Remove vote" : "Vote for this playlist"}
          className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
            playlist.voted
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${playlist.voted ? "fill-current" : ""}`} />
          {playlist.votes}
        </button>
      </div>
      <button
        onClick={() => void onPlay()}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
      >
        <Play className="h-3.5 w-3.5" /> Play
      </button>
    </article>
  );
}
