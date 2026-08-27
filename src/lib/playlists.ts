import { supabase } from "@/integrations/supabase/client";
import type { QueueSong } from "@/components/player/PlayerProvider";

export type Playlist = {
  id: string;
  name: string;
  owner_id: string;
  is_public: boolean;
  is_hidden: boolean;
  cover_image_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function fetchProfiles(userIds: string[]): Promise<Record<string, Profile>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", Array.from(new Set(userIds)));
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((p) => [p.id, p as Profile]));
}

const COVER_BUCKET = "playlist-covers";

export async function uploadPlaylistCover(playlistId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${playlistId}/cover.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  // Cache-bust so the new cover shows immediately even though the path is unchanged.
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("playlists")
    .update({ cover_image_url: publicUrl })
    .eq("id", playlistId);
  if (updateError) throw updateError;

  return publicUrl;
}

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

export type PlaylistWithMeta = Playlist & {
  votes: number;
  songs: number;
  voted: boolean;
  owner_name: string | null;
};

export async function fetchPublicPlaylists(userId?: string): Promise<PlaylistWithMeta[]> {
  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("is_public", true)
    .eq("is_hidden", false);
  if (error) throw error;

  const ids = (playlists ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const [{ data: votes }, { data: songs }, profiles] = await Promise.all([
    supabase.from("playlist_votes").select("playlist_id, user_id").in("playlist_id", ids),
    supabase.from("playlist_songs").select("id, playlist_id").in("playlist_id", ids),
    fetchProfiles((playlists ?? []).map((p) => p.owner_id)),
  ]);

  return (playlists ?? [])
    .map((p) => ({
      ...(p as Playlist),
      votes: (votes ?? []).filter((v) => v.playlist_id === p.id).length,
      songs: (songs ?? []).filter((s) => s.playlist_id === p.id).length,
      voted: Boolean(userId && (votes ?? []).some((v) => v.playlist_id === p.id && v.user_id === userId)),
      owner_name: profiles[p.owner_id]?.display_name ?? null,
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
