import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/youtube";

import { usePlayer } from "./PlayerProvider";

export function PlayerBar({ mountId }: { mountId: string }) {
  const {
    current,
    playlistName,
    isPlaying,
    position,
    duration,
    volume,
    toggle,
    next,
    previous,
    seek,
    setVolume,
  } = usePlayer();

  const total = duration || current?.duration_seconds || 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:gap-4 sm:px-6 sm:py-3">
        {/* The real YouTube IFrame player: shrunk to a 60x60 square, never hidden. */}
        <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-md bg-muted">
          <div id={mountId} className="h-[60px] w-[60px]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {current ? current.title : "Nothing queued"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {playlistName ? playlistName : "Pick a playlist to start listening"}
          </p>
          <div className="mt-1.5 hidden items-center gap-2 sm:flex">
            <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">
              {formatTime(position)}
            </span>
            <Slider
              value={[Math.min(position, total)]}
              max={total || 1}
              step={1}
              onValueChange={(v) => seek(v[0] ?? 0)}
              className="flex-1"
              aria-label="Seek"
            />
            <span className="w-10 font-mono text-[11px] text-muted-foreground">
              {formatTime(total)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={previous}
            aria-label="Previous track"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="rounded-full bg-primary p-2.5 text-primary-foreground transition-opacity hover:opacity-90"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={next}
            aria-label="Next track"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden w-28 items-center gap-2 md:flex">
          <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(v) => setVolume(v[0] ?? 0)}
            aria-label="Volume"
          />
        </div>
      </div>

      {/* Mobile scrubber */}
      <div className="flex items-center gap-2 px-3 pb-2 sm:hidden">
        <span className="w-9 text-right font-mono text-[10px] text-muted-foreground">
          {formatTime(position)}
        </span>
        <Slider
          value={[Math.min(position, total)]}
          max={total || 1}
          step={1}
          onValueChange={(v) => seek(v[0] ?? 0)}
          className="flex-1"
          aria-label="Seek"
        />
        <span className="w-9 font-mono text-[10px] text-muted-foreground">
          {formatTime(total)}
        </span>
      </div>
    </div>
  );
}
