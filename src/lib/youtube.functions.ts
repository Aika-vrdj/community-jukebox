import { createServerFn } from "@tanstack/react-start";

import { parseIsoDuration, type SongMeta } from "./youtube";

/**
 * Fetches title / thumbnail / duration once, at add time.
 * The caller stores the result on the playlist_songs row (cached, never re-fetched).
 */
export const fetchVideoMeta = createServerFn({ method: "POST" })
  .inputValidator((input: { videoId: string }) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(input.videoId)) throw new Error("Invalid YouTube video id");
    return input;
  })
  .handler(async ({ data }): Promise<SongMeta> => {
    const apiKey = process.env["YOUTUBE_API_KEY"];
    const fallbackThumb = `https://i.ytimg.com/vi/${data.videoId}/mqdefault.jpg`;

    if (apiKey) {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${data.videoId}&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as {
          items?: Array<{
            snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> };
            contentDetails?: { duration?: string };
          }>;
        };
        const item = json.items?.[0];
        if (!item) throw new Error("Video not found, or it is private / unavailable.");
        const thumbs = item.snippet?.thumbnails ?? {};
        return {
          youtube_video_id: data.videoId,
          title: item.snippet?.title ?? "Untitled",
          thumbnail_url:
            thumbs["medium"]?.url ?? thumbs["default"]?.url ?? fallbackThumb,
          duration_seconds: parseIsoDuration(item.contentDetails?.duration ?? ""),
        };
      }
    }

    // Fallback when the Data API is unavailable: oEmbed gives title + thumbnail.
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${data.videoId}&format=json`,
    );
    if (!oembed.ok) throw new Error("Could not read that video's details.");
    const meta = (await oembed.json()) as { title?: string; thumbnail_url?: string };
    return {
      youtube_video_id: data.videoId,
      title: meta.title ?? "Untitled",
      thumbnail_url: meta.thumbnail_url ?? fallbackThumb,
      duration_seconds: 0,
    };
  });
