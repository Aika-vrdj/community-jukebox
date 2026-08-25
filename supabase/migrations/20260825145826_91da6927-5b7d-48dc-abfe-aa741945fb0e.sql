CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playlists_owner_idx ON public.playlists(owner_id);
GRANT SELECT ON public.playlists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT ALL ON public.playlists TO service_role;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "playlists_visible_read" ON public.playlists FOR SELECT USING (is_hidden = false);
CREATE POLICY "playlists_owner_read" ON public.playlists FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "playlists_owner_insert" ON public.playlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "playlists_owner_update" ON public.playlists FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "playlists_owner_delete" ON public.playlists FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  title text NOT NULL,
  thumbnail_url text,
  duration_seconds integer NOT NULL DEFAULT 0,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playlist_songs_playlist_idx ON public.playlist_songs(playlist_id, added_at);
CREATE INDEX playlist_songs_added_at_idx ON public.playlist_songs(added_at DESC);
GRANT SELECT ON public.playlist_songs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_songs TO authenticated;
GRANT ALL ON public.playlist_songs TO service_role;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs_read_visible" ON public.playlist_songs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.is_hidden = false)
);
CREATE POLICY "songs_read_owner" ON public.playlist_songs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = auth.uid())
);
CREATE POLICY "songs_insert" ON public.playlist_songs FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = added_by AND EXISTS (
    SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND (p.is_public = true OR p.owner_id = auth.uid())
  )
);
CREATE POLICY "songs_delete" ON public.playlist_songs FOR DELETE TO authenticated USING (
  auth.uid() = added_by OR EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = auth.uid())
);

CREATE TABLE public.playlist_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, user_id)
);
GRANT SELECT ON public.playlist_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.playlist_votes TO authenticated;
GRANT ALL ON public.playlist_votes TO service_role;
ALTER TABLE public.playlist_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_read" ON public.playlist_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_own" ON public.playlist_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete_own" ON public.playlist_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_songs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_votes;