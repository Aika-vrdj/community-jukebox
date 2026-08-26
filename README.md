# Community Jukebox

I'm building a community playlist web app. Here's the full spec.

## Existing infrastructure — DO NOT create new instances of these

- We already have a Supabase project connected to this Lovable project. Use the existing database — do not scaffold a new one from scratch, extend it.

- Discord OAuth is already configured via Supabase Auth. Use supabase.auth for all login/session handling — do not build custom auth.

## Core concept

A community site where users log in with Discord, create music playlists, and add songs to them via YouTube URLs. Songs play as audio only, back-to-back, in a persistent player bar — no video shown, no clicking "next" required.

## Data model (extend our existing Supabase schema with these tables if not present)

- `playlists`: id, name, owner_id (references auth.users), is_public (boolean), created_at

- `playlist_songs`: id, playlist_id, youtube_video_id (just the 11-char ID, not the full URL), title, thumbnail_url, duration_seconds, added_by (references auth.users), added_at

- `playlist_votes`: id, playlist_id, user_id, created_at — with a UNIQUE constraint on (playlist_id, user_id) so a user can only vote once per playlist

## Playlist rules

- A user can create multiple playlists (e.g. one techno, one trance) under their own account.

- Each playlist is either:

  - **Private**: only the owner can add songs to it.

  - **Public**: any logged-in user can add songs to it.

- Anyone (including logged-out visitors) can view and listen to a or private public playlist. Private playlists can be hidden by the owner so that only they can see them.

- When a user submits a YouTube URL to a playlist, extract the video ID and fetch title/thumbnail/duration via the YouTube Data API, then store it — don't re-fetch this on every page load, cache it in the row.

## Home page

- Two sections: "Recently Added Songs" (latest entries across all public playlists, newest first, live-updating via Supabase Realtime) and "Most Voted Playlists" (public playlists ranked by vote count).

- Each playlist card shows a vote button (one vote per user per playlist, toggleable).

## The player bar — READ THIS CAREFULLY, this is the most important architectural constraint

- A horizontal player bar fixed to the bottom of the screen, present on every page.

- It must be mounted ONCE at the root of the app (outside the page router/route outlet), so navigating between pages never unmounts or remounts it. If the player component lives inside a page layout instead of the true app root, playback will restart/break every time the user navigates. This is a hard requirement, not a style preference.

- Playback engine: use the real YouTube IFrame Player API (not a raw <iframe> embed, not scraped audio). Instantiate one persistent player instance, visually shrink it to a small square inside the bar (e.g. 60x60px) via CSS so it reads as an audio player, not a video player — do not use display:none, YouTube's terms require the player element to remain actually present in the DOM and visible, not fully hidden.

- Autoplay through the queue: listen for the player's onStateChange event. When state is ENDED, automatically load and play the next song_id in the current queue. No manual "next" click required.

- Error handling: listen for onError (deleted/private/region-blocked videos) and automatically skip to the next track in the queue when a video fails, so one bad link doesn't stall playback.

- Bar contents: small thumbnail, song title, play/pause, skip, a scrub/progress bar, volume, and the name of the playlist currently queued.

- Clicking "play" on any playlist loads all its songs into the queue in add order and starts playback from the first (or clicked) song.

## Design

- Dark mode only, minimalistic — no heavy gradients, no clutter. Plenty of whitespace, clear typography hierarchy, small set of accent colors used sparingly.

- Mobile-responsive, since the player bar especially needs to work on small screens.

## What NOT to do

- Don't build a second auth system — use the existing Supabase Discord auth.

- Don't create a new Supabase project — connect to the existing one.

- Don't try to extract/download raw audio from YouTube server-side — use the official IFrame Player API only, for ToS compliance.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d2db5d72-9a2d-4dfd-b2db-4e95b824f328).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
