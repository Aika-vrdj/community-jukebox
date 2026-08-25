import { supabase } from "@/integrations/supabase/client";
import type { QueueSong } from "@/components/player/PlayerProvider";

export type Playlist = {
  id: string;
  name: string;
  owner_id: string;
  is_public: boolean;
  is_hidden: boolean;
  created_at: string;
};

export type Song = QueueSong & {
  playlist_id: string;
  added_by: string;
  added_at: string;
};

export async function fetchPlaylistSongs(playlistId: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from("playlist_songs")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("added_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Song[];
}

export type PlaylistWithMeta = Playlist & { votes: number; songs: number; voted: boolean };

export async function fetchPublicPlaylists(userId?: string): Promise<PlaylistWithMeta[]> {
  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("is_public", true)
    .eq("is_hidden", false);
  if (error) throw error;

  const ids = (playlists ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const [{ data: votes }, { data: songs }] = await Promise.all([
    supabase.from("playlist_votes").select("playlist_id, user_id").in("playlist_id", ids),
    supabase.from("playlist_songs").select("id, playlist_id").in("playlist_id", ids),
  ]);

  return (playlists ?? [])
    .map((p) => ({
      ...(p as Playlist),
      votes: (votes ?? []).filter((v) => v.playlist_id === p.id).length,
      songs: (songs ?? []).filter((s) => s.playlist_id === p.id).length,
      voted: Boolean(userId && (votes ?? []).some((v) => v.playlist_id === p.id && v.user_id === userId)),
    }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

export type RecentSong = Song & { playlist_name: string };

export async function fetchRecentSongs(limit = 12): Promise<RecentSong[]> {
  const { data, error } = await supabase
    .from("playlist_songs")
    .select("*, playlists!inner(name, is_public, is_hidden)")
    .eq("playlists.is_public", true)
    .eq("playlists.is_hidden", false)
    .order("added_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { playlists, ...song } = row as Song & { playlists: { name: string } };
    return { ...song, playlist_name: playlists?.name ?? "Playlist" };
  });
}

export async function toggleVote(playlistId: string, userId: string, voted: boolean) {
  if (voted) {
    const { error } = await supabase
      .from("playlist_votes")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("playlist_votes")
      .insert({ playlist_id: playlistId, user_id: userId });
    if (error) throw error;
  }
}
