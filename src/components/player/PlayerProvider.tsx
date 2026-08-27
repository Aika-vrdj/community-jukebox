import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PlayerBar } from "./PlayerBar";

export type QueueSong = {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  duration_seconds: number;
};

type PlayerContextValue = {
  queue: QueueSong[];
  index: number;
  current: QueueSong | null;
  playlistName: string | null;
  isPlaying: boolean;
  isReady: boolean;
  position: number;
  duration: number;
  volume: number;
  playQueue: (songs: QueueSong[], playlistName: string, startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

const YT_MOUNT_ID = "yt-audio-player-mount";

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (value: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: string | HTMLElement, opts: Record<string, unknown>) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [queue, setQueue] = useState<QueueSong[]>([]);
  const [index, setIndex] = useState(0);
  const [playlistName, setPlaylistName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);

  // Latest values for the imperative YouTube callbacks.
  const stateRef = useRef({ queue, index });
  stateRef.current = { queue, index };

  const goTo = useCallback((nextIndex: number) => {
    const { queue: q } = stateRef.current;
    if (q.length === 0) {
      setIsPlaying(false);
      return;
    }
    // Loop the queue: past the last song wraps to the first, before the first wraps to the last.
    if (nextIndex >= q.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = q.length - 1;
    setIndex(nextIndex);
    setPosition(0);
    const song = q[nextIndex];
    if (song && playerRef.current) {
      playerRef.current.loadVideoById(song.youtube_video_id);
      setIsPlaying(true);
    }
  }, []);

  const advance = useCallback(() => {
    goTo(stateRef.current.index + 1);
  }, [goTo]);

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || playerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(YT_MOUNT_ID, {
        height: "60",
        width: "60",
        playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0 },
        events: {
          onReady: () => {
            setIsReady(true);
            playerRef.current?.setVolume(80);
          },
          onStateChange: (event: { data: number }) => {
            const states = window.YT?.PlayerState;
            if (!states) return;
            if (event.data === states.ENDED) advance();
            else if (event.data === states.PLAYING) setIsPlaying(true);
            else if (event.data === states.PAUSED) setIsPlaying(false);
          },
          // Deleted / private / region-blocked video: skip instead of stalling.
          onError: () => advance(),
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [advance]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        setPosition(p.getCurrentTime() || 0);
        setDuration(p.getDuration() || 0);
      } catch {
        /* player not ready yet */
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const playQueue = useCallback(
    (songs: QueueSong[], name: string, startIndex = 0) => {
      setQueue(songs);
      setPlaylistName(name);
      stateRef.current = { queue: songs, index: startIndex };
      setIndex(startIndex);
      setPosition(0);
      const song = songs[startIndex];
      if (song && playerRef.current) {
        playerRef.current.loadVideoById(song.youtube_video_id);
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    },
    [],
  );

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setPosition(seconds);
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    playerRef.current?.setVolume(value);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      index,
      current: queue[index] ?? null,
      playlistName,
      isPlaying,
      isReady,
      position,
      duration,
      volume,
      playQueue,
      toggle,
      next: advance,
      previous: () => goTo(stateRef.current.index - 1),
      seek,
      setVolume,
    }),
    [
      queue,
      index,
      playlistName,
      isPlaying,
      isReady,
      position,
      duration,
      volume,
      playQueue,
      toggle,
      advance,
      goTo,
      seek,
      setVolume,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerBar mountId={YT_MOUNT_ID} />
    </PlayerContext.Provider>
  );
}
