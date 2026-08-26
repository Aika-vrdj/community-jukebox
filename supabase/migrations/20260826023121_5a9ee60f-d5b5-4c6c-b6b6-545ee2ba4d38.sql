DROP POLICY IF EXISTS votes_read ON public.playlist_votes;

CREATE POLICY votes_read_visible ON public.playlist_votes
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_votes.playlist_id
      AND (p.is_hidden = false OR p.owner_id = auth.uid())
  )
);